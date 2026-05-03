import type { Server } from "socket.io";

const ROOM_PREFIX = "event_";

/**
 * Manages live reactions (e.g. emoji, cheers) for a single event session.
 * Placeholder for future reaction aggregation and broadcast.
 */
export class ReactionManager {
  constructor(
    private readonly eventId: string,
    private readonly io: Server,
  ) {}

  private get room(): string {
    return `${ROOM_PREFIX}${this.eventId}`;
  }

  getEventId(): string {
    return this.eventId;
  }

  /** Record and/or broadcast a reaction. Extend for aggregation. */
  broadcastReaction(payload: { eventId: string; [key: string]: unknown }): void {
    this.io.to(this.room).emit("reaction", payload);
  }
}
