import type { Server } from "socket.io";
import type { EngineManager } from "../engines/engine-manager.js";

/**
 * Stream gateway: placeholder for stream-related realtime features
 * (e.g. live stream state, quality, viewer sync).
 * Routes to EventEngine when handlers are added.
 */
export function registerStreamGateway(_io: Server, _engineManager: EngineManager): void {
  // Optional: register stream handlers that delegate to engineManager.getOrCreateEngine(eventId)
}
