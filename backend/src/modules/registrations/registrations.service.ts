import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { SendInvitationsDto, RegisterDto, ValidateTicketDto } from "./dto";
import { EmailService } from "../email/email.service";
import { MessagesService } from "../messages/messages.service";
import { EventAccessRulesService } from "./event-access-rules.service";
import { randomUUID } from "crypto";

/**
 * Event reminder types for LIVE notifications (Phase 2B)
 */
export enum EventReminderType {
  LIVE_10_MIN = "LIVE_10_MIN",
  LIVE_30_MIN = "LIVE_30_MIN",
}

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly accessRulesService: EventAccessRulesService,
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * Convenience accessor to treat PrismaService as any
   * so we can use snake_case models without TypeScript errors.
   */
  private get p(): any {
    return this.prisma as any;
  }

  /**
   * Generate a unique access code for guest users
   */
  private generateAccessCode(): string {
    // Generate 8-character alphanumeric code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Ensure access code is unique
   */
  private async ensureUniqueAccessCode(): Promise<string> {
    let code = this.generateAccessCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const [existingReg, existingPass] = await Promise.all([
        this.p.event_registrations.findFirst({
          where: { accessCode: code },
        }),
        this.p.access_passes.findFirst({
          where: { access_code: code },
        }),
      ]);

      if (!existingReg && !existingPass) {
        return code;
      }

      code = this.generateAccessCode();
      attempts++;
    }

    // Fallback to UUID-based code if random generation fails
    return `GUEST-${randomUUID().substring(0, 8).toUpperCase()}`;
  }

  // ---------------------------------------------------------------------------
  // 1. EVENT INVITATIONS
  // ---------------------------------------------------------------------------

  /**
   * Send invitations to a guest list (or audience FOLLOWERS).
   * Creates EventRegistration records with status = INVITED
   * Generates accessCode for guest users (emails without userId)
   */
  async sendInvitations(
    eventId: string,
    dto: SendInvitationsDto,
    invitedBy: string,
  ): Promise<{ created: number; skipped: number }> {
    await this.ensureEventCreator(eventId, invitedBy);

    const event = await this.p.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const ticketTypeId =
      dto.ticketTypeId ??
      (
        await this.p.ticket_types.findFirst({
          where: { event_id: eventId },
          orderBy: { created_at: "asc" },
          select: { id: true },
        })
      )?.id;
    if (!ticketTypeId) {
      throw new BadRequestException(
        "Event has no ticket types. Add a ticket type or pass ticketTypeId before sending invitations.",
      );
    }
    const ticketType = await this.p.ticket_types.findFirst({
      where: { id: ticketTypeId, event_id: eventId },
      select: { id: true },
    });
    if (!ticketType) {
      throw new BadRequestException("ticketTypeId is not valid for this event");
    }

    let invitees: Array<{ userId?: string; email?: string }> = [];

    if (dto.audience === "FOLLOWERS") {
      const entityId = (event as any).entityId;
      if (!entityId) {
        throw new BadRequestException("Event has no entity; cannot invite followers.");
      }
      const follows = await this.p.follows.findMany({
        where: {
          targetId: entityId,
          targetType: "ENTITY",
        },
      });
      invitees = follows.map((f: any) => ({ userId: f.userId }));
    } else if (dto.audience === "EMAIL_LIST") {
      const emails = dto.emails?.map((e) => e.trim()).filter(Boolean) ?? [];
      if (emails.length === 0) {
        throw new BadRequestException("emails is required when audience is EMAIL_LIST");
      }
      invitees = emails.map((email) => ({ email }));
    } else {
      invitees = dto.invitees ?? [];
    }

    let created = 0;
    let skipped = 0;

    for (const invitee of invitees) {
      // Must have either userId or email
      if (!invitee.userId && !invitee.email) {
        skipped++;
        continue;
      }

      // Check if registration already exists
      const existing = await this.p.event_registrations.findFirst({
        where: {
          eventId,
          OR: [
            invitee.userId ? { userId: invitee.userId } : {},
            invitee.email ? { email: invitee.email } : {},
          ],
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const emailNorm = invitee.email?.trim().toLowerCase() || null;
      const passWhere: Record<string, unknown> = {
        event_id: eventId,
        ticket_type_id: ticketTypeId,
      };
      if (invitee.userId) {
        passWhere.user_id = invitee.userId;
      } else if (emailNorm) {
        passWhere.email = emailNorm;
      }

      let accessPass = await this.p.access_passes.findFirst({
        where: passWhere,
      });

      let access_code: string;
      if (accessPass?.access_code) {
        access_code = accessPass.access_code;
      } else if (accessPass) {
        access_code = await this.ensureUniqueAccessCode();
        await this.p.access_passes.update({
          where: { id: accessPass.id },
          data: { access_code: access_code, status: "SENT" },
        });
      } else {
        access_code = await this.ensureUniqueAccessCode();
        const passSource =
          dto.audience === "FOLLOWERS"
            ? "FOLLOWERS"
            : emailNorm
              ? "EMAIL"
              : "INVITATION";
        await this.p.access_passes.create({
          data: {
            event_id: eventId,
            ticket_type_id: ticketTypeId,
            user_id: invitee.userId || null,
            email: emailNorm,
            access_code: access_code,
            source: passSource,
            status: "SENT",
          },
        });
      }

      // Create registration (event_invitations concept stored in event_registrations)
      const registration = await this.p.event_registrations.create({
        data: {
          id: randomUUID(),
          eventId,
          userId: invitee.userId || null,
          email: invitee.email?.trim() || null,
          accessCode: access_code,
          status: "INVITED",
        },
      });

      const inviteRecord = await this.p.invites.create({
        data: {
          inviterUserId: invitedBy,
          email: invitee.email || `user-${invitee.userId}`,
          targetType: "EVENT",
          targetId: eventId,
          status: "PENDING",
        },
      });

      const inviteBodyBase =
        dto.message || `You've been invited to attend ${event.name}. Click to register.`;
      const inviteLink = `/events/${eventId}?code=${access_code}`;
      const inviteBody = `${inviteBodyBase}

Event ID: ${eventId}
Access Code: ${access_code}
Join: ${inviteLink}`;
      let messageAttempted = false;

      if (invitee.userId) {
        try {
          const sentMessage = await this.messagesService.sendMessage({
            senderId: invitedBy,
            recipientId: invitee.userId,
            content: inviteBody,
          });
          messageAttempted = true;

          await this.p.invites.update({
            where: { id: inviteRecord.id },
            data: { status: "SENT" },
          });

          await this.addToMailbox({
            userId: invitedBy,
            email: null,
            type: "INVITATION",
            title: `Invitation sent: ${event.name}`,
            message: `Sent invitation to user ${invitee.userId}.`,
            metadata: {
              direction: "SENT",
              eventId,
              eventName: event.name,
              registrationId: registration.id,
              inviteId: inviteRecord.id,
              recipientUserId: invitee.userId,
              messageId: sentMessage.id,
              accessCode: access_code,
              inviteLink,
            },
            registrationId: registration.id,
          });
        } catch (e) {
          this.logger.warn("sendMessage failed for invitation", e as Error);

          await this.p.invites.update({
            where: { id: inviteRecord.id },
            data: { status: "FAILED" },
          });
          throw new InternalServerErrorException(
            "Invitation message dispatch failed for invited user.",
          );
        }
      } else if (invitee.email) {
        await this.addToMailbox({
          userId: null,
          email: invitee.email,
          type: "INVITATION",
          title: `You're invited to ${event.name}`,
          message: inviteBody,
          metadata: {
            eventId,
            eventName: event.name,
            registrationId: registration.id,
          },
        });
        messageAttempted = true;

        await this.p.invites.update({
          where: { id: inviteRecord.id },
          data: { status: "SENT" },
        });

        await this.addToMailbox({
          userId: invitedBy,
          email: null,
          type: "INVITATION",
          title: `Invitation sent: ${event.name}`,
          message: `Sent invitation to ${invitee.email}.`,
          metadata: {
            direction: "SENT",
            eventId,
            eventName: event.name,
            registrationId: registration.id,
            inviteId: inviteRecord.id,
            recipientEmail: invitee.email,
            accessCode: access_code,
            inviteLink,
          },
          registrationId: registration.id,
        });
      }

      if (!registration.accessCode) {
        throw new InternalServerErrorException(
          "Invitation contract violation: registration missing accessCode.",
        );
      }

      if (!inviteRecord?.id) {
        throw new InternalServerErrorException(
          "Invitation contract violation: invite record missing.",
        );
      }

      if (!messageAttempted) {
        throw new InternalServerErrorException(
          "Invitation contract violation: invite exists but no message attempt was recorded.",
        );
      }

      created++;
    }

    return { created, skipped };
  }

  /**
   * Ensure the user is the event's entity owner (creator). Throws if not.
   */
  private async ensureEventCreator(eventId: string, userId: string): Promise<void> {
    const event = await this.p.events.findUnique({
      where: { id: eventId },
      include: { entity: true },
    });
    if (!event) throw new NotFoundException("Event not found");
    const entity = (event as any).entity;
    if (!entity || entity.ownerId !== userId) {
      throw new ForbiddenException("Only the event creator can manage invitations");
    }
  }

  /**
   * List invitations (event_registrations) for an event. Creator only.
   * Schema: id, event_id, user_id, email, access_code, status, created_at.
   */
  async listInvitations(eventId: string, userId: string): Promise<{
    invitations: Array<{
      id: string;
      userId: string | null;
      email: string | null;
      status: string;
      createdAt: string;
      accessCode: string | null;
      displayName: string | null;
    }>;
  }> {
    await this.ensureEventCreator(eventId, userId);
    const rows = await this.p.event_registrations.findMany({
      where: { eventId, status: "INVITED" },
      orderBy: { createdAt: "desc" },
    });

    const invitations = rows.map((r: any) => ({
      id: r.id,
      userId: r.userId ?? null,
      email: r.email ?? null,
      status: r.status ?? "INVITED",
      createdAt: r.createdAt?.toISOString?.() ?? new Date().toISOString(),
      accessCode: r.accessCode ?? null,
      displayName: r.email ?? r.userId ?? "—",
    }));
    return { invitations };
  }

  /**
   * Search users for inviting (creator only). Excludes users already invited to this event.
   */
  async searchUsersToInvite(
    eventId: string,
    userId: string,
    q: string,
  ): Promise<{ users: Array<{ id: string; username: string | null; email: string | null; displayName: string }> }> {
    await this.ensureEventCreator(eventId, userId);
    const existing = await this.p.event_registrations.findMany({
      where: { eventId, userId: { not: null } },
      select: { userId: true },
    });
    const excludedIds = existing.map((r: any) => r.userId).filter(Boolean);
    if (!q || q.trim().length < 2) {
      return { users: [] };
    }
    const search = q.trim();
    const where: any = {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { user_profiles: { username: { contains: search, mode: "insensitive" } } },
        { user_profiles: { firstName: { contains: search, mode: "insensitive" } } },
        { user_profiles: { lastName: { contains: search, mode: "insensitive" } } },
      ],
    };
    if (excludedIds.length) where.id = { notIn: excludedIds };
    const raw = await this.p.app_users.findMany({
      where,
      take: 20,
      include: { user_profiles: true },
    });
    const users = raw.map((u: any) => {
      const p = u.user_profiles;
      const namePart = p?.username ?? ([p?.firstName, p?.lastName].filter(Boolean).join(" ") || null);
      const displayName = (namePart || u.email) ?? "User";
      return {
        id: u.id,
        username: p?.username ?? null,
        email: u.email ?? null,
        displayName,
      };
    });
    return { users };
  }

  /**
   * Get or create a single shareable access code for the event. Creator only.
   * Schema: no source column; placeholder row has user_id and email null.
   */
  async getOrCreateEventAccessCode(eventId: string, userId: string): Promise<{ accessCode: string }> {
    await this.ensureEventCreator(eventId, userId);
    let reg = await this.p.event_registrations.findFirst({
      where: {
        eventId,
        userId: null,
        email: null,
      },
    });
    if (!reg?.accessCode) {
      const access_code = await this.ensureUniqueAccessCode();
      await this.p.event_registrations.create({
        data: {
          id: randomUUID(),
          eventId,
          userId: null,
          email: null,
          accessCode: access_code,
          status: "INVITED",
        },
      });
      reg = { accessCode: access_code } as any;
    }
    return { accessCode: reg.accessCode };
  }

  // ---------------------------------------------------------------------------
  // 2. EVENT REGISTRATION
  // ---------------------------------------------------------------------------

  /**
   * Ensure a FREE ticket exists for a registration
   * Idempotent: returns existing ticket if found, creates new one if not
   * 
   * Rules:
   * - Ticket type: FREE
   * - Ticket status: ACTIVE
   * - One ticket per (eventId + registrationId)
   * - Works with userId, email, or both
   */
  private async ensureFreeTicket(params: {
    eventId: string;
    userId?: string | null;
    email?: string | null;
    registrationId: string;
  }): Promise<any> {
    // 1. Check for existing ticket by registrationId (idempotent check)
    const existingTicket = await this.p.tickets.findFirst({
      where: {
        registrationId: params.registrationId,
        eventId: params.eventId,
      },
    });

    if (existingTicket) {
      // Ticket already exists, return it
      return existingTicket;
    }

    // 2. Load event to check if entryCode is required
    const event = await this.p.events.findUnique({
      where: { id: params.eventId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // 3. Create new FREE ticket (always tied to registrationId — registration is source of truth)
    const ticket = await this.p.tickets.create({
      data: {
        id: randomUUID(),
        eventId: params.eventId,
        userId: params.userId || null,
        registrationId: params.registrationId,
        type: "FREE",
        price: 0,
        currency: "USD",
        status: "ACTIVE",
        updatedAt: new Date(),
        // Generate entryCode if event requires it
        entryCode: event.entryCodeRequired ? await this.ensureUniqueAccessCode() : null,
      },
    });

    return ticket;
  }

  /**
   * Register for an event. Uses unified event_access_rules (or legacy event flags).
   * Flow: fetch event → fetch access rule → validate rule → create/update event_registration.
   * Returns { success, registrationId } or throws 403/400/404.
   */
  async register(
    eventId: string,
    dto: RegisterDto,
    userId?: string,
  ): Promise<{ success: true; registrationId: string }> {
    const event = await this.p.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const rule =
      (await this.accessRulesService.getEffectiveRule(eventId)) ??
      this.accessRulesService.buildLegacyRule(event);

    const existingBefore = await this.findRegistrationCandidate(eventId, dto, userId);
    const wasRegisteredBefore = existingBefore?.status === "REGISTERED";
    const wasInvitedBefore = existingBefore?.status === "INVITED";

    const registration = await this.accessRulesService.validateAndResolveRegistration(
      eventId,
      rule,
      dto,
      userId,
      event,
    );

    if (dto.accessCode && wasInvitedBefore && registration.status !== "REGISTERED") {
      throw new InternalServerErrorException(
        "Registration contract violation: accessCode usage must transition INVITED to REGISTERED.",
      );
    }

    if (dto.accessCode) {
      await this.assertInviteHasMessageAttempt(eventId, registration);
    }

    if (registration.status === "REGISTERED") {
      if (wasRegisteredBefore) {
        const existingTicket = await this.p.tickets.findFirst({
          where: {
            eventId,
            registrationId: registration.id,
          },
        });
        if (!existingTicket) {
          throw new InternalServerErrorException(
            "Registration contract violation: registration exists but no ticket exists.",
          );
        }
      } else {
        await this.ensureFreeTicket({
          eventId,
          userId: registration.userId,
          email: registration.email,
          registrationId: registration.id,
        });
        const createdOrExistingTicket = await this.p.tickets.findFirst({
          where: {
            eventId,
            registrationId: registration.id,
          },
        });
        if (!createdOrExistingTicket) {
          throw new InternalServerErrorException(
            "Registration contract violation: REGISTERED registration must have a ticket.",
          );
        }
      }
    }

    return { success: true, registrationId: registration.id };
  }

  private async findRegistrationCandidate(
    eventId: string,
    dto: RegisterDto,
    userId?: string,
  ): Promise<any | null> {
    if (dto.registrationId) {
      return this.p.event_registrations.findFirst({
        where: { id: dto.registrationId, eventId },
      });
    }
    if (dto.accessCode?.trim()) {
      const trimmed = dto.accessCode.trim();
      const pass = await this.p.access_passes.findFirst({
        where: { event_id: eventId, access_code: trimmed },
      });
      if (!pass) {
        return null;
      }
      const or: Array<{ userId: string } | { email: string }> = [];
      if (userId) or.push({ userId });
      if (dto.email?.trim()) or.push({ email: dto.email.trim() });
      if (pass.user_id) or.push({ userId: pass.user_id });
      if (pass.email) or.push({ email: pass.email });
      if (or.length === 0) {
        return null;
      }
      return this.p.event_registrations.findFirst({
        where: { eventId, OR: or },
      });
    }
    if (userId) {
      return this.p.event_registrations.findFirst({
        where: { eventId, userId },
      });
    }
    if (dto.email) {
      return this.p.event_registrations.findFirst({
        where: { eventId, email: dto.email },
      });
    }
    return null;
  }

  private async assertInviteHasMessageAttempt(
    eventId: string,
    registration: { id: string; userId: string | null; email: string | null; accessCode: string | null },
  ): Promise<void> {
    const inviteKey = registration.email || (registration.userId ? `user-${registration.userId}` : null);
    if (!inviteKey) return;

    const invite = await this.p.invites.findFirst({
      where: {
        targetType: "EVENT",
        targetId: eventId,
        email: inviteKey,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invite) return;

    let hasMessageAttempt = false;

    if (registration.userId) {
      const message = await this.p.messages.findFirst({
        where: {
          senderId: invite.inviterUserId,
          recipientId: registration.userId,
          content: registration.accessCode
            ? { contains: registration.accessCode }
            : undefined,
        },
        orderBy: { createdAt: "desc" },
      });
      hasMessageAttempt = !!message;
    }

    if (!hasMessageAttempt) {
      const mailboxAttempt = await this.p.mailbox_items.findFirst({
        where: {
          registrationId: registration.id,
          type: "INVITATION",
        },
      });
      hasMessageAttempt = !!mailboxAttempt;
    }

    if (!hasMessageAttempt) {
      throw new InternalServerErrorException(
        "Invitation contract violation: invite exists but no message attempt found.",
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 3. MAILBOX OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Add item to mailbox (internal notification system)
   */
  private async addToMailbox(data: {
    userId?: string | null;
    email?: string | null;
    type: "TICKET" | "INVITATION" | "NOTIFICATION" | "EVENT_UPDATE";
    title: string;
    message: string;
    metadata?: any;
    registrationId?: string | null;
  }): Promise<void> {
    await this.p.mailbox_items.create({
      data: {
        id: randomUUID(),
        userId: data.userId || null,
        email: data.email || null,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        isRead: false,
        registrationId: data.registrationId || null,
      },
    });
  }

  /**
   * Get mailbox items for a user (includes both mailbox_items and audience_messages)
   * Resilient to missing or optional relations (event, entity, sender).
   */
  async getMailbox(userId?: string, eventId?: string): Promise<any[]> {
    if (!userId) {
      throw new BadRequestException("userId required");
    }

    // Get mailbox_items (system messages)
    const mailboxWhere: any = {
      userId,
    };

    if (eventId) {
      const registrations = await this.p.event_registrations.findMany({
        where: { eventId },
        select: { id: true },
      });
      const registrationIds = registrations.map((r) => r.id);
      if (registrationIds.length > 0) {
        mailboxWhere.registrationId = { in: registrationIds };
      } else {
        mailboxWhere.registrationId = { in: [] };
      }
    }

    let mailboxItems: any[] = [];
    try {
      mailboxItems = await this.p.mailbox_items.findMany({
        where: mailboxWhere,
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      this.logger.warn("mailbox_items findMany failed, continuing with empty list", err);
    }

    this.logger.log(`Mailbox items fetched: ${mailboxItems.length} (system)`);

    const transformSystemItem = (item: any): any => {
      try {
        return {
          id: item?.id,
          userId: item?.userId ?? null,
          email: item?.email ?? null,
          type: item?.type ?? "NOTIFICATION",
          title: item?.title ?? "",
          message: item?.message ?? "",
          metadata: item?.metadata ?? null,
          isRead: item?.isRead ?? false,
          registrationId: item?.registrationId ?? null,
          createdAt: item?.createdAt ?? new Date().toISOString(),
          updatedAt: item?.updatedAt ?? item?.createdAt ?? new Date().toISOString(),
          _messageClassification: "system_message" as const,
        };
      } catch (err) {
        this.logger.error("Mailbox system item transform failed", err);
        return null;
      }
    };
    const systemMessages = mailboxItems.map(transformSystemItem).filter(Boolean);

    // Get audience_messages (user messages from creators) – optional; table may not exist
    let audienceMessages: any[] = [];
    try {
      const audienceWhere: any = { recipientUserId: userId };
      if (eventId) audienceWhere.eventId = eventId;
      audienceMessages = await (this.p as any).audience_messages.findMany({
        where: audienceWhere,
        orderBy: { createdAt: "desc" },
        include: {
          events: { select: { id: true, name: true } },
          entities: { select: { id: true, name: true } },
          app_users_sender: { select: { id: true, email: true } },
        },
      });
    } catch (err) {
      this.logger.warn("audience_messages findMany failed, continuing without audience messages", err);
    }

    this.logger.log(`Audience messages fetched: ${audienceMessages.length}`);

    const transformAudienceItem = (msg: any): any => {
      try {
        const eventName = msg.events?.name ?? msg.event?.name ?? null;
        const entityName = msg.entities?.name ?? msg.entity?.name ?? null;
        const senderName = msg.app_users_sender?.email ?? msg.sender?.username ?? "System";
        return {
          id: msg.id,
          type: "AUDIENCE_MESSAGE" as const,
          title: msg.title ?? "",
          message: msg.message ?? "",
          metadata: {
            eventId: msg.eventId ?? null,
            eventName,
            entityId: msg.entityId ?? null,
            entityName,
            senderId: msg.senderId ?? null,
            senderName,
            channel: msg.channel ?? null,
          },
          isRead: msg.readAt != null,
          createdAt: msg.createdAt ?? new Date().toISOString(),
          updatedAt: msg.createdAt ?? msg.updatedAt ?? new Date().toISOString(),
          _isAudienceMessage: true,
          _messageClassification: "audience_message" as const,
          _senderEntityName: entityName,
        };
      } catch (err) {
        this.logger.error("Mailbox transform failed for audience message", err);
        return null;
      }
    };
    const transformedAudienceMessages = audienceMessages.map(transformAudienceItem).filter(Boolean);

    // Access passes: invitations (SENT) and claimed tickets (CLAIMED) for this user
    let accessPassItems: any[] = [];
    try {
      const appUser = await this.p.app_users.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const emailLower = appUser?.email?.trim().toLowerCase() ?? null;

      const accessPasses = await this.p.access_passes.findMany({
        where: {
          status: { in: ["SENT", "CLAIMED"] },
          OR: [
            { user_id: userId },
            ...(emailLower ? [{ email: emailLower }] : []),
          ],
        },
        include: {
          ticket_types: { select: { id: true, name: true } },
        },
        orderBy: { created_at: "desc" },
      });

      const eventIds = [...new Set(accessPasses.map((ap: any) => ap.event_id).filter(Boolean))];
      const eventsById = new Map<string, { id: string; name: string; startTime: Date }>();
      if (eventIds.length > 0) {
        const rows = await this.p.events.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, name: true, startTime: true },
        });
        for (const row of rows) {
          eventsById.set(row.id, row);
        }
      }

      accessPassItems = accessPasses.map((ap: any) => {
        const isTicket = ap.status === "CLAIMED";
        const eventRow = eventsById.get(ap.event_id);
        const eventName = eventRow?.name ?? "Event";
        const tierName = ap.ticket_types?.name ?? "Ticket";
        return {
          id: `access-pass-${ap.id}`,
          userId: ap.user_id ?? undefined,
          email: ap.email ?? undefined,
          type: isTicket ? "TICKET" : "INVITATION",
          title: isTicket ? `Ticket: ${eventName}` : `Invitation: ${eventName}`,
          message: isTicket
            ? `Your access pass for ${tierName} is ready.`
            : `You're invited to ${eventName} — ${tierName}.`,
          metadata: {
            eventId: eventRow?.id ?? ap.event_id,
            eventName,
            startTime: eventRow?.startTime
              ? new Date(eventRow.startTime).toISOString()
              : undefined,
            ticketTypeId: ap.ticket_type_id,
            ticketTypeName: tierName,
            accessPassId: ap.id,
            source: ap.source ?? undefined,
            accessCode: ap.access_code ?? undefined,
            status: ap.status ?? undefined,
          },
          isRead: false,
          registrationId: null,
          createdAt: ap.created_at
            ? new Date(ap.created_at).toISOString()
            : new Date().toISOString(),
          updatedAt: ap.created_at
            ? new Date(ap.created_at).toISOString()
            : new Date().toISOString(),
          _messageClassification: "system_message" as const,
          _fromAccessPass: true,
        };
      });
    } catch (err) {
      this.logger.warn("access_passes mailbox merge failed, continuing", err);
    }

    let directMessageItems: any[] = [];
    try {
      const rows = await this.messagesService.findInboxForUser(userId);
      directMessageItems = rows.map((m) => ({
        id: m.id,
        type: m.type === "EVENT_INVITE" ? "INVITATION" : "MESSAGE",
        title: m.type === "EVENT_INVITE" ? "Event invite" : "New Message",
        message: m.content,
        metadata: {
          senderId: m.senderId,
          eventId: m.eventId ?? undefined,
          ticketId: m.ticketId ?? undefined,
          ctaUrl: m.ctaUrl ?? undefined,
          messageType: m.type ?? "DIRECT",
        },
        isRead: m.isRead,
        read: false,
        registrationId: null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.createdAt.toISOString(),
        _messageClassification: "direct_message" as const,
      }));
      this.logger.log(`Mailbox messages rows: ${directMessageItems.length}`);
    } catch (err) {
      this.logger.warn("messages inbox merge failed, continuing", err);
    }

    let sentMessageItems: any[] = [];
    try {
      const sentRows = await this.messagesService.findSentForUser(userId);
      sentMessageItems = sentRows.map((m) => ({
        id: `sent-${m.id}`,
        type: m.type === "EVENT_INVITE" ? "INVITATION" : "MESSAGE",
        title: m.type === "EVENT_INVITE" ? "Invitation sent" : "Message sent",
        message: m.content,
        metadata: {
          senderId: userId,
          recipientId: m.recipientId,
          direction: "SENT",
          source: "messages",
          messageId: m.id,
          eventId: m.eventId ?? undefined,
          ticketId: m.ticketId ?? undefined,
          ctaUrl: m.ctaUrl ?? undefined,
          messageType: m.type ?? "DIRECT",
        },
        isRead: true,
        read: true,
        registrationId: null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.createdAt.toISOString(),
        _messageClassification: "system_message" as const,
      }));
      this.logger.log(`Mailbox sent message rows: ${sentMessageItems.length}`);
    } catch (err) {
      this.logger.warn("messages sent merge failed, continuing", err);
    }

    const allItems = [
      ...systemMessages,
      ...transformedAudienceMessages,
      ...accessPassItems,
      ...directMessageItems,
      ...sentMessageItems,
    ];
    return allItems.sort((a, b) => {
      const dateA = new Date(a.createdAt ?? 0).getTime();
      const dateB = new Date(b.createdAt ?? 0).getTime();
      return dateB - dateA;
    });
  }

  async markMailboxItemRead(
    userId: string,
    itemId: string,
  ): Promise<{ success: boolean; source: string | null }> {
    // Direct messages are represented by `messages.id` and read state is tracked in `notifications`.
    const messageNotificationUpdate = await this.p.notifications.updateMany({
      where: {
        userId,
        messageId: itemId,
        isRead: false,
      },
      data: { isRead: true },
    });
    if (messageNotificationUpdate.count > 0) {
      return { success: true, source: "notifications" };
    }

    // System mailbox entries.
    try {
      const mailboxUpdate = await this.p.mailbox_items.updateMany({
        where: {
          id: itemId,
          userId,
          isRead: false,
        },
        data: { isRead: true },
      });
      if (mailboxUpdate.count > 0) {
        return { success: true, source: "mailbox_items" };
      }
    } catch {
      // mailbox_items may not exist in some environments
    }

    // Legacy audience messages table.
    try {
      const audienceUpdate = await (this.p as any).audience_messages.updateMany({
        where: {
          id: itemId,
          recipientUserId: userId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
      if ((audienceUpdate?.count ?? 0) > 0) {
        return { success: true, source: "audience_messages" };
      }
    } catch {
      // audience_messages may not exist in some environments
    }

    // Access-pass derived items are synthetic ids (`access-pass-*`) and not persisted as read/unread.
    return { success: false, source: null };
  }

  // ---------------------------------------------------------------------------
  // 4. TICKET VALIDATION
  // ---------------------------------------------------------------------------

  /**
   * Validate ticket for streaming access
   * Returns ticket if valid and ACTIVE
   */
  async validateTicket(
    eventId: string,
    dto: ValidateTicketDto,
  ): Promise<{ valid: boolean; ticket?: any; reason?: string }> {
    // Validate event exists and is LIVE
    const event = await this.p.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return { valid: false, reason: "Event not found" };
    }

    if (event.phase !== "LIVE") {
      return { valid: false, reason: "Event is not live" };
    }

    // Find ticket by ticketId or accessCode
    let ticket = null;

    if (dto.ticketId) {
      ticket = await this.p.tickets.findUnique({
        where: { id: dto.ticketId },
        include: { event: true },
      });
    } else if (dto.accessCode) {
      // Check ticket.entryCode or event_registration.access_code for this event
      ticket = await this.p.tickets.findFirst({
        where: { entryCode: dto.accessCode, eventId },
        include: { event: true },
      });
      if (!ticket) {
        const reg = await this.p.event_registrations.findFirst({
          where: { eventId, accessCode: dto.accessCode },
        });
        if (reg?.status === "REGISTERED") {
          ticket = await this.p.tickets.findFirst({
            where: { registrationId: reg.id, eventId },
            include: { event: true },
          });
        }
      }
    }

    if (!ticket) {
      return { valid: false, reason: "Ticket not found" };
    }

    if (ticket.eventId !== eventId) {
      return { valid: false, reason: "Ticket is for a different event" };
    }

    if (ticket.status !== "ACTIVE") {
      return { valid: false, reason: `Ticket is ${ticket.status.toLowerCase()}` };
    }

    // Verify registration is REGISTERED
    if (ticket.registrationId) {
      const registration = await this.p.event_registrations.findUnique({
        where: { id: ticket.registrationId },
      });

      if (!registration || registration.status !== "REGISTERED") {
        return { valid: false, reason: "Registration is not active" };
      }
    }

    return { valid: true, ticket };
  }

  // ---------------------------------------------------------------------------
  // 5. NOTIFY ELIGIBLE USERS WHEN EVENT GOES LIVE
  // ---------------------------------------------------------------------------

  /**
   * Notify eligible users when event goes LIVE
   * Eligible users: REGISTERED users + users with ACTIVE tickets
   * Creates EVENT_UPDATE mailbox items (idempotent)
   * Never throws - logs errors and continues
   */
  async notifyLiveEvent(eventId: string): Promise<void> {
    try {
      // Load event
      const event = await this.p.events.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        console.error(`[notifyLiveEvent] Event not found: ${eventId}`);
        return;
      }

      // 1. Fetch all REGISTERED registrations
      const registrations = await this.p.event_registrations.findMany({
        where: {
          eventId,
          status: "REGISTERED",
        },
      });

      // 2. Fetch all ACTIVE tickets
      const tickets = await this.p.tickets.findMany({
        where: { eventId, status: "ACTIVE" },
      });

      // 3. Build de-duplicated recipient list
      // Key: userId or email (prefer userId)
      const recipients = new Map<string, {
        userId?: string | null;
        email?: string | null;
        ticketId?: string;
        registrationId?: string;
        accessCode?: string;
      }>();

      // Add recipients from registrations (schema: user_id, email, access_code)
      for (const registration of registrations) {
        const key = registration.userId || registration.email;
        if (key) {
          recipients.set(key, {
            userId: registration.userId || null,
            email: registration.email || null,
            registrationId: registration.id,
            accessCode: registration.accessCode || undefined,
          });
        }
      }

      // Add recipients from tickets (may include users without registrations)
      for (const ticket of tickets) {
        const userId = ticket.userId;
        const email = ticket.registrations?.email || null;
        const key = userId || email;

        if (key) {
          // Prefer existing entry if userId matches, otherwise merge
          const existing = recipients.get(key);
          if (existing) {
            // Update with ticket info if not already present
            if (!existing.ticketId) {
              existing.ticketId = ticket.id;
            }
          } else {
            // New recipient from ticket
            recipients.set(key, {
              userId: userId || null,
              email: email || null,
              ticketId: ticket.id,
              registrationId: ticket.registrationId || undefined,
              accessCode: ticket.registrations?.accessCode || undefined,
            });
          }
        }
      }

      // 3.5. Fetch user emails for recipients with userId (per requirements: if userId exists → use user.email)
      const userIds = Array.from(recipients.values())
        .map((r) => r.userId)
        .filter((id): id is string => !!id);

      if (userIds.length > 0) {
        const users = await this.p.app_users.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        });

        const userEmailMap = new Map<string, string>(
          users.map((u) => [u.id, u.email]),
        );

        // Update recipient emails with user.email when userId exists
        for (const recipient of recipients.values()) {
          if (recipient.userId) {
            const userEmail = userEmailMap.get(recipient.userId);
            if (userEmail) {
              recipient.email = userEmail;
            }
          }
        }
      }

      // 4. Create mailbox items for each eligible recipient (idempotent)
      let notified = 0;
      for (const [key, recipient] of recipients.entries()) {
        try {
          // Check if LIVE NOW notification already exists (idempotent check)
          // Query by userId/email and type, then filter by eventId in metadata
          const whereClause: any = {
            type: "EVENT_UPDATE",
          };

          if (recipient.userId) {
            whereClause.userId = recipient.userId;
          } else if (recipient.email) {
            whereClause.email = recipient.email;
          } else {
            // Skip if no userId or email
            continue;
          }

          const existingNotifications = await this.p.mailbox_items.findMany({
            where: whereClause,
          });

          // Check if any existing notification is for this event
          const existingForEvent = existingNotifications.find(
            (item: any) => item.metadata?.eventId === eventId
          );

          if (existingForEvent) {
            // Already notified, skip (idempotent)
            continue;
          }

          // Create LIVE NOW mailbox item
          await this.addToMailbox({
            userId: recipient.userId || null,
            email: recipient.email || null,
            type: "EVENT_UPDATE",
            title: `LIVE NOW: ${event.name}`,
            message: "The event you registered for is now live.",
            metadata: {
              eventId,
              eventName: event.name,
              ticketId: recipient.ticketId || undefined,
              registrationId: recipient.registrationId || undefined,
              accessCode: recipient.accessCode || undefined,
              phase: "LIVE",
            },
            registrationId: recipient.registrationId || null,
          });

          // Send email notification (non-blocking, best-effort)
          // Email is secondary to mailbox - failures must not stop mailbox notifications
          if (recipient.email) {
            try {
              // Determine if user is authenticated (has userId)
              const isAuthenticated = !!recipient.userId;
              
              // Include accessCode only if user is NOT authenticated
              const accessCodeForEmail = !isAuthenticated ? recipient.accessCode : undefined;
              
              // Generate watch URL (frontend route)
              const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "https://showgeo.app";
              const watchUrl = `${frontendUrl}/events/${eventId}/watch`;
              
              await this.sendLiveNowEmail(
                {
                  email: recipient.email,
                  eventName: event.name,
                  accessCode: accessCodeForEmail,
                  watchUrl,
                },
                recipient.userId,
              );
            } catch (emailError) {
              // Log email error but continue - email is optional, mailbox is primary
              console.error(`[notifyLiveEvent] Failed to send email to ${recipient.email}:`, emailError);
            }
          }

          notified++;
        } catch (error) {
          // Log error but continue with other recipients
          console.error(`[notifyLiveEvent] Failed to notify recipient ${key}:`, error);
        }
      }

      console.log(`[notifyLiveEvent] Notified ${notified} eligible users for event ${eventId}`);
    } catch (error) {
      // Never throw - log and return
      console.error(`[notifyLiveEvent] Failed to notify users for event ${eventId}:`, error);
    }
  }

  /**
   * Check if email should be sent based on user notification preferences (Phase 2C)
   * 
   * Rules:
   * - If userId exists, check user_profiles.preferences
   * - If userId is null (guest user), always return true (no preferences to check)
   * - Missing preferences default to true (opt-in by default)
   * - Structure: preferences.notifications.emailLiveNow or emailReminders
   * 
   * @param userId - User ID (null for guest users)
   * @param emailType - Type of email ("LIVE_NOW" or "REMINDER")
   * @returns true if email should be sent, false otherwise
   */
  private async shouldSendEmail(
    userId: string | null | undefined,
    emailType: "LIVE_NOW" | "REMINDER",
  ): Promise<boolean> {
    // Guest users (no userId) - always send email (no preferences to check)
    if (!userId) {
      return true;
    }

    try {
      // Load user profile with preferences
      const profile = await this.p.user_profiles.findUnique({
        where: { userId },
        select: { preferences: true },
      });

      // If no profile or no preferences, default to true (opt-in by default)
      if (!profile || !profile.preferences) {
        return true;
      }

      const preferences = profile.preferences as any;

      // Check notification preferences structure
      // preferences.notifications.emailLiveNow or emailReminders
      if (preferences.notifications) {
        if (emailType === "LIVE_NOW") {
          // Default to true if missing
          return preferences.notifications.emailLiveNow !== false;
        } else if (emailType === "REMINDER") {
          // Default to true if missing
          return preferences.notifications.emailReminders !== false;
        }
      }

      // If notifications object doesn't exist, default to true
      return true;
    } catch (error) {
      // Log error but default to true (don't block email sending if preference check fails)
      console.error(
        `[shouldSendEmail] Failed to check preferences for user ${userId}:`,
        error,
      );
      return true;
    }
  }

  /**
   * Send LIVE NOW email notification
   * 
   * Email is secondary to mailbox notifications and must never block execution.
   * This method uses the EmailService abstraction for provider-agnostic sending.
   * 
   * Phase 2A: Sends both plain-text and branded HTML email.
   * Phase 2C: Respects user notification preferences.
   * 
   * Rules (enforced):
   * - Email is sent ONLY if user is REGISTERED or has ACTIVE ticket
   * - Email is sent ONLY if user preferences allow it (Phase 2C)
   * - accessCode is included ONLY if user is NOT authenticated (no userId)
   * - Do NOT include ticketId in email
   * - Do NOT generate new access codes
   * - Do NOT claim or burn tickets
   * 
   * @param params - Email parameters
   * @param userId - User ID (optional, for preference checking)
   * @returns Promise that resolves when email is sent (or fails silently)
   */
  private async sendLiveNowEmail(
    params: {
      email: string;
      eventName: string;
      accessCode?: string;
      watchUrl: string;
    },
    userId?: string | null,
  ): Promise<void> {
    // Phase 2C: Check user notification preferences before sending
    const shouldSend = await this.shouldSendEmail(userId, "LIVE_NOW");
    if (!shouldSend) {
      console.log(
        `[sendLiveNowEmail] Email skipped due to user preference (userId: ${userId})`,
      );
      return;
    }
    // Email content (LOCKED COPY - DO NOT MODIFY)
    const subject = `LIVE NOW: ${params.eventName}`;
    
    // Build plain-text email body exactly as specified (LOCKED COPY)
    let text = `${params.eventName} is live now.\n\n`;
    text += `You can watch immediately by logging into Showgeo.\n\n`;
    
    if (params.accessCode) {
      text += `If you are not logged in, you may use this one-time access code:\n`;
      text += `${params.accessCode}\n\n`;
      text += `This code can only be used once.\n\n`;
    }
    
    text += `For the best experience, we recommend signing in to Showgeo.\n`;
    text += `Logging in secures your access and enables additional features during the stream.\n\n`;
    
    if (params.accessCode) {
      text += `Access codes are designed for offline or guest viewing. `;
      text += `If you continue watching through Showgeo, the access code will no longer be active.\n\n`;
    }
    
    text += `Watch now →\n`;
    text += `${params.watchUrl}\n`;
    
    // Generate branded HTML email (Phase 2A)
    const html = this.emailService.buildLiveNowHtmlEmail({
      eventName: params.eventName,
      watchUrl: params.watchUrl,
      accessCode: params.accessCode,
    });
    
    // Send via EmailService (provider-agnostic, non-blocking)
    // EmailService handles environment-aware behavior and error handling
    // Sends both text/plain and text/html when HTML is provided
    await this.emailService.sendEmail({
      to: params.email,
      subject,
      text,
      html,
    });
  }

  /**
   * Notify eligible users with LIVE reminder (Phase 2B)
   * 
   * Sends reminders to users who registered but haven't joined the stream yet.
   * Excludes users who already joined (tracked via ticket.joinedAt).
   * 
   * Rules:
   * - Only for REGISTERED users or users with ACTIVE tickets
   * - Excludes users who already joined (joinedAt is set)
   * - Idempotent (checks for existing reminders)
   * - Never throws (logs errors only)
   * - Non-blocking (email failures don't stop mailbox notifications)
   * 
   * @param eventId - Event ID
   * @param reminderType - Type of reminder (LIVE_10_MIN, LIVE_30_MIN)
   */
  async notifyLiveReminder(
    eventId: string,
    reminderType: EventReminderType,
  ): Promise<void> {
    try {
      // Load event
      const event = await this.p.events.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        console.error(`[notifyLiveReminder] Event not found: ${eventId}`);
        return;
      }

      // Only send reminders for LIVE events
      if (event.phase !== "LIVE" && event.status !== "LIVE") {
        console.log(
          `[notifyLiveReminder] Event ${eventId} is not LIVE, skipping reminder`,
        );
        return;
      }

      // 1. Fetch all REGISTERED registrations
      const registrations = await this.p.event_registrations.findMany({
        where: {
          eventId,
          status: "REGISTERED",
        },
      });

      // 2. Fetch all ACTIVE tickets (including those without registrations)
      // Exclude tickets where joinedAt is set (user already joined)
      const tickets = await this.p.tickets.findMany({
        where: { eventId, status: "ACTIVE" },
      });

      // 3. Build de-duplicated recipient list
      // Key: userId or email (prefer userId)
      const recipients = new Map<
        string,
        {
          userId?: string | null;
          email?: string | null;
          ticketId?: string;
          registrationId?: string;
          accessCode?: string;
        }
      >();

      // Add recipients from registrations (schema: user_id, email, access_code)
      for (const registration of registrations) {
        const key = registration.userId || registration.email;
        if (key) {
          recipients.set(key, {
            userId: registration.userId || null,
            email: registration.email || null,
            registrationId: registration.id,
            accessCode: registration.accessCode || undefined,
          });
        }
      }

      // Add recipients from tickets (may include users without registrations)
      for (const ticket of tickets) {
        const userId = ticket.userId;
        const email = (ticket as any).registrations?.email ?? null;
        const key = userId || email;

        if (key) {
          const existing = recipients.get(key);
          if (existing) {
            if (!existing.ticketId) existing.ticketId = ticket.id;
          } else {
            recipients.set(key, {
              userId: userId || null,
              email: email || null,
              ticketId: ticket.id,
              registrationId: ticket.registrationId || undefined,
              accessCode: (ticket as any).registrations?.accessCode ?? undefined,
            });
          }
        }
      }

      // 4. Determine reminder title based on type
      const reminderTitles: Record<EventReminderType, string> = {
        [EventReminderType.LIVE_10_MIN]: `Starting Now: ${event.name}`,
        [EventReminderType.LIVE_30_MIN]: `Still Live: ${event.name}`,
      };
      const reminderTitle = reminderTitles[reminderType];

      // 5. Create mailbox items and send emails for each eligible recipient
      let notified = 0;
      for (const [key, recipient] of recipients.entries()) {
        try {
          // Check if reminder notification already exists (idempotent check)
          const whereClause: any = {
            type: "EVENT_UPDATE",
          };

          if (recipient.userId) {
            whereClause.userId = recipient.userId;
          } else if (recipient.email) {
            whereClause.email = recipient.email;
          } else {
            // Skip if no userId or email
            continue;
          }

          const existingNotifications = await this.p.mailbox_items.findMany({
            where: whereClause,
          });

          // Check if any existing notification is for this event with this reminder type
          const existingReminder = existingNotifications.find(
            (item: any) =>
              item.metadata?.eventId === eventId &&
              item.metadata?.reminderType === reminderType,
          );

          if (existingReminder) {
            // Already notified, skip (idempotent)
            continue;
          }

          // Create reminder mailbox item
          await this.addToMailbox({
            userId: recipient.userId || null,
            email: recipient.email || null,
            type: "EVENT_UPDATE",
            title: reminderTitle,
            message: "The event you registered for is still live. Join now to watch!",
            metadata: {
              eventId,
              eventName: event.name,
              ticketId: recipient.ticketId || undefined,
              registrationId: recipient.registrationId || undefined,
              accessCode: recipient.accessCode || undefined,
              phase: "LIVE",
              reminderType,
            },
            registrationId: recipient.registrationId || null,
          });

          // Send email reminder (non-blocking, best-effort)
          // Email is secondary to mailbox - failures must not stop mailbox notifications
          if (recipient.email) {
            try {
              // Determine if user is authenticated (has userId)
              const isAuthenticated = !!recipient.userId;

              // Include accessCode only if user is NOT authenticated
              const accessCodeForEmail = !isAuthenticated
                ? recipient.accessCode
                : undefined;

              // Generate watch URL (frontend route)
              const frontendUrl =
                this.configService.get<string>("FRONTEND_URL") ||
                "https://showgeo.app";
              const watchUrl = `${frontendUrl}/events/${eventId}/watch`;

              await this.sendLiveReminderEmail(
                {
                  email: recipient.email,
                  eventName: event.name,
                  accessCode: accessCodeForEmail,
                  watchUrl,
                  reminderType,
                },
                recipient.userId,
              );
            } catch (emailError) {
              // Log email error but continue - email is optional, mailbox is primary
              console.error(
                `[notifyLiveReminder] Failed to send email to ${recipient.email}:`,
                emailError,
              );
            }
          }

          notified++;
        } catch (error) {
          // Log error but continue with other recipients
          console.error(
            `[notifyLiveReminder] Failed to notify recipient ${key}:`,
            error,
          );
        }
      }

      console.log(
        `[notifyLiveReminder] Notified ${notified} eligible users for event ${eventId} (${reminderType})`,
      );
    } catch (error) {
      // Never throw - log and return
      console.error(
        `[notifyLiveReminder] Failed to notify users for event ${eventId}:`,
        error,
      );
    }
  }

  /**
   * Send LIVE reminder email notification (Phase 2B)
   * 
   * Email is secondary to mailbox notifications and must never block execution.
   * This method uses the EmailService abstraction for provider-agnostic sending.
   * 
   * Phase 2C: Respects user notification preferences.
   * 
   * Rules (enforced):
   * - Email is sent ONLY if user is REGISTERED or has ACTIVE ticket
   * - Email is sent ONLY if user preferences allow it (Phase 2C)
   * - accessCode is included ONLY if user is NOT authenticated (no userId)
   * - Do NOT include ticketId in email
   * - Do NOT generate new access codes
   * - Do NOT claim or burn tickets
   * 
   * @param params - Email parameters
   * @param userId - User ID (optional, for preference checking)
   * @returns Promise that resolves when email is sent (or fails silently)
   */
  private async sendLiveReminderEmail(
    params: {
      email: string;
      eventName: string;
      accessCode?: string;
      watchUrl: string;
      reminderType: EventReminderType;
    },
    userId?: string | null,
  ): Promise<void> {
    // Phase 2C: Check user notification preferences before sending
    const shouldSend = await this.shouldSendEmail(userId, "REMINDER");
    if (!shouldSend) {
      console.log(
        `[sendLiveReminderEmail] Email skipped due to user preference (userId: ${userId})`,
      );
      return;
    }

    // Email content for reminders
    const subject = `${params.eventName} is live now`;

    // Build plain-text email body
    let text = `${params.eventName} is live now.\n\n`;
    text += `The event has already started and you can still join.\n\n`;
    text += `Log into Showgeo for the best experience.\n`;

    if (params.accessCode) {
      text += `Or use your one-time access code below.\n\n`;
      text += `One-time access code:\n`;
      text += `${params.accessCode}\n\n`;
      text += `This code can only be used once.\n\n`;
    }

    text += `Watch now →\n`;
    text += `${params.watchUrl}\n`;

    // Generate branded HTML email (reuse similar styling to LIVE NOW)
    const html = this.emailService.buildLiveReminderHtmlEmail({
      eventName: params.eventName,
      watchUrl: params.watchUrl,
      accessCode: params.accessCode,
      reminderType: params.reminderType,
    });

    // Send via EmailService (provider-agnostic, non-blocking)
    await this.emailService.sendEmail({
      to: params.email,
      subject,
      text,
      html,
    });
  }

  /**
   * Notify all registered guests when event goes LIVE
   * @deprecated Use notifyLiveEvent() instead
   * Called by events service on phase transition
   */
  async notifyRegisteredGuests(eventId: string): Promise<{ notified: number }> {
    const registrations = await this.p.event_registrations.findMany({
      where: {
        eventId,
        status: "REGISTERED",
      },
    });

    const event = await this.p.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    let notified = 0;

    for (const registration of registrations) {
      await this.addToMailbox({
        userId: registration.userId || null,
        email: registration.email || null,
        type: "NOTIFICATION",
        title: `${event.name} is now LIVE!`,
        message: `The event "${event.name}" has started. Join now to watch!`,
        metadata: {
          eventId,
          eventName: event.name,
          registrationId: registration.id,
        },
        registrationId: registration.id,
      });

      // TODO: Send email notification
      // When email service is implemented, send "Event is LIVE" email here

      notified++;
    }

    return { notified };
  }
}

