import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  Prisma,
  TicketType,
} from "@prisma/client";
import { TicketStatus } from "../../shared/types/ticket.types";
import { randomBytes, randomUUID } from "crypto";
import { PrismaService, asPrismaDb } from "../../prisma/prisma.service";
import { EscrowService } from "../escrow/escrow.service";
import { PaymentsService } from "../payments/payments.service";
import { MessagesService } from "../messages/messages.service";

export type IssueTicketContext = {
  orderId?: string | null;
  accessPassId?: string | null;
  source: "FREE" | "PAID" | "INVITE";
};

export type AccessStatusDto = {
  /** True only when an ACTIVE ticket exists for this user and event (pass/registration alone never grant access). */
  hasAccess: boolean;
  hasTicket: boolean;
  requiresInvite: boolean;
  requiresPayment: boolean;
  availableTicketTypes: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    capacity: number | null;
    visibility: string | null;
    requires_invite: boolean | null;
  }>;
  claimedAccessPassId: string | null;
  activeTicketId: string | null;
  /** Result of optional `?code=` on the landing URL */
  inviteCodeStatus: "none" | "valid" | "invalid" | "used";
  /** Invite / access code from the user's access_pass for this event, if present */
  accessCode: string | null;
  /** When inviteCodeStatus is valid, the pass matched by code */
  resolvedAccessPassIdFromCode: string | null;
  resolvedTicketTypeIdFromCode: string | null;
};

/** `tickets.package_type` stores `ticket_types.id` (UUID string) — no FK in schema. */

