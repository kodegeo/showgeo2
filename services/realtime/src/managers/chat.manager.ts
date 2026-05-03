import type { Server } from "socket.io";

const ROOM_PREFIX = "event_";

/**
 * Manages chat messages for a single event session.
 * Broadcasts messages to the event room.
 */
export class ChatManager {
  constructor(
    private readonly eventId: string,
    private readonly io: Server,
  ) {}

  private get room(): string {
    return `${ROOM_PREFIX}${this.eventId}`;
  }

  /**
   * Broadcast a message to all sockets in this event's room.
   * Payload must include eventId; other fields are forwarded as-is.
   */
  broadcastMessage(payload: { eventId: string; [key: string]: unknown }): void {
    this.io.to(this.room).emit("message", payload);
  }
}
