import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  PrismaService,
  asPrismaDb,
} from "../../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { NotificationGateway } from "../notifications/notifications.gateway";
import { randomUUID } from "crypto";

/**
 * Persists user-to-user messages, links notifications.message_id, and triggers SendGrid email.
 */
@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Insert message → notification (MESSAGE, message_id) → email to recipient (resolved from app_users).
   */
  async sendMessage(params: {
    senderId: string;
    recipientId: string;
    content: string;
  }): Promise<{ id: string; senderId: string; recipientId: string; content: string; createdAt: Date }> {
    const { senderId, recipientId, content } = params;
    this.logger.log("Sending message", { senderId, recipientId });

    const recipient = await asPrismaDb(this.prisma).app_users.findUnique({
      where: { id: recipientId },
      select: { id: true, email: true },
    });
    if (!recipient) {
      throw new NotFoundException("Recipient user not found");
    }

    const db = asPrismaDb(this.prisma);

    const message = await db.messages.create({
      data: {
        senderId,
        recipientId,
        content,
      },
    });

    const notification = await db.notifications.create({
      data: {
        id: randomUUID(),
        userId: recipientId,
        entityId: null,
        type: "MESSAGE",
        message: content,
        metadata: {} as Prisma.InputJsonValue,
        isRead: false,
        updatedAt: new Date(),
        messageId: message.id,
      } as unknown as Prisma.notificationsUncheckedCreateInput,
    });

    try {
      this.notificationGateway.notifyUser(recipientId, notification as any);
    } catch (e) {
      this.logger.warn("notifyUser failed (non-blocking)", e);
    }

    await this.emailService.sendEmail({
      to: recipient.email,
      subject: "New message on Showgeo",
      text: content,
    });

    return message;
  }

  /** Rows for GET /mailbox merge (recipient inbox). */
  async findInboxForUser(recipientId: string): Promise<
    Array<{
      id: string;
      content: string;
      createdAt: Date;
      senderId: string;
      isRead: boolean;
      type?: string | null;
      eventId?: string | null;
      ticketId?: string | null;
      ctaUrl?: string | null;
    }>
  > {
    const rows = await asPrismaDb(this.prisma).messages.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
        type: true,
        eventId: true,
        ticketId: true,
        ctaUrl: true,
      },
    });

    if (rows.length === 0) return [];

    const notifications = await asPrismaDb(this.prisma).notifications.findMany({
      where: {
        userId: recipientId,
        messageId: { in: rows.map((r) => r.id) },
      },
      select: {
        messageId: true,
        isRead: true,
      },
    });

    const readByMessageId = new Map<string, boolean>();
    for (const n of notifications) {
      if (n.messageId) {
        readByMessageId.set(n.messageId, n.isRead);
      }
    }

    return rows.map((row) => ({
      ...row,
      isRead: readByMessageId.get(row.id) ?? false,
    }));
  }

  /**
   * System inbox message for ticket confirmation. Deduped per eventId + recipientId.
   * Uses senderId = event owner (falls back to recipientId for self-sent system msgs).
   */
  async sendTicketConfirmedMessage(params: {
    recipientId: string;
    senderId: string;
    eventId: string;
    eventTitle: string;
    startTime: Date;
    registrationId: string;
  }): Promise<void> {
    const { recipientId, senderId, eventId, eventTitle, startTime, registrationId } = params;
    const db = asPrismaDb(this.prisma);

    const existing = await db.messages.findFirst({
      where: { recipientId, eventId, type: "SYSTEM" },
      select: { id: true },
    });
    if (existing) return;

    const formattedDate = startTime.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const content = [
      `🎟 Ticket Confirmed: ${eventTitle}`,
      ``,
      `${eventTitle} starts on ${formattedDate}.`,
      ``,
      `Return to the event page at the scheduled time to join.`,
    ].join("\n");

    const message = await db.messages.create({
      data: {
        senderId,
        recipientId,
        type: "SYSTEM",
        eventId,
        ctaUrl: `/events/${eventId}`,
        content,
      },
    });

    try {
      const notification = await db.notifications.create({
        data: {
          id: randomUUID(),
          userId: recipientId,
          entityId: null,
          type: "MESSAGE",
          message: `🎟 Ticket Confirmed: ${eventTitle}`,
          metadata: {
            eventId,
            registrationId,
            messageType: "TICKET_CONFIRMED",
          } as Prisma.InputJsonValue,
          isRead: false,
          updatedAt: new Date(),
          messageId: message.id,
        } as unknown as Prisma.notificationsUncheckedCreateInput,
      });
      this.notificationGateway.notifyUser(recipientId, notification as any);
    } catch (e) {
      this.logger.warn("sendTicketConfirmedMessage: notification failed (non-blocking)", e);
    }
  }

  /** Rows for sender-side mailbox "sent" audit trail. */
  async findSentForUser(senderId: string): Promise<
    Array<{
      id: string;
      content: string;
      createdAt: Date;
      recipientId: string;
      type?: string | null;
      eventId?: string | null;
      ticketId?: string | null;
      ctaUrl?: string | null;
    }>
  > {
    return asPrismaDb(this.prisma).messages.findMany({
      where: { senderId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        recipientId: true,
        type: true,
        eventId: true,
        ticketId: true,
        ctaUrl: true,
      },
    });
  }
}
