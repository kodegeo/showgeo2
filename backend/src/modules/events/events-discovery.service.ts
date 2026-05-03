import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventPhase } from "@prisma/client";

const SECTION_LIMIT = 20;

const eventInclude = {
  entity: {
    select: {
      id: true,
      name: true,
      slug: true,
      thumbnail: true,
      type: true,
      isVerified: true,
    },
  },
  tour: {
    select: {
      id: true,
      name: true,
      slug: true,
      thumbnail: true,
    },
  },
  _count: {
    select: {
      tickets: true,
    },
  },
};

export interface DiscoveryResponse {
  live_now: any[];
  trending: any[];
  following: any[];
  nearby: any[];
}

/**
 * Event discovery: LIVE_NOW, TRENDING, FOLLOWING, NEARBY.
 * Uses existing tables only; no schema changes.
 */
@Injectable()
export class EventsDiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  private get p(): any {
    return this.prisma as any;
  }

  async getDiscovery(userId?: string | null, region?: string | null): Promise<DiscoveryResponse> {
    const [live_now, trending, following, nearby] = await Promise.all([
      this.getLiveNow(),
      this.getTrending(),
      this.getFollowing(userId ?? undefined),
      this.getNearby(region ?? undefined),
    ]);

    return {
      live_now,
      trending,
      following,
      nearby,
    };
  }

  /**
   * Events that have an active streaming session (streaming_sessions.active = true).
   */
  private async getLiveNow(): Promise<any[]> {
    const sessions = await this.p.streaming_sessions?.findMany?.({
      where: { active: true },
      select: { eventId: true },
      take: SECTION_LIMIT,
    });
    if (!sessions?.length) return [];

    const eventIds = [...new Set((sessions as { eventId: string }[]).map((s) => s.eventId))].slice(
      0,
      SECTION_LIMIT,
    ) as string[];
    const events = await this.prisma.events.findMany({
      where: {
        id: { in: eventIds },
        status: { not: "CANCELLED" },
      },
      take: SECTION_LIMIT,
      include: eventInclude,
    });
    return events;
  }

  /**
   * Events ranked by recent registrations and activity (event_registrations count).
   */
  private async getTrending(): Promise<any[]> {
    const recent = await this.p.event_registrations?.findMany?.({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
      select: { eventId: true },
    });
    if (!recent?.length) {
      return this.prisma.events.findMany({
        where: {
          status: { in: ["SCHEDULED", "LIVE"] },
          startTime: { gte: new Date() },
        },
        orderBy: { startTime: "asc" },
        take: SECTION_LIMIT,
        include: eventInclude,
      });
    }

    const countByEvent = new Map<string, number>();
    for (const r of recent as { eventId: string }[]) {
      countByEvent.set(r.eventId, (countByEvent.get(r.eventId) ?? 0) + 1);
    }
    const sortedIds = [...countByEvent.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, SECTION_LIMIT);

    if (sortedIds.length === 0) return [];

    const events = await this.prisma.events.findMany({
      where: { id: { in: sortedIds }, status: { not: "CANCELLED" } },
      take: SECTION_LIMIT,
      include: eventInclude,
    });
    const orderMap = new Map(sortedIds.map((id, i) => [id, i]));
    return events.sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));
  }

  /**
   * Events from entities the user follows (upcoming or live).
   */
  private async getFollowing(userId?: string): Promise<any[]> {
    if (!userId) return [];

    const follows = await this.p.follows?.findMany?.({
      where: { userId, targetType: "ENTITY" },
      select: { targetId: true },
    });
    if (!follows?.length) return [];

    const entityIds = (follows as { targetId: string }[]).map((f) => f.targetId).filter(Boolean);
    const now = new Date();
    return this.prisma.events.findMany({
      where: {
        entityId: { in: entityIds },
        status: { not: "CANCELLED" },
        OR: [{ startTime: { gte: now } }, { phase: EventPhase.LIVE }],
      },
      orderBy: { startTime: "asc" },
      take: SECTION_LIMIT,
      include: eventInclude,
    });
  }

  /**
   * Events within the user's region (events.geoRegions overlaps region, or events with geofencing).
   */
  private async getNearby(region?: string): Promise<any[]> {
    const now = new Date();
    const where: any = {
      status: { in: ["SCHEDULED", "LIVE"] },
      startTime: { gte: now },
    };
    if (region?.trim()) {
      where.geoRegions = { has: region.trim() };
    } else {
      where.OR = [
        { geoRegions: { isEmpty: false } },
        { location: { not: null } },
      ];
    }

    const events = await this.prisma.events.findMany({
      where,
      orderBy: { startTime: "asc" },
      take: SECTION_LIMIT,
      include: eventInclude,
    });
    return events;
  }
}
