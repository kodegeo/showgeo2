import type { Server } from "socket.io";

const ROOM_PREFIX = "event_";

/**
 * Manages signaling (e.g. WebRTC, stream control) for a single event session.
 * Placeholder for future stream/webrtc signaling.
 */
export class SignalManager {
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

  /** Emit a signal to the event room. Extend for specific signal types. */
  emit(socketId: string, event: string, payload: Record<string, unknown>): void {
    this.io.to(this.room).emit(event, { socketId, ...payload });
  }
}
