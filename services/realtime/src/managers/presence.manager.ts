/**
 * Per-event presence: tracks socket IDs in a single event session.
 * Used by EventEngine for "who's in this event" and viewer count.
 */
export class PresenceManager {
  private readonly socketIds = new Set<string>();

  constructor(private readonly eventId: string) {}

  getEventId(): string {
    return this.eventId;
  }

  join(socketId: string): void {
    this.socketIds.add(socketId);
  }

  leave(socketId: string): void {
    this.socketIds.delete(socketId);
  }

  getCount(): number {
    return this.socketIds.size;
  }

  getSocketIds(): string[] {
    return [...this.socketIds];
  }

  has(socketId: string): boolean {
    return this.socketIds.has(socketId);
  }
}
