import type { Server } from "socket.io";
import type { EngineManager } from "../engines/engine-manager.js";

/**
 * Lobby gateway: join_event_lobby, send_message, disconnect.
 * Routes to EventEngine via EngineManager; preserves existing socket message types.
 */
export function registerLobbyGateway(io: Server, engineManager: EngineManager): void {
  io.on("connection", (socket) => {
    socket.on("join_event_lobby", (eventId: string) => {
      const engine = engineManager.getOrCreateEngine(eventId);
      engine.join(socket);
      engineManager.trackSocketInEvent(socket.id, eventId);
    });

    socket.on("send_message", (payload: { eventId: string; [key: string]: unknown }) => {
      const engine = engineManager.getOrCreateEngine(payload.eventId);
      engine.handleSendMessage(payload);
    });

    socket.on("disconnect", () => {
      engineManager.onSocketDisconnect(socket.id);
    });
  });
}
