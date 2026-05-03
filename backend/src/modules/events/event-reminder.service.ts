import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { NotificationType } from "@prisma/client";

const REMINDER_1H = "1h";
const REMINDER_15M = "15m";
const MS_1H = 60 * 60 * 1000;
const MS_15M = 15 * 60 * 1000;

@Injectable()
export class EventReminderService {
  private readonly logger = new Logger(EventReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get p(): any {
    return this.prisma as any;
  }

  /**
   * Run every 5 minutes: find events starting in 1h or 15m, send reminders to ticket holders.
   */
  @Cron("*/5 * * * *")
  async runReminders(): Promise<void> {
    this.logger.log("Event reminder job started");
    try {
      await this.sendRemindersForWindow(MS_1H, REMINDER_1H, "1 hour");
      await this.sendRemindersForWindow(MS_15M, REMINDER_15M, "15 minutes");
    } catch (err) {
      this.logger.error("Event reminder job failed", err);
    }
    this.logger.log("Event reminder job finished");
  }

  /**
   * Find events whose startTime is within [now, now + windowMs]. Send reminders to:
   * - ticket holders (ACTIVE tickets with userId)
   * - registered users (event_registrations REGISTERED with userId), even if they have no ticket yet.
   * No duplicate sends per user per event per window.
   */
  private async sendRemindersForWindow(
    windowMs: number,
    reminderIn: string,
    label: string,
  ): Promise<void> {
    const now = new Date();
    const end = new Date(now.getTime() + windowMs);

    const events = await this.p.events.findMany({
      where: {
        startTime: {
          gte: now,
          lte: end,
        },
      },
      select: {
        id: true,
        name: true,
        startTime: true,
      },
    });

    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      const [tickets, registrations] = await Promise.all([
        this.p.tickets.findMany({
          where: {
            eventId: event.id,
            status: "ACTIVE",
            userId: { not: null },
          },
          select: { id: true, userId: true },
        }),
        this.p.event_registrations.findMany({
          where: {
            eventId: event.id,
            status: "REGISTERED",
            userId: { not: null },
          },
          select: { id: true, userId: true },
        }),
      ]);

      const userIdToTicketId = new Map<string, string>();
      tickets.forEach((t) => {
        if (t.userId) userIdToTicketId.set(t.userId, t.id);
      });
      const recipientIds = new Set<string>([
        ...tickets.map((t) => t.userId).filter(Boolean) as string[],
        ...registrations.map((r) => r.userId).filter(Boolean) as string[],
      ]);

      const sentUserIds = await this.getUsersAlreadySent(
        event.id,
        reminderIn,
        Array.from(recipientIds),
      );

      for (const userId of recipientIds) {
        if (sentUserIds.has(userId)) continue;
        try {
          await this.sendReminder(
            userId,
            event,
            reminderIn,
            label,
            userIdToTicketId.get(userId) ?? null,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to send ${label} reminder to user ${userId} for event ${event.id}`,
            err,
          );
        }
      }
    }
  }

  private async getUsersAlreadySent(
    eventId: string,
    reminderIn: string,
    userIds: string[],
  ): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();

    const items = await this.p.mailbox_items.findMany({
      where: {
        type: "NOTIFICATION",
        userId: { in: userIds },
      },
      select: { userId: true, metadata: true },
    });

    const set = new Set<string>();
    for (const item of items) {
      const meta = item.metadata as { eventId?: string; reminderIn?: string } | null;
      if (meta?.eventId === eventId && meta?.reminderIn === reminderIn && item.userId) {
        set.add(item.userId);
      }
    }
    return set;
  }

  private async sendReminder(
    userId: string,
    event: { id: string; name: string; startTime: Date },
    reminderIn: string,
    label: string,
    ticketId: string | null,
  ): Promise<void> {
    const message = `Your event '${event.name}' starts in ${label}.`;
    const title = `Reminder: ${event.name} in ${label}`;
    const metadata: Prisma.InputJsonValue = {
      eventId: event.id,
      eventName: event.name,
      reminderIn,
      ...(ticketId ? { ticketId } : {}),
      startTime: event.startTime.toISOString(),
    };

    await this.p.mailbox_items.create({
      data: {
        id: randomUUID(),
        userId,
        email: null,
        type: "NOTIFICATION",
        title,
        message,
        metadata,
        isRead: false,
        registrationId: null,
      },
    });

    await this.p.notifications.create({
      data: {
        id: randomUUID(),
        userId,
        entityId: null,
        type: NotificationType.EVENT_UPDATED,
        message,
        metadata,
        isRead: false,
      },
    });
  }
}
