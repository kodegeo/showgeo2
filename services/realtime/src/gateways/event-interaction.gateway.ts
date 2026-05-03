import { randomUUID } from "crypto";
import type { Server, Socket } from "socket.io";
import type { EngineManager } from "../engines/engine-manager.js";
import { roomNames } from "../utils/room-names.js";
import { ROLE_SUBSCRIPTIONS, type RealtimeRole, type ChatMessageEvent } from "../types/realtime.js";

// Per-socket typing cooldown: prevents flooding the typing topic.
// Each socket may only emit one typing signal per TYPING_SAMPLE_INTERVAL_MS per event.
const TYPING_SAMPLE_MS = 2_000;
const socketTypingTimestamps = new Map<string, Map<string, number>>();

export function registerEventInteractionGateway(io: Server, engineManager: EngineManager): void {
  io.on("connection", (socket: Socket) => {

    // ── event:join ────────────────────────────────────────────────────────────
    // Client declares the event and its role. Gateway joins scoped Socket.io
    // rooms based on ROLE_SUBSCRIPTIONS so each role only receives its topics.
    socket.on("event:join", (payload: { eventId: string; role?: RealtimeRole }) => {
      const { eventId, role = "audience" } = payload ?? {};
      if (!eventId) return;

      socket.join(roomNames.event(eventId));

      const topics = ROLE_SUBSCRIPTIONS[role] ?? ROLE_SUBSCRIPTIONS.audience;
      for (const topic of topics) {
        socket.join(roomNames.topic(eventId, topic));
      }

      const engine = engineManager.getOrCreateEngine(eventId);
      engine.join(socket);
      engineManager.trackSocketInEvent(socket.id, eventId);

      // TODO(Phase 2B): emit current EventStateUpdate to this socket on join
    });

    // ── event:leave ───────────────────────────────────────────────────────────
    socket.on("event:leave", (payload: { eventId: string }) => {
      const { eventId } = payload ?? {};
      if (!eventId) return;
      socket.leave(roomNames.event(eventId));
      const allTopics = new Set(Object.values(ROLE_SUBSCRIPTIONS).flat());
      for (const topic of allTopics) {
        socket.leave(roomNames.topic(eventId, topic));
      }
    });

    // ── event:tap ─────────────────────────────────────────────────────────────
    // High-frequency input. NEVER broadcast raw. Route to engine for buffering.
    socket.on("event:tap", (payload: { eventId: string }) => {
      const { eventId } = payload ?? {};
      if (!eventId) return;
      const engine = engineManager.getEngine(eventId);
      if (!engine) return;
      engine.handleTap(socket.id);
      // TODO(Phase 2B): publish tap to Redis/NATS pub/sub channel
      //   key: realtime:tap:{eventId}
      //   value: { socketId, timestamp }
      // TODO(Phase 2B): aggregator reads the channel, batches over windowMs,
      //   computes AudiencePulseAggregate, and emits "event:pulse" to
      //   roomNames.audiencePulse(eventId) at 250–1000ms intervals.
    });

    // ── event:chat ────────────────────────────────────────────────────────────
    // Lower-frequency than taps. Broadcast to chat topic room after enrichment.
    socket.on(
      "event:chat",
      (payload: { eventId: string; text: string; userId?: string; displayName?: string }) => {
        const { eventId, text, userId, displayName } = payload ?? {};
        if (!eventId || !text?.trim()) return;

        const msg: ChatMessageEvent = {
          eventId,
          messageId: randomUUID(),
          userId: userId ?? socket.id,
          displayName: displayName ?? "Anonymous",
          text: text.slice(0, 500),
          timestamp: Date.now(),
        };

        io.to(roomNames.chat(eventId)).emit("event:chat", msg);
        // NOTE: sender will also receive this message (they joined the chat room).
        // Frontend should deduplicate by messageId against optimistic local state.

        // TODO(Phase 2B): persist chat message via internal queue or backend API
        // TODO(Phase 2B): apply moderation filter before broadcast
      },
    );

    // ── event:typing ──────────────────────────────────────────────────────────
    // Sampled, not per-keystroke. Gateway rate-limits per socket per event.
    // Only coordinators join the typing topic room (see ROLE_SUBSCRIPTIONS).
    socket.on("event:typing", (payload: { eventId: string }) => {
      const { eventId } = payload ?? {};
      if (!eventId) return;

      const now = Date.now();
      const byEvent = socketTypingTimestamps.get(socket.id) ?? new Map<string, number>();
      const lastEmit = byEvent.get(eventId) ?? 0;
      if (now - lastEmit < TYPING_SAMPLE_MS) return;

      byEvent.set(eventId, now);
      socketTypingTimestamps.set(socket.id, byEvent);

      const engine = engineManager.getEngine(eventId);
      if (engine) engine.handleTyping(socket.id);

      // TODO(Phase 2B): aggregator counts active typers in the window and
      //   emits TypingPresenceEvent { typingCount } to roomNames.typing(eventId)
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      socketTypingTimestamps.delete(socket.id);
      // EngineManager.onSocketDisconnect handles presence cleanup
    });
  });
}
