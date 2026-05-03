import { Injectable } from "@nestjs/common";
import { PrismaService, asPrismaDb } from "../../prisma/prisma.service";
import { EventPhase, EventStatus } from "@prisma/client";
import { TicketStatus } from "../../shared/types/ticket.types";

export interface MyTicketItem {
  id: string;
  eventId: string;
  eventName: string;
  entityName: string;
  startTime: string;
  thumbnail: string | null;
  ticketType: string;
  orderId: string | null;
}

/** Row for GET /me/tickets — `access_passes` scoped to the user plus event summary */
export interface MyAccessPassTicketItem {
  accessPassId: string;
  eventId: string;
  eventTitle: string;
  startTime: string;
  status: "UPCOMING" | "LIVE" | "ENDED";
}

function displayStatusForEvent(ev: {
  status: EventStatus;
  phase: EventPhase;
  startTime: Date;
  endTime: Date | null;
}): "UPCOMING" | "LIVE" | "ENDED" {
  if (ev.status === EventStatus.LIVE || ev.phase === EventPhase.LIVE) {
    return "LIVE";
  }
  if (
    ev.status === EventStatus.COMPLETED ||
    ev.status === EventStatus.CANCELLED ||
    ev.phase === EventPhase.POST_LIVE
  ) {
    return "ENDED";
  }
  const now = Date.now();
  if (ev.endTime && ev.endTime.getTime() < now) {
    return "ENDED";
  }
  return "UPCOMING";
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  private get ext() {
    return asPrismaDb(this.prisma);
  }

  async getMyTickets(userId: string): Promise<{ tickets: MyTicketItem[] }> {
    const rows = await this.prisma.tickets.findMany({
      where: {
        userId,
        status: TicketStatus.ACTIVE,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startTime: true,
            thumbnail: true,
            entity: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [{ event: { startTime: "asc" } }],
    });

    const tickets: MyTicketItem[] = rows.map((t) => ({
      id: t.id,
      eventId: t.eventId,
      eventName: t.event.name,
      entityName: t.event.entity?.name ?? "Event",
      startTime: t.event.startTime.toISOString(),
      thumbnail: t.event.thumbnail,
      ticketType: t.type,
      orderId: t.orderId,
    }));

    return { tickets };
  }

  /**
   * Access passes assigned to the user (`user_id`), joined to `events` for wallet / inbox.
   * Prisma `access_passes` has no `events` relation — load events in a second query.
   */
  async getMyAccessPassesWithEvents(
    userId: string,
  ): Promise<{ tickets: MyAccessPassTicketItem[] }> {
    const passes = await this.ext.access_passes.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
    if (passes.length === 0) {
      return { tickets: [] };
    }
    const eventIds: string[] = Array.from(
      new Set((passes as Array<{ event_id: string }>).map((p) => p.event_id)),
    );
    const events = await this.prisma.events.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        status: true,
        phase: true,
      },
    });
    const byId = new Map(events.map((e) => [e.id, e]));
    const tickets: MyAccessPassTicketItem[] = [];
    for (const p of passes) {
      const ev = byId.get(p.event_id);
      if (!ev) continue;
      tickets.push({
        accessPassId: p.id,
        eventId: p.event_id,
        eventTitle: ev.name,
        startTime: ev.startTime.toISOString(),
        status: displayStatusForEvent(ev),
      });
    }
    return { tickets };
  }
}
