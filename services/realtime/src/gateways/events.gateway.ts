import type { Server } from "socket.io";
import type { EngineManager } from "../engines/engine-manager.js";

/**
 * Event-scoped gateway: placeholder for future event-level realtime features
 * (e.g. live reactions, viewer count, phase changes).
 * Routes to EventEngine when handlers are added.
 */
export function registerEventsGateway(_io: Server, _engineManager: EngineManager): void {
  // Optional: register event-level handlers that delegate to engineManager.getOrCreateEngine(eventId)
}