@Injectable()
export class EventTicketLifecycleService {
  private readonly logger = new Logger(EventTicketLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  /** Full Prisma delegates (see {@link asPrismaDb}). */
  private get db() {
    return asPrismaDb(this.prisma);
  }

  /**
   * Issue a ticket row for a ticket_types row; optionally updates access_pass.
   */
  async issueTicketFromTicketType(
    eventId: string,
    ticketTypeId: string,
    userId: string,
    context: IssueTicketContext,
  ) {
    const tt = await this.db.ticket_types.findFirst({
      where: { id: ticketTypeId, event_id: eventId },
    });
    if (!tt) {
      throw new NotFoundException("Ticket type not found for this event");
    }

    const dup = await this.db.tickets.findFirst({
      where: {
        userId,
        eventId,
        status: TicketStatus.ACTIVE,
      },
    });
    if (dup) {
      throw new ConflictException("You already have an active ticket for this event");
    }

    const priceNum = Number(tt.price ?? 0);
    const ticketId = randomUUID();

    const ticket = await this.db.tickets.create({
      data: {
        id: ticketId,
        userId,
        eventId,
        orderId: context.orderId ?? null,
        type: context.source === "PAID" ? TicketType.PAID : TicketType.FREE,
        price: priceNum,
        currency: tt.currency ?? "USD",
        status: TicketStatus.ACTIVE,
        package_type: ticketTypeId,
        updatedAt: new Date(),
      },
    });

    if (context.accessPassId) {
      await this.db.access_passes.updateMany({
        where: {
          id: context.accessPassId,
          event_id: eventId,
        },
        data: {
          user_id: userId,
          status: "CONVERTED",
          used_at: new Date(),
        },
      });
    }

    const entryCode = await this.allocateUniqueTicketEntryCode();
    await this.db.tickets.update({
      where: { id: ticket.id },
      data: { entryCode },
    });

    await this.syncEventRegistrationAfterTicket(
      eventId,
      userId,
      ticket.id,
      context.accessPassId ?? null,
    );

    void this.notifyRegistrationSuccess(
      eventId,
      userId,
      ticketTypeId,
      context,
      entryCode,
    ).catch((err) => {
      this.logger.warn(
        `Registration confirmation message failed (non-blocking): ${(err as Error)?.message}`,
      );
    });

    return { ...ticket, entryCode };
  }

  /** Unique `tickets.entryCode` for check-in / access (stored on ticket row). */
  private async allocateUniqueTicketEntryCode(): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const code = randomBytes(10).toString("hex").toUpperCase().slice(0, 16);
      const clash = await this.db.tickets.findFirst({
        where: { entryCode: code },
        select: { id: true },
      });
      if (!clash) return code;
    }
    return randomUUID().replace(/-/g, "").toUpperCase().slice(0, 20);
  }

  private normalizeEmail(e: string | null | undefined): string | null {
    const t = e?.trim().toLowerCase();
    return t || null;
  }

  /** Enforce access_pass identity matches the registering user (no independent registration). */
  private async assertPassIdentityForUser(
    userId: string,
    pass: {
      user_id: string | null;
      email: string | null;
      access_code: string | null;
    },
    submittedCode: string | null | undefined,
  ): Promise<void> {
    if (pass.user_id && pass.user_id !== userId) {
      throw new ForbiddenException("This invite is for another account");
    }
    const passEmail = this.normalizeEmail(pass.email);
    if (passEmail) {
      const user = await this.db.app_users.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (this.normalizeEmail(user?.email) !== passEmail) {
        throw new ForbiddenException("This invite is for another email address.");
      }
    }
    const code = submittedCode?.trim() ?? null;
    if (pass.access_code) {
      if (code && pass.access_code !== code) {
        throw new ForbiddenException("Invalid access code");
      }
      if (!code && pass.user_id && pass.user_id !== userId) {
        throw new ForbiddenException("Invalid access code");
      }
    }
  }

  /** Upsert `event_registrations` from the access_pass used for this ticket (projection only). */
  private async syncEventRegistrationAfterTicket(
    eventId: string,
    userId: string,
    ticketId: string,
    accessPassId: string | null,
  ): Promise<void> {
    try {
      if (!accessPassId) {
        this.logger.warn(
          "syncEventRegistrationAfterTicket: missing accessPassId, skipping registration sync",
        );
        return;
      }
      const pass = await this.db.access_passes.findFirst({
        where: { id: accessPassId, event_id: eventId },
      });
      if (!pass) {
        this.logger.warn("syncEventRegistrationAfterTicket: access pass not found");
        return;
      }

      const appUser = await this.db.app_users.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const regEmail =
        pass.email != null && String(pass.email).trim() !== ""
          ? String(pass.email).trim()
          : appUser?.email ?? null;
      const passCode = pass.access_code ?? null;

      let existing = passCode
        ? await this.db.event_registrations.findFirst({
            where: { eventId, accessCode: passCode },
          })
        : null;
      if (!existing) {
        existing = await this.db.event_registrations.findFirst({
          where: { eventId, userId },
        });
      }

      if (existing) {
        await this.db.event_registrations.update({
          where: { id: existing.id },
          data: {
            status: "REGISTERED",
            userId,
            email: regEmail ?? existing.email,
            ...(passCode != null ? { accessCode: passCode } : {}),
          },
        });
        await this.db.tickets.update({
          where: { id: ticketId },
          data: { registrationId: existing.id },
        });
        return;
      }

      const reg = await this.db.event_registrations.create({
        data: {
          id: randomUUID(),
          eventId,
          userId,
          email: regEmail,
          accessCode: passCode,
          status: "REGISTERED",
        },
      });

      await this.db.tickets.update({
        where: { id: ticketId },
        data: { registrationId: reg.id },
      });
    } catch (err) {
      this.logger.warn(
        `syncEventRegistrationAfterTicket failed (non-blocking): ${(err as Error)?.message}`,
      );
    }
  }

  /**
   * Inbox + notification + email: confirmed for event (free, invite, or paid checkout).
   * Sender = entity owner (creator). Skips if owner is missing or same as registrant.
   */
  private async notifyRegistrationSuccess(
    eventId: string,
    userId: string,
    ticketTypeId: string,
    context: IssueTicketContext,
    ticketEntryCode: string,
  ): Promise<void> {
    const event = await this.db.events.findUnique({
      where: { id: eventId },
      include: { entity: true },
    });
    if (!event?.entity?.ownerId) {
      return;
    }
    const senderId = event.entity.ownerId;
    if (senderId === userId) {
      return;
    }

    this.logger.log("notifyRegistrationSuccess", {
      userId,
      eventId: event.id,
    });

    const tt = await this.db.ticket_types.findFirst({
      where: { id: ticketTypeId, event_id: eventId },
    });
    const tierName = tt?.name ?? "Ticket";

    let accessLine = "";
    if (context.accessPassId) {
      const pass = await this.db.access_passes.findFirst({
        where: { id: context.accessPassId, event_id: eventId },
        select: { access_code: true },
      });
      if (pass?.access_code) {
        accessLine = `\nInvite / registration code: ${pass.access_code}`;
      }
    }

    const start = event.startTime
      ? new Date(event.startTime).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "TBD";

    const entryLine = ticketEntryCode
      ? `\nYour ticket access code (entry): ${ticketEntryCode}`
      : "";

    const content = `You're confirmed for "${event.name}" (${tierName}).\nDate: ${start}${accessLine}${entryLine}\nYour ticket is saved — check your email and inbox.`;

    await this.messagesService.sendMessage({
      senderId,
      recipientId: userId,
      content,
    });
  }

  /**
   * Resolve invite link `?code=` against access_passes for this event.
   */
  private async resolveInviteCodeForEvent(
    eventId: string,
    inviteCode: string | null | undefined,
    userId: string | null,
  ): Promise<{
    inviteCodeStatus: "none" | "valid" | "invalid" | "used";
    passId: string | null;
    ticketTypeId: string | null;
  }> {
    const trimmed = inviteCode?.trim() ?? "";
    if (!trimmed) {
      return { inviteCodeStatus: "none", passId: null, ticketTypeId: null };
    }

    const pass = await this.db.access_passes.findFirst({
      where: { event_id: eventId, access_code: trimmed },
    });

    if (!pass) {
      return { inviteCodeStatus: "invalid", passId: null, ticketTypeId: null };
    }

    const isConverted =
      pass.status === "CONVERTED" || pass.used_at != null;

    if (isConverted) {
      return {
        inviteCodeStatus: "used",
        passId: pass.id,
        ticketTypeId: pass.ticket_type_id,
      };
    }

    if (pass.user_id && userId && pass.user_id !== userId) {
      return { inviteCodeStatus: "invalid", passId: null, ticketTypeId: null };
    }

    if (pass.user_id && !userId) {
      return { inviteCodeStatus: "invalid", passId: null, ticketTypeId: null };
    }

    return {
      inviteCodeStatus: "valid",
      passId: pass.id,
      ticketTypeId: pass.ticket_type_id,
    };
  }

  async getAccessStatus(
    eventId: string,
    userId: string | null,
    options?: { inviteCode?: string | null },
  ): Promise<AccessStatusDto> {
    const event = await this.db.events.findUnique({
      where: { id: eventId },
      select: { id: true, registrationAccess: true, ticketRequired: true },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const catalog = await this.db.ticket_types.findMany({
      where: { event_id: eventId },
      orderBy: { created_at: "asc" },
    });

    const availableTicketTypes = catalog.map((t) => ({
      id: t.id,
      name: t.name,
      price: Number(t.price ?? 0),
      currency: t.currency ?? "USD",
      capacity: t.capacity ?? null,
      visibility: t.visibility ?? "PUBLIC",
      requires_invite: t.requires_invite ?? false,
    }));

    const ra = (event.registrationAccess || "").toUpperCase();
    const requiresInviteFromEvent =
      ra === "INVITE_ONLY" || ra === "INVITE";

    const catalogInviteOnly =
      catalog.length > 0 && catalog.every((t) => t.requires_invite === true);

    const requiresInvite =
      requiresInviteFromEvent || catalogInviteOnly;

    const hasFreePublic = catalog.some((t) => {
      const vis = (t.visibility ?? "PUBLIC").toUpperCase();
      if (vis !== "PUBLIC") return false;
      if (t.requires_invite === true) return false;
      return Number(t.price ?? 0) === 0;
    });

    const hasPublicPaid = catalog.some((t) => {
      const vis = (t.visibility ?? "PUBLIC").toUpperCase();
      if (vis !== "PUBLIC") return false;
      if (t.requires_invite === true) return false;
      return Number(t.price ?? 0) > 0;
    });

    const codeRes = await this.resolveInviteCodeForEvent(
      eventId,
      options?.inviteCode,
      userId,
    );

    const resolvedPassFromCode =
      codeRes.inviteCodeStatus === "valid" ? codeRes.passId : null;
    const resolvedTicketTypeFromCode =
      codeRes.inviteCodeStatus === "valid" ? codeRes.ticketTypeId : null;

    if (!userId) {
      const mergedPassId = resolvedPassFromCode;

      const ttForCode = resolvedTicketTypeFromCode
        ? catalog.find((t) => t.id === resolvedTicketTypeFromCode)
        : null;

      const invitePaidWithValidCode =
        Boolean(mergedPassId) &&
        !!ttForCode &&
        ttForCode.requires_invite === true &&
        Number(ttForCode.price ?? 0) > 0;

      const publicPaidOnlyPathAnon =
        !hasFreePublic && hasPublicPaid && !mergedPassId;

      const requiresPaymentAnon =
        publicPaidOnlyPathAnon || invitePaidWithValidCode;

      return {
        hasAccess: false,
        hasTicket: false,
        requiresInvite,
        requiresPayment: requiresPaymentAnon,
        availableTicketTypes,
        claimedAccessPassId: mergedPassId,
        activeTicketId: null,
        inviteCodeStatus: codeRes.inviteCodeStatus,
        accessCode: null,
        resolvedAccessPassIdFromCode: resolvedPassFromCode,
        resolvedTicketTypeIdFromCode: resolvedTicketTypeFromCode,
      };
    }

    const activeTicket = await this.db.tickets.findFirst({
      where: {
        userId,
        eventId,
        status: TicketStatus.ACTIVE,
      },
    });

    if (activeTicket) {
      return {
        hasAccess: true,
        hasTicket: true,
        requiresInvite: false,
        requiresPayment: false,
        availableTicketTypes,
        claimedAccessPassId: null,
        activeTicketId: activeTicket.id,
        inviteCodeStatus: "none",
        accessCode: null,
        resolvedAccessPassIdFromCode: null,
        resolvedTicketTypeIdFromCode: null,
      };
    }

    const passRows = await this.db.access_passes.findMany({
      where: {
        event_id: eventId,
        OR: [{ user_id: userId }, { user_id: null }],
      },
      orderBy: { created_at: "desc" },
    });

    const userPasses = passRows.filter(
      (p) => p.user_id === userId || p.user_id === null,
    );

    let claimedAccessPassId: string | null = null;
    const pending = userPasses.find(
      (p) =>
        p.user_id === userId &&
        (p.status === "SENT" ||
          p.status === "CLAIMED" ||
          p.status === "CREATED"),
    );
    if (pending) {
      claimedAccessPassId = pending.id;
    }

    const mergedPassId =
      claimedAccessPassId ??
      (codeRes.inviteCodeStatus === "valid" ? codeRes.passId : null);

    let passTicketTypeId: string | null = null;
    if (mergedPassId) {
      const pr = await this.db.access_passes.findUnique({
        where: { id: mergedPassId },
        select: { ticket_type_id: true },
      });
      passTicketTypeId = pr?.ticket_type_id ?? null;
    }

    const ttForPass = passTicketTypeId
      ? catalog.find((t) => t.id === passTicketTypeId)
      : null;

    const invitePaidWithPass =
      Boolean(mergedPassId) &&
      !!ttForPass &&
      ttForPass.requires_invite === true &&
      Number(ttForPass.price ?? 0) > 0;

    const publicPaidOnlyPath =
      !hasFreePublic && hasPublicPaid && !mergedPassId;

    const requiresPayment = publicPaidOnlyPath || invitePaidWithPass;

    const accessCodeFromPass =
      userPasses.find((p) => p.access_code)?.access_code ?? null;

    return {
      hasAccess: false,
      hasTicket: false,
      requiresInvite,
      requiresPayment,
      availableTicketTypes,
      claimedAccessPassId: mergedPassId,
      activeTicketId: null,
      inviteCodeStatus: codeRes.inviteCodeStatus,
      accessCode: accessCodeFromPass,
      resolvedAccessPassIdFromCode: resolvedPassFromCode,
      resolvedTicketTypeIdFromCode: resolvedTicketTypeFromCode,
    };
  }

  /**
   * Free registration: public tiers or invite pass with optional code.
   */
  async registerFree(
    eventId: string,
    userId: string,
    dto: {
      ticketTypeId: string;
      accessPassId?: string;
      accessCode?: string;
    },
  ) {
    const { ticketTypeId, accessPassId, accessCode } = dto;

    const event = await this.db.events.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException("Event not found");

    const tt = await this.db.ticket_types.findFirst({
      where: { id: ticketTypeId, event_id: eventId },
    });
    if (!tt) throw new NotFoundException("Ticket type not found");

    const price = Number(tt.price ?? 0);
    if (price > 0) {
      throw new BadRequestException("This ticket requires payment");
    }

    const existingTicket = await this.db.tickets.findFirst({
      where: {
        userId,
        eventId,
        status: TicketStatus.ACTIVE,
      },
    });
    if (existingTicket) {
      throw new ConflictException("You already have an active ticket for this event");
    }

    const visibility = (tt.visibility ?? "PUBLIC").toUpperCase();
    const ra = (event.registrationAccess || "").toUpperCase();
    const requiresInviteFromEvent =
      ra === "INVITE_ONLY" || ra === "INVITE";
    const requiresInvite =
      requiresInviteFromEvent ||
      tt.requires_invite === true ||
      visibility === "PRIVATE";

    const codeTrim = accessCode?.trim() ?? null;
    let resolvedPassId: string | null = accessPassId ?? null;

    if (codeTrim) {
      const byCode = await this.db.access_passes.findFirst({
        where: { event_id: eventId, access_code: codeTrim },
      });
      if (!byCode) {
        throw new ForbiddenException("Invalid access code");
      }
      if (byCode.ticket_type_id !== ticketTypeId) {
        throw new BadRequestException("Access pass does not match this ticket type");
      }
      await this.assertPassIdentityForUser(userId, byCode, codeTrim);
      resolvedPassId = byCode.id;
    }

    if (requiresInvite) {
      if (!resolvedPassId) {
        throw new ForbiddenException("An invitation is required for this ticket type");
      }
      const pass = await this.db.access_passes.findFirst({
        where: { id: resolvedPassId, event_id: eventId },
      });
      if (!pass) throw new NotFoundException("Access pass not found");
      if (pass.ticket_type_id !== ticketTypeId) {
        throw new BadRequestException("Access pass does not match this ticket type");
      }
      if (!codeTrim) {
        await this.assertPassIdentityForUser(userId, pass, accessCode?.trim());
      }
      if (!pass.user_id) {
        await this.db.access_passes.update({
          where: { id: pass.id },
          data: { user_id: userId, status: "CLAIMED" },
        });
      }
      resolvedPassId = pass.id;
    } else {
      if (visibility !== "PUBLIC") {
        throw new ForbiddenException("This ticket type is not publicly available");
      }
      if (!resolvedPassId) {
        const existingPass = await this.db.access_passes.findFirst({
          where: {
            event_id: eventId,
            user_id: userId,
            ticket_type_id: ticketTypeId,
          },
        });
        resolvedPassId = existingPass
          ? existingPass.id
          : (
              await this.db.access_passes.create({
                data: {
                  event_id: eventId,
                  ticket_type_id: ticketTypeId,
                  user_id: userId,
                  source: "PUBLIC",
                  status: "CLAIMED",
                },
              })
            ).id;
      }
    }

    const ticket = await this.issueTicketFromTicketType(eventId, ticketTypeId, userId, {
      source: requiresInvite ? "INVITE" : "FREE",
      accessPassId: resolvedPassId,
    });

    return { ticket, accessPass: { id: resolvedPassId! } };
  }

  /**
   * Paid checkout: create pending order + line item (metadata holds ticket_type_id).
   */
  async createCheckout(
    eventId: string,
    userId: string,
    dto: { ticketTypeId: string; accessPassId?: string; accessCode?: string },
  ) {
    const event = await this.db.events.findUnique({
      where: { id: eventId },
      select: { id: true, entityId: true, registrationAccess: true },
    });
    if (!event) throw new NotFoundException("Event not found");

    const tt = await this.db.ticket_types.findFirst({
      where: { id: dto.ticketTypeId, event_id: eventId },
    });
    if (!tt) throw new NotFoundException("Ticket type not found");

    const price = Number(tt.price ?? 0);
    if (price <= 0) {
      throw new BadRequestException("Use register-free for free tickets");
    }

    const existingTicket = await this.db.tickets.findFirst({
      where: { userId, eventId, status: TicketStatus.ACTIVE },
    });
    if (existingTicket) {
      throw new ConflictException("You already have an active ticket for this event");
    }

    const visibility = (tt.visibility ?? "PUBLIC").toUpperCase();
    const ra = (event.registrationAccess || "").toUpperCase();
    const requiresInviteFromEvent =
      ra === "INVITE_ONLY" || ra === "INVITE";
    const requiresInvite =
      requiresInviteFromEvent ||
      tt.requires_invite === true ||
      visibility === "PRIVATE";

    let accessPassId: string | null = dto.accessPassId ?? null;

    if (requiresInvite) {
      if (!accessPassId && dto.accessCode?.trim()) {
        const byCode = await this.db.access_passes.findFirst({
          where: { event_id: eventId, access_code: dto.accessCode.trim() },
        });
        accessPassId = byCode?.id ?? null;
      }
      if (!accessPassId) {
        throw new ForbiddenException("An invitation is required to purchase this ticket");
      }
      const pass = await this.db.access_passes.findFirst({
        where: { id: accessPassId, event_id: eventId },
      });
      if (!pass) throw new NotFoundException("Access pass not found");
      if (pass.ticket_type_id !== dto.ticketTypeId) {
        throw new BadRequestException("Access pass does not match this ticket type");
      }
      if (pass.access_code) {
        const code = dto.accessCode?.trim();
        if (code && pass.access_code !== code) {
          throw new ForbiddenException("Invalid access code");
        }
        if (!code && pass.user_id !== userId) {
          throw new ForbiddenException("Invalid access code");
        }
      }
      if (pass.user_id && pass.user_id !== userId) {
        throw new ForbiddenException("This invite is for another account");
      }
      accessPassId = pass.id;
    } else if (visibility !== "PUBLIC") {
      throw new ForbiddenException("This ticket type is not publicly available");
    }

    const orderId = randomUUID();
    const itemId = randomUUID();
    const now = new Date();
    const total = new Prisma.Decimal(String(price.toFixed(2)));

    const metadata: Prisma.InputJsonValue = {
      ticketTypeId: tt.id,
      accessPassId: accessPassId ?? undefined,
    };

    await this.db.$transaction([
      this.db.orders.create({
        data: {
          id: orderId,
          userId,
          entityId: event.entityId,
          eventId,
          type: OrderType.TICKET,
          status: OrderStatus.PENDING,
          totalAmount: total,
          currency: tt.currency ?? "USD",
          updatedAt: now,
          metadata: metadata as Prisma.InputJsonValue,
        },
      }),
      this.db.order_items.create({
        data: {
          id: itemId,
          orderId,
          quantity: 1,
          unitPrice: total,
          totalPrice: total,
          name: tt.name,
          description: `Event ticket — ${eventId}`,
          updatedAt: now,
          metadata: metadata as Prisma.InputJsonValue,
        },
      }),
    ]);

    const stripeConfigured = !!this.configService.get<string>("STRIPE_SECRET_KEY");
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") ||
      "http://localhost:5173";

    if (!stripeConfigured) {
      return {
        orderId,
        checkoutUrl: null as string | null,
        clientSecret: null as string | null,
        sessionId: null as string | null,
        placeholder: true,
        devConfirmAvailable: true,
        message:
          "Stripe is not configured. In development only, POST .../orders/:orderId/confirm can simulate payment.",
      };
    }

    const { checkoutUrl, sessionId } =
      await this.paymentsService.createStripeCheckoutSessionForEventOrder(
        orderId,
        userId,
        {
          successUrl: `${frontendUrl}/events/${eventId}?payment=success`,
          cancelUrl: `${frontendUrl}/events/${eventId}?payment=cancel`,
        },
      );

    return {
      orderId,
      checkoutUrl,
      sessionId,
      clientSecret: null as string | null,
      placeholder: false,
    };
  }

  /**
   * Dev / simulation: mark order paid and issue tickets.
   */
  /**
   * Dev / staging only: simulated payment. Blocked in production unless explicitly enabled.
   */
  async confirmOrderPlaceholder(eventId: string, userId: string, orderId: string) {
    if (
      process.env.NODE_ENV === "production" &&
      this.configService.get<string>("ALLOW_DEV_ORDER_CONFIRM") !== "true"
    ) {
      throw new ForbiddenException(
        "Simulated payment confirmation is disabled in production. Complete checkout via Stripe.",
      );
    }

    const order = await this.db.orders.findFirst({
      where: { id: orderId, eventId, userId },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status === OrderStatus.COMPLETED) {
      return this.finalizePaidOrder(orderId, { simulated: true });
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("Order cannot be confirmed");
    }

    await this.db.orders.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        updatedAt: new Date(),
      },
    });

    if (!(await this.db.payments.findFirst({ where: { orderId } }))) {
      await this.db.payments.create({
        data: {
          id: randomUUID(),
          orderId,
          amount: order.totalAmount,
          currency: order.currency,
          status: "succeeded",
          paymentMethod: PaymentMethod.STRIPE,
          updatedAt: new Date(),
          metadata: { simulated: true } as Prisma.InputJsonValue,
        },
      });
    }

    return this.finalizePaidOrder(orderId, { simulated: true });
  }

  /**
   * After payment succeeds: create tickets from order_items, escrow ledger.
   * Idempotent if tickets already exist for order.
   */
  async finalizePaidOrder(
    orderId: string,
    opts?: { simulated?: boolean; stripePaymentIntentId?: string },
  ) {
    const order = await this.db.orders.findUnique({
      where: { id: orderId },
    });
    if (!order || order.type !== OrderType.TICKET || !order.eventId) {
      return { completed: false, reason: "not_ticket_order" as const };
    }

    const existingTicket = await this.db.tickets.findFirst({
      where: { orderId },
    });
    if (existingTicket) {
      return { completed: true, idempotent: true };
    }

    if (order.status !== OrderStatus.COMPLETED) {
      return { completed: false, reason: "order_not_completed" as const };
    }

    const items = await this.db.order_items.findMany({
      where: { orderId },
    });

    const userId = order.userId;
    const eventId = order.eventId;

    const orderMeta = (order.metadata as Prisma.JsonObject | null) ?? {};
    const accessPassFromOrder =
      (orderMeta.accessPassId as string | undefined) ?? null;

    for (const item of items) {
      const meta = (item.metadata as Prisma.JsonObject | null) ?? {};
      const ticketTypeId =
        (meta.ticketTypeId as string) ||
        (meta.ticket_type_id as string);

      if (!ticketTypeId) continue;

      const accessPassId =
        (meta.accessPassId as string | undefined) ?? accessPassFromOrder ?? null;

      await this.issueTicketFromTicketType(eventId, ticketTypeId, userId, {
        source: "PAID",
        orderId,
        accessPassId: accessPassId ?? null,
      });
      break;
    }

    const amount = Number(order.totalAmount ?? 0);
    if (amount > 0) {
      await this.escrowService.createLedgerEntry(eventId, orderId, amount);
    }

    return { completed: true };
  }
}
