import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { FansResponseDto, RankingsResponseDto } from "./dto";

@Injectable()
export class FanInteractionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get aggregated fans (presence) for an event. Realtime service writes to fan_presence.
   */
  async getFansForEvent(eventId: string): Promise<FansResponseDto> {
    await this.assertEventExists(eventId);
    const rows = await (this.prisma as any).fan_presence.findMany({
      where: { event_id: eventId },
      orderBy: { last_active_at: "desc" },
      take: 500,
    });
    const fans = (rows ?? []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      role: r.role ?? "VIEWER",
      joinedAt: r.joined_at?.toISOString?.(),
      lastActiveAt: r.last_active_at?.toISOString?.(),
    }));
    return {
      eventId,
      fans,
      total: fans.length,
    };
  }

  /**
   * Get fan rankings for an event. Realtime service writes to fan_rankings.
   */
  async getRankingsForEvent(eventId: string): Promise<RankingsResponseDto> {
    await this.assertEventExists(eventId);
    const rows = await (this.prisma as any).fan_rankings.findMany({
      where: { event_id: eventId },
      orderBy: [{ rank: "asc" }, { updated_at: "desc" }],
      take: 100,
    });
    const rankings = (rows ?? []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      rank: r.rank ?? 0,
      engagementScore: r.engagement_score != null ? Number(r.engagement_score) : undefined,
      updatedAt: r.updated_at?.toISOString?.(),
    }));
    return {
      eventId,
      rankings,
    };
  }

  private async assertEventExists(eventId: string): Promise<void> {
    const event = await (this.prisma as any).events.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
  }
}
