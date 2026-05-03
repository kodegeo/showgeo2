import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { EnergyResponseDto, HighlightsResponseDto } from "./dto";

@Injectable()
export class EngagementEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get crowd energy snapshots for an event. Realtime service writes to crowd_energy_snapshots.
   */
  async getEnergyForEvent(eventId: string): Promise<EnergyResponseDto> {
    await this.assertEventExists(eventId);
    const rows = await (this.prisma as any).crowd_energy_snapshots.findMany({
      where: { event_id: eventId },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    const snapshots = (rows ?? []).map((r: any) => ({
      id: r.id,
      windowStart: r.window_start?.toISOString?.(),
      windowEnd: r.window_end?.toISOString?.(),
      reactionVelocity: r.reaction_velocity != null ? Number(r.reaction_velocity) : undefined,
      chatVelocity: r.chat_velocity != null ? Number(r.chat_velocity) : undefined,
      activeViewers: r.active_viewers ?? undefined,
      energyScore: r.energy_score != null ? Number(r.energy_score) : undefined,
      createdAt: r.created_at?.toISOString?.(),
    }));
    const latestEnergyScore = snapshots[0]?.energyScore;
    return {
      eventId,
      snapshots,
      latestEnergyScore,
    };
  }

  /**
   * Get highlight moments for an event. Realtime service writes to highlight_moments.
   */
  async getHighlightsForEvent(eventId: string): Promise<HighlightsResponseDto> {
    await this.assertEventExists(eventId);
    const rows = await (this.prisma as any).highlight_moments.findMany({
      where: { event_id: eventId },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    const highlights = (rows ?? []).map((r: any) => ({
      id: r.id,
      streamSessionId: r.stream_session_id ?? undefined,
      startTime: r.start_time ?? undefined,
      duration: r.duration ?? undefined,
      energyScore: r.energy_score != null ? Number(r.energy_score) : undefined,
      createdAt: r.created_at?.toISOString?.(),
    }));
    return {
      eventId,
      highlights,
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
