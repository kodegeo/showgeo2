import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { SendInvitationsDto, RegisterDto, ValidateTicketDto } from "./dto";
import { EmailService } from "../email/email.service";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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
      const existing = await this.p.event_registrations.findUnique({
        where: { accessCode: code },
      });

      if (!existing) {
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
   * Send invitations to a guest list
   * Creates EventRegistration records with status = INVITED
   * Generates accessCode for guest users (emails without userId)
   */
  async sendInvitations(
    eventId: string,
    dto: SendInvitationsDto,
    invitedBy: string,
  ): Promise<{ created: number; skipped: number }> {
    // Validate event exists
    const event = await this.p.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    let created = 0;
    let skipped = 0;

    for (const invitee of dto.invitees) {
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

      // Generate accessCode for guest users (email without userId)
      const accessCode = !invitee.userId ? await this.ensureUniqueAccessCode() : null;

      // Create registration
      await this.p.event_registrations.create({
        data: {
          id: randomUUID(),
          eventId,
          userId: invitee.userId || null,
          email: invitee.email || null,
          accessCode,
          status: "INVITED",
          invitedBy,
          invitedAt: new Date(),
        },
      });

      // Store invitation in mailbox
      await this.addToMailbox({
        userId: invitee.userId || null,
        email: invitee.email || null,
        type: "INVITATION",
        title: `You're invited to ${event.name}`,
        message: dto.message || `You've been invited to attend ${event.name}. Click to register.`,
        metadata: {
          eventId,
          eventName: event.name,
          registrationId: null, // Will be set after registration
        },
      });

      created++;
    }

    return { created, skipped };
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

    // 3. Create new FREE ticket
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
        // Generate entryCode if event requires it
        entryCode: event.entryCodeRequired ? await this.ensureUniqueAccessCode() : null,
      },
    });

    return ticket;
  }

  /**
   * Register a guest for an event
   * Updates EventRegistration → REGISTERED
   * Auto-issues a FREE ticket via ensureFreeTicket()
   * Associates ticket with userId OR email
   */
  async register(
    eventId: string,
    dto: RegisterDto,
    userId?: string,
  ): Promise<{ registration: any; ticket: any }> {
    // Validate event exists
    const event = await this.p.events.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Find existing registration
    let registration = null;

    if (dto.registrationId) {
      registration = await this.p.event_registrations.findUnique({
        where: { id: dto.registrationId },
      });
    } else if (dto.accessCode) {
      registration = await this.p.event_registrations.findFirst({
        where: {
          eventId,
          accessCode: dto.accessCode,
        },
      });
    } else if (userId) {
      registration = await this.p.event_registrations.findFirst({
        where: {
          eventId,
          userId,
        },
      });
    } else if (dto.email) {
      registration = await this.p.event_registrations.findFirst({
        where: {
          eventId,
          email: dto.email,
        },
      });
    }

    if (!registration) {
      throw new NotFoundException("Registration not found. Please request an invitation first.");
    }

    if (registration.status === "REGISTERED") {
      throw new BadRequestException("Already registered for this event");
    }

    if (registration.status === "CANCELLED") {
      throw new BadRequestException("Registration was cancelled");
    }

    // Update registration status
    const updatedRegistration = await this.p.event_registrations.update({
      where: { id: registration.id },
      data: {
        status: "REGISTERED",
        registeredAt: new Date(),
        userId: userId || registration.userId,
        email: dto.email || registration.email,
      },
    });

    // Auto-issue FREE ticket (idempotent - won't create duplicate)
    const ticket = await this.ensureFreeTicket({
      eventId,
      userId: updatedRegistration.userId || null,
      email: updatedRegistration.email || null,
      registrationId: updatedRegistration.id,
    });

    // Store ticket in mailbox
    // Check if mailbox item already exists for this registration to avoid duplicates
    const existingMailboxItem = await this.p.mailbox_items.findFirst({
      where: {
        registrationId: updatedRegistration.id,
        type: "TICKET",
      },
    });

    if (!existingMailboxItem) {
      await this.addToMailbox({
        userId: updatedRegistration.userId || null,
        email: updatedRegistration.email || null,
        type: "TICKET",
        title: `Your ticket for ${event.name}`,
        message: `You're registered for ${event.name}! Your ticket is ready.`,
        metadata: {
          eventId,
          eventName: event.name,
          ticketId: ticket.id,
          entryCode: ticket.entryCode,
          registrationId: updatedRegistration.id,
        },
        registrationId: updatedRegistration.id,
      });
    }

    // TODO: Send ticket via email
    // When email service is implemented, send ticket confirmation email here
    // For now, ticket is only stored in mailbox

    return {
      registration: updatedRegistration,
      ticket,
    };
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
      // Filter by eventId through registration relationship
      const registrations = await this.p.event_registrations.findMany({
        where: { eventId },
        select: { id: true },
      });
      const registrationIds = registrations.map((r) => r.id);
      
      if (registrationIds.length > 0) {
        mailboxWhere.registrationId = {
          in: registrationIds,
        };
      } else {
        // No registrations for this event, skip mailbox_items
        mailboxWhere.registrationId = { in: [] };
      }
    }

    const mailboxItems = await this.p.mailbox_items.findMany({
      where: mailboxWhere,
      orderBy: { createdAt: "desc" },
    });

    // Mark mailbox_items as system messages (audit/internal)
    const systemMessages = mailboxItems.map((item: any) => ({
      ...item,
      _messageClassification: "system_message" as const,
    }));

    // Get audience_messages (user messages from creators)
    const audienceWhere: any = {
      recipientUserId: userId,
    };

    if (eventId) {
      audienceWhere.eventId = eventId;
    }

    const audienceMessages = await (this.p as any).audience_messages.findMany({
      where: audienceWhere,
      orderBy: { createdAt: "desc" },
      include: {
        events: {
          select: {
            id: true,
            name: true,
          },
        },
        entities: {
          select: {
            id: true,
            name: true,
          },
        },
        app_users_sender: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Transform audience_messages to match mailbox format
    const transformedAudienceMessages = audienceMessages.map((msg: any) => ({
      id: msg.id,
      type: "AUDIENCE_MESSAGE" as const,
      title: msg.title,
      message: msg.message,
      metadata: {
        eventId: msg.eventId,
        eventName: msg.events?.name,
        entityId: msg.entityId,
        entityName: msg.entities?.name,
        senderId: msg.senderId,
        channel: msg.channel,
      },
      isRead: msg.readAt !== null,
      createdAt: msg.createdAt,
      updatedAt: msg.createdAt,
      // Mark as audience message for frontend
      _isAudienceMessage: true,
      _messageClassification: "audience_message" as const,
      _senderEntityName: msg.entities?.name,
    }));

    // Combine and sort by createdAt descending
    const allItems = [...systemMessages, ...transformedAudienceMessages];
    return allItems.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
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
        include: {
          events: true,
          registrations: true,
        },
      });
    } else if (dto.accessCode) {
      // Check both ticket.entryCode and registration.accessCode
      ticket = await this.p.tickets.findFirst({
        where: {
          OR: [
            { entryCode: dto.accessCode },
            {
              registrations: {
                accessCode: dto.accessCode,
              },
            },
          ],
          eventId,
        },
        include: {
          events: true,
          registrations: true,
        },
      });
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

      // 2. Fetch all ACTIVE tickets (including those without registrations)
      const tickets = await this.p.tickets.findMany({
        where: {
          eventId,
          status: "ACTIVE",
        },
        include: {
          registrations: true,
        },
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

      // Add recipients from registrations
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
        where: {
          eventId,
          status: "ACTIVE",
          joinedAt: null, // Exclude users who already joined
        },
        include: {
          registrations: true,
        },
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

      // Add recipients from registrations (only if they haven't joined via ticket)
      for (const registration of registrations) {
        // Check if user already joined via ticket
        const hasJoinedTicket = tickets.some(
          (t) =>
            t.registrationId === registration.id ||
            (t.userId && t.userId === registration.userId),
        );

        // Skip if user already joined (tracked via ticket.joinedAt)
        // We check tickets above already filter by joinedAt: null, so we can proceed
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

