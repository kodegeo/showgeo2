import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes, randomUUID } from "crypto";
import { PrismaService, asPrismaDb } from "../../prisma/prisma.service";
import { CreateAccessPassDto } from "./dto/create-access-pass.dto";
import type { InviteToEventDto } from "./dto/invite-to-event.dto";
import { EventTicketLifecycleService } from "./event-ticket-lifecycle.service";
import { MessagesService } from "../messages/messages.service";
import { EmailService } from "../email/email.service";

export interface RegisterForEventResult {
  accessPassId: string | null;
  ticketTypeId: string;
  eventId: string;
  ticketId: string;
}

export interface InviteFollowersRequest {
  eventId: string;
  creatorUserId: string;
  ticketTypeId: string;
  followerIds?: string[];
  emails?: string[];
}

/** CRUD for `access_passes` (Supabase-aligned). No invitation/distribution flows yet. */
@Injectable()
export class AccessPassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventTicketLifecycle: EventTicketLifecycleService,
    private readonly messagesService: MessagesService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private get ext() {
    return asPrismaDb(this.prisma);
  }

  private async ensureEventCreator(
    eventId: string,
    userId: string,
  ): Promise<void> {
    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      include: { entity: true },
    });
    if (!event) throw new NotFoundException("Event not found");
    const entity = event.entity;
    if (!entity || entity.ownerId !== userId) {
      throw new ForbiddenException(
        "Only the event creator can create access passes",
      );
    }
  }

  async createAccessPass(data: CreateAccessPassDto, creatorUserId: string) {
    await this.ensureEventCreator(data.eventId, creatorUserId);

    const ticketType = await this.ext.ticket_types.findFirst({
      where: {
        id: data.ticketTypeId,
        event_id: data.eventId,
      },
    });
    if (!ticketType) {
      throw new NotFoundException(
        "Ticket type not found for this event",
      );
    }

    return this.ext.access_passes.create({
      data: {
        event_id: data.eventId,
        ticket_type_id: data.ticketTypeId,
        user_id: data.userId ?? null,
        email: data.email ?? null,
        access_code: data.accessCode ?? null,
        source: data.source ?? null,
        status: data.status ?? "CREATED",
      },
    });
  }

  /**
   * Public / invite free registration: issues `tickets` + `access_passes` via
   * {@link EventTicketLifecycleService.registerFree}.
   */
  async registerPublicForEvent(
    eventId: string,
    userId: string,
    dto: {
      ticketTypeId: string;
      accessPassId?: string;
      accessCode?: string;
    },
  ): Promise<RegisterForEventResult> {
    const { ticket, accessPass } =
      await this.eventTicketLifecycle.registerFree(eventId, userId, dto);

    return {
      accessPassId: accessPass?.id ?? null,
      ticketTypeId: dto.ticketTypeId,
      eventId,
      ticketId: ticket.id,
    };
  }

  /**
   * Creator distribution: invite followers or email list; creates access_pass rows with status SENT.
   */
  async inviteToEvent(
    eventId: string,
    creatorUserId: string,
    dto: InviteToEventDto,
  ): Promise<{ created: number }> {
    await this.ensureEventCreator(eventId, creatorUserId);

    const ticketType = await this.ext.ticket_types.findFirst({
      where: { id: dto.ticketTypeId, event_id: eventId },
    });
    if (!ticketType) {
      throw new NotFoundException("Ticket type not found for this event");
    }

    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: { entityId: true, name: true },
    });
    if (!event) throw new NotFoundException("Event not found");

    // `registrationAccess` is not on the trimmed Prisma select; invite-only rules default off here.
    const isInviteOnly = false;

    const baseUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:5173";

    let created = 0;

    if (dto.type === "FOLLOWERS") {
      const followers = await this.prisma.follows.findMany({
        where: {
          targetId: event.entityId,
          targetType: "ENTITY",
        },
        select: { userId: true },
      });

      for (const f of followers) {
        const existingPassRow = await this.ext.access_passes.findFirst({
          where: { event_id: eventId, user_id: f.userId, ticket_type_id: dto.ticketTypeId },
        });
        const hadPassRow = !!existingPassRow;
        const hadCodeInitially = !!existingPassRow?.access_code;

        let accessCode: string | null = existingPassRow?.access_code ?? null;

        if (!existingPassRow) {
          accessCode = isInviteOnly ? randomBytes(16).toString("hex") : null;
          await this.ext.access_passes.create({
            data: {
              event_id: eventId,
              ticket_type_id: dto.ticketTypeId,
              user_id: f.userId,
              access_code: accessCode,
              source: "FOLLOWERS",
              status: "SENT",
            },
          });
          created++;
        } else if (isInviteOnly && !accessCode) {
          accessCode = randomBytes(16).toString("hex");
          await this.ext.access_passes.update({
            where: { id: existingPassRow.id },
            data: { access_code: accessCode },
          });
        }

        const existingReg = await this.ext.event_registrations.findFirst({
          where: { eventId, userId: f.userId },
        });
        if (!existingReg) {
          await this.ext.event_registrations.create({
            data: {
              id: randomUUID(),
              eventId,
              userId: f.userId,
              email: null,
              accessCode,
              status: "INVITED",
            },
          });
        } else if (accessCode) {
          if (existingReg.status !== "REGISTERED") {
            await this.ext.event_registrations.update({
              where: { id: existingReg.id },
              data: { accessCode, status: "INVITED" },
            });
          } else if (existingReg.accessCode !== accessCode) {
            await this.ext.event_registrations.update({
              where: { id: existingReg.id },
              data: { accessCode },
            });
          }
        }

        const link = accessCode
          ? `${baseUrl}/events/${eventId}?code=${encodeURIComponent(accessCode)}`
          : `${baseUrl}/events/${eventId}`;
        const inviteText = isInviteOnly
          ? `You're invited to "${event.name}" (${ticketType.name}). Register using this link (includes your access code): ${link}`
          : `You're invited to "${event.name}" (${ticketType.name}). Register here: ${link}`;

        const shouldNotify =
          !hadPassRow || (Boolean(isInviteOnly && hadPassRow && !hadCodeInitially && accessCode));

        if (shouldNotify) {
          try {
            await this.messagesService.sendMessage({
              senderId: creatorUserId,
              recipientId: f.userId,
              content: inviteText,
            });
          } catch (e) {
            console.warn("[AccessPassesService] sendMessage failed for follower invite", e);
          }
        }
      }
    } else {
      const rawEmails = dto.emails ?? [];
      const emails = Array.from(
        new Set(
          rawEmails.map((e) => e.trim().toLowerCase()).filter((e) => e.length > 0),
        ),
      );
      if (emails.length === 0) {
        throw new BadRequestException(
          "emails is required and must contain at least one address when type is EMAIL",
        );
      }

      const emailList = Array.from(
        new Set((emails ?? []).map(e => e.trim().toLowerCase()).filter(Boolean))
      );
      
      for (const email of emailList) {
        const existingPassRow = await this.ext.access_passes.findFirst({
          where: {
            event_id: eventId,
            email,
            ticket_type_id: dto.ticketTypeId,
          },
        });
        const hadPassRow = !!existingPassRow;
        const hadCodeInitially = !!existingPassRow?.access_code;

        let accessCode: string | null = existingPassRow?.access_code ?? null;

        if (!existingPassRow) {
          accessCode = isInviteOnly ? randomBytes(16).toString("hex") : null;
          await this.ext.access_passes.create({
            data: {
              event_id: eventId,
              ticket_type_id: dto.ticketTypeId,
              email,
              access_code: accessCode,
              source: "EMAIL",
              status: "SENT",
            },
          });
          created++;
        } else if (isInviteOnly && !accessCode) {
          accessCode = randomBytes(16).toString("hex");
          await this.ext.access_passes.update({
            where: { id: existingPassRow.id },
            data: { access_code: accessCode },
          });
        }

        const erEmail = await this.ext.event_registrations.findFirst({
          where: { eventId, email },
        });
        if (!erEmail) {
          await this.ext.event_registrations.create({
            data: {
              id: randomUUID(),
              eventId,
              userId: null,
              email,
              accessCode,
              status: "INVITED",
            },
          });
        } else if (accessCode) {
          if (erEmail.status !== "REGISTERED") {
            await this.ext.event_registrations.update({
              where: { id: erEmail.id },
              data: {
                accessCode,
                status: "INVITED",
              },
            });
          } else if (erEmail.accessCode !== accessCode) {
            await this.ext.event_registrations.update({
              where: { id: erEmail.id },
              data: { accessCode },
            });
          }
        }

        const link = accessCode
          ? `${baseUrl}/events/${eventId}?code=${encodeURIComponent(accessCode)}`
          : `${baseUrl}/events/${eventId}`;
        const textBody = isInviteOnly
          ? `You're invited to ${event.name} (${ticketType.name}). Your access code: ${accessCode}\n\nOpen: ${link}`
          : `You're invited to ${event.name} (${ticketType.name}). Register here: ${link}`;
        const appUser = await this.prisma.app_users.findUnique({
          where: { email },
        });

        const shouldNotify =
          !hadPassRow || (Boolean(isInviteOnly && hadPassRow && !hadCodeInitially && accessCode));

        if (shouldNotify) {
          if (appUser) {
            try {
              await this.messagesService.sendMessage({
                senderId: creatorUserId,
                recipientId: appUser.id,
                content: textBody,
              });
            } catch (e) {
              console.warn("[AccessPassesService] sendMessage failed for email invite", e);
            }
          } else {
            await this.emailService.sendEmail({
              to: email,
              subject: `Invitation: ${event.name}`,
              text: textBody,
            });
          }
        }
      }
    }

    return { created };
  }

  async InviteFollowers(
    request: InviteFollowersRequest,
  ): Promise<{ created: number }> {
    const { eventId, creatorUserId, ticketTypeId, followerIds, emails } = request;
    await this.ensureEventCreator(eventId, creatorUserId);

    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, entityId: true },
    });
    if (!event) throw new NotFoundException("Event not found");

    const ticketType = await this.ext.ticket_types.findFirst({
      where: { id: ticketTypeId, event_id: eventId },
    });
    if (!ticketType) throw new NotFoundException("Ticket type not found for this event");

    const baseUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:5173";
    let created = 0;

    let recipientUserIds: string[];
    if (followerIds && followerIds.length > 0) {
      recipientUserIds = Array.from(new Set(followerIds));
    } else {
      const follows = await this.prisma.follows.findMany({
        where: { targetId: event.entityId, targetType: "ENTITY" },
        select: { userId: true },
      });
      recipientUserIds = Array.from(new Set(follows.map((f) => f.userId).filter(Boolean)));
    }

    for (const userId of recipientUserIds) {
      let existingPass = await this.ext.access_passes.findFirst({
        where: { event_id: eventId, user_id: userId, ticket_type_id: ticketTypeId },
      });

      let accessCode: string;
      let shouldNotify = false;

      if (existingPass?.access_code) {
        accessCode = existingPass.access_code;
      } else if (existingPass) {
        accessCode = randomBytes(16).toString("hex");
        await this.ext.access_passes.update({
          where: { id: existingPass.id },
          data: { access_code: accessCode },
        });
        shouldNotify = true;
      } else {
        accessCode = randomBytes(16).toString("hex");
        await this.ext.access_passes.create({
          data: {
            event_id: eventId,
            ticket_type_id: ticketTypeId,
            user_id: userId,
            access_code: accessCode,
            source: "FOLLOWERS",
            status: "SENT",
          },
        });
        created++;
        shouldNotify = true;
      }

      const existingReg = await this.ext.event_registrations.findFirst({
        where: { eventId, userId },
      });
      if (!existingReg) {
        await this.ext.event_registrations.create({
          data: { id: randomUUID(), eventId, userId, email: null, accessCode, status: "INVITED" },
        });
      } else if (existingReg.accessCode !== accessCode) {
        await this.ext.event_registrations.update({
          where: { id: existingReg.id },
          data: {
            accessCode,
            ...(existingReg.status !== "REGISTERED" ? { status: "INVITED" as const } : {}),
          },
        });
      } else if (existingReg.status !== "REGISTERED" && existingReg.status !== "INVITED") {
        await this.ext.event_registrations.update({
          where: { id: existingReg.id },
          data: { status: "INVITED" },
        });
      }

      const ctaUrl = `${baseUrl}/events/${eventId}?code=${encodeURIComponent(accessCode)}`;

      if (shouldNotify) {
        try {
          await this.messagesService.sendMessage({
            senderId: creatorUserId,
            recipientId: userId,
            content: `You've been invited to ${event.name}. Register here: ${ctaUrl}`,
          });
        } catch (e) {
          console.warn("[AccessPassesService] sendMessage failed for follower", userId, e);
        }
      }
    }

    const emailList = Array.from(
      new Set((emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean)),
    );

    for (const email of emailList) {
      let existingPass = await this.ext.access_passes.findFirst({
        where: { event_id: eventId, email, ticket_type_id: ticketTypeId },
      });

      let accessCode: string;
      let shouldNotify = false;

      if (existingPass?.access_code) {
        accessCode = existingPass.access_code;
      } else if (existingPass) {
        accessCode = randomBytes(16).toString("hex");
        await this.ext.access_passes.update({
          where: { id: existingPass.id },
          data: { access_code: accessCode },
        });
        shouldNotify = true;
      } else {
        accessCode = randomBytes(16).toString("hex");
        await this.ext.access_passes.create({
          data: {
            event_id: eventId,
            ticket_type_id: ticketTypeId,
            email,
            access_code: accessCode,
            source: "EMAIL",
            status: "SENT",
          },
        });
        created++;
        shouldNotify = true;
      }

      const existingReg = await this.ext.event_registrations.findFirst({
        where: { eventId, email },
      });
      if (!existingReg) {
        await this.ext.event_registrations.create({
          data: { id: randomUUID(), eventId, userId: null, email, accessCode, status: "INVITED" },
        });
      } else if (existingReg.accessCode !== accessCode) {
        await this.ext.event_registrations.update({
          where: { id: existingReg.id },
          data: {
            accessCode,
            ...(existingReg.status !== "REGISTERED" ? { status: "INVITED" as const } : {}),
          },
        });
      } else if (existingReg.status !== "REGISTERED" && existingReg.status !== "INVITED") {
        await this.ext.event_registrations.update({
          where: { id: existingReg.id },
          data: { status: "INVITED" },
        });
      }

      const ctaUrl = `${baseUrl}/events/${eventId}?code=${encodeURIComponent(accessCode)}`;

      if (shouldNotify) {
        try {
          await this.emailService.sendEmail({
            to: email,
            subject: `Invitation: ${event.name}`,
            text: `You're invited to ${event.name}. Register here: ${ctaUrl}`,
          });
        } catch (e) {
          console.warn("[AccessPassesService] Email send failed for invite", email, e);
        }
      }
    }

    return { created };
  }

  async getAccessPassByCode(code: string) {
    const row = await this.ext.access_passes.findFirst({
      where: { access_code: code },
      include: {
        ticket_types: true,
      },
    });
    if (!row) {
      throw new NotFoundException("Access pass not found");
    }
    const ev = await this.prisma.events.findUnique({
      where: { id: row.event_id },
      select: {
        id: true,
        name: true,
        startTime: true,
        thumbnail: true,
      },
    });
    return { ...row, events: ev };
  }

  async redeemAccess(
    eventId: string,
    userId: string,
    dto: { ticketTypeId: string; accessCode?: string; accessPassId?: string },
  ): Promise<{ success: true; ticket: Record<string, unknown>; accessPassId: string | null }> {
    const { ticket, accessPass } = await this.eventTicketLifecycle.registerFree(
      eventId,
      userId,
      dto,
    );
    return {
      success: true,
      ticket: ticket as Record<string, unknown>,
      accessPassId: accessPass?.id ?? null,
    };
  }

  async claimInvite(
    eventId: string,
    userId: string,
    accessCode: string,
  ): Promise<{ success: true }> {
    const code = accessCode.trim();
    const pass = await this.ext.access_passes.findFirst({
      where: { event_id: eventId, access_code: code },
    });
    if (!pass) {
      throw new NotFoundException("Invitation not found");
    }
    if (pass.status === "CONVERTED" || pass.used_at != null) {
      throw new BadRequestException("Invitation already used");
    }
    if (pass.user_id && pass.user_id !== userId) {
      throw new ForbiddenException("This invite is for another account.");
    }
    const appUser = await this.prisma.app_users.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const passEmail = pass.email?.trim().toLowerCase() ?? null;
    if (passEmail) {
      const userEmail = appUser?.email?.trim().toLowerCase() ?? null;
      if (userEmail !== passEmail) {
        throw new ForbiddenException("This invite is for another email address.");
      }
    }
    const regEmail =
      pass.email != null && String(pass.email).trim() !== ""
        ? String(pass.email).trim()
        : appUser?.email ?? null;

    let reg = await this.ext.event_registrations.findFirst({
      where: { eventId, accessCode: code },
    });
    if (!reg) {
      reg = await this.ext.event_registrations.findFirst({
        where: {
          eventId,
          OR: [
            { userId },
            ...(pass.user_id ? [{ userId: pass.user_id }] : []),
            ...(pass.email ? [{ email: pass.email }] : []),
          ],
        },
      });
    }

    if (reg) {
      if (reg.status === "REGISTERED") {
        throw new BadRequestException("Invitation already used");
      }
      if (
        reg.userId &&
        reg.userId !== userId &&
        pass.user_id &&
        reg.userId !== pass.user_id
      ) {
        throw new ForbiddenException("This invite is for another account.");
      }
      await this.ext.event_registrations.update({
        where: { id: reg.id },
        data: {
          status: "REGISTERED",
          userId,
          email: regEmail ?? reg.email,
          accessCode: code,
        },
      });
    } else {
      reg = await this.ext.event_registrations.create({
        data: {
          id: randomUUID(),
          eventId,
          userId,
          email: regEmail,
          accessCode: code,
          status: "REGISTERED",
        },
      });
    }

    if (!pass.user_id) {
      await this.ext.access_passes.update({
        where: { id: pass.id },
        data: { user_id: userId, status: "CLAIMED" },
      });
    }

    let ticketTypeId: string;
    if (pass.ticket_type_id) {
      ticketTypeId = pass.ticket_type_id;
    } else {
      const tt = await this.ext.ticket_types.findFirst({
        where: { event_id: eventId },
      });
      if (!tt) throw new NotFoundException("No ticket type found for this event");
      ticketTypeId = tt.id;
    }

    await this.eventTicketLifecycle.issueTicketFromTicketType(eventId, ticketTypeId, userId, {
      source: "INVITE",
      accessPassId: pass.id,
    });

    const event = await this.prisma.events.findUnique({
      where: { id: eventId },
      select: { name: true, startTime: true, entity: { select: { ownerId: true } } },
    });

    if (event) {
      const senderId = event.entity?.ownerId ?? userId;
      try {
        await this.messagesService.sendTicketConfirmedMessage({
          recipientId: userId,
          senderId,
          eventId,
          eventTitle: event.name,
          startTime: event.startTime,
          registrationId: reg.id,
        });
      } catch (e) {
        console.warn("[AccessPassesService] sendTicketConfirmedMessage failed (non-blocking)", e);
      }
    }

    return { success: true };
  }
}
