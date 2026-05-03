import type { Server } from "socket.io";
import { EventEngine } from "./event-engine.js";

/**
 * Manages active EventEngine instances per event.
 * Gateways use this to get or create an engine and to notify on disconnect.
 */
export class EngineManager {
  private readonly engines = new Map<string, EventEngine>();
  private readonly socketToEventIds = new Map<string, Set<string>>();

  constructor(private readonly io: Server) {}

  /**
   * Get or create an EventEngine for the given event.
   */
  getOrCreateEngine(eventId: string): EventEngine {
    let engine = this.engines.get(eventId);
    if (!engine) {
      engine = new EventEngine(eventId, this.io);
      this.engines.set(eventId, engine);
    }
    return engine;
  }

  /**
   * Record that a socket is in an event (for disconnect routing).
   */
  trackSocketInEvent(socketId: string, eventId: string): void {
    const set = this.socketToEventIds.get(socketId) ?? new Set<string>();
    set.add(eventId);
    this.socketToEventIds.set(socketId, set);
  }

  /**
   * Called when a socket disconnects: leave from all engines it was in.
   */
  onSocketDisconnect(socketId: string): void {
    const eventIds = this.socketToEventIds.get(socketId);
    if (eventIds) {
      for (const eventId of eventIds) {
        const engine = this.engines.get(eventId);
        if (engine) engine.leave(socketId);
      }
      this.socketToEventIds.delete(socketId);
    }
  }

  /**
   * Get engine for an event if it exists (e.g. for send_message without prior join).
   */
  getEngine(eventId: string): EventEngine | undefined {
    return this.engines.get(eventId);
  }
}
