import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import { PulseAggregatorService } from "./pulse-aggregator.service";
import { roomNames, ROLE_TOPIC_MAP } from "./room-names";

// Pulse is broadcast on a fixed interval — never per-tap.
// 250ms keeps energy visually responsive without flooding clients.
const PULSE_INTERVAL_MS = 250;

@WebSocketGateway({ namespace: "/events", 
  cors: { 
    origin: [
      "http://localhost:5173",
      "https://showgeo.vercel.app",
    ],
}
 })
export class EventInteractionGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer() private readonly server!: Server;

  private pulseInterval?: ReturnType<typeof setInterval>;
  // socketId → eventId for disconnect cleanup
  private readonly socketEventMap = new Map<string, string>();

  constructor(private readonly pulseAggregator: PulseAggregatorService) {}

  afterInit(): void {
    this.pulseInterval = setInterval(() => {
      for (const eventId of this.pulseAggregator.listActiveEvents()) {
        const result = this.pulseAggregator.consume(eventId);
        if (!result) continue; // No taps this window — skip broadcast

        this.server.to(roomNames.audiencePulse(eventId)).emit("event:pulse", {
          eventId,
          energy: result.energy,
          tapCount: result.tapCount,
          windowMs: result.windowMs,
          timestamp: Date.now(),
        });
      }
      // TODO(Phase 2C): replace setInterval with Redis/NATS subscriber.
      //   Each backend instance subscribes to aggregated pulse channel and
      //   re-broadcasts to its local Socket.IO room. Remove in-memory state.
    }, PULSE_INTERVAL_MS);
  }

  handleDisconnect(socket: Socket): void {
    this.socketEventMap.delete(socket.id);
    // TODO(Phase 2C): decrement Redis participant count for the event
  }

  // ── event:join ─────────────────────────────────────────────────────────────
  // Client joins the event room and its role-scoped topic rooms.
  @SubscribeMessage("event:join")
  handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { eventId: string; role?: string },
  ): void {
    const { eventId, role = "audience" } = payload ?? {};
    if (!eventId) return;

    socket.join(roomNames.event(eventId));

    const topics = ROLE_TOPIC_MAP[role] ?? ROLE_TOPIC_MAP.audience;
    for (const topic of topics) {
      socket.join(roomNames.topic(eventId, topic));
    }

    this.pulseAggregator.markEventActive(eventId);
    this.socketEventMap.set(socket.id, eventId);

    socket.emit("event:joined", { eventId, role });
  }

  // ── event:leave ────────────────────────────────────────────────────────────
  @SubscribeMessage("event:leave")
  handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { eventId: string },
  ): void {
    const { eventId } = payload ?? {};
    if (!eventId) return;
    socket.leave(roomNames.event(eventId));
    this.socketEventMap.delete(socket.id);
  }

  // ── event:tap ──────────────────────────────────────────────────────────────
  // Raw tap input. NEVER emitted back to clients.
  // Feeds the aggregator only; pulse broadcaster handles emission on interval.
  @SubscribeMessage("event:tap")
  handleTap(
    @ConnectedSocket() _socket: Socket,
    @MessageBody() payload: { eventId: string },
  ): void {
    const { eventId } = payload ?? {};
    if (!eventId) return;
    this.pulseAggregator.recordTap(eventId);
    // DO NOT emit here.
    // TODO(Phase 2C): publish increment to Redis HINCRBY realtime:taps:{eventId}
  }

  // ── event:chat ─────────────────────────────────────────────────────────────
  // Chat messages are broadcast to all sockets in the event's chat topic room.
  @SubscribeMessage("event:chat")
  handleChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: {
      eventId: string;
      text: string;
      userId?: string;
      displayName?: string;
    },
  ): void {
    const { eventId, text, userId, displayName } = payload ?? {};
    if (!eventId || !text?.trim()) return;

    this.server.to(roomNames.chat(eventId)).emit("event:chat", {
      eventId,
      messageId: randomUUID(),
      userId: userId ?? socket.id,
      displayName: displayName ?? "Anonymous",
      text: text.slice(0, 500),
      timestamp: Date.now(),
    });
    // NOTE: sender receives their own message (they're in the chat room).
    // Frontend deduplicates by messageId against optimistic local state.
    // TODO(Phase 2C): persist via MessagesService (non-blocking, queue-based)
  }
}
