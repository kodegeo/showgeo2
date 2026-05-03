import type { Server, Socket } from "socket.io";
import { PresenceManager } from "../managers/presence.manager.js";
import { ChatManager } from "../managers/chat.manager.js";
import { SignalManager } from "../managers/signal.manager.js";
import { ReactionManager } from "../managers/reaction.manager.js";
import { EnergyProcessor } from "../processors/energy.processor.js";
import { HighlightProcessor } from "../processors/highlight.processor.js";

const ROOM_PREFIX = "event_";

/**
 * EventEngine owns all managers and processors for a single event session.
 * Gateways route socket events to the engine; the engine delegates to managers/processors.
 */
export class EventEngine {
  private readonly room: string;

  readonly presence: PresenceManager;
  readonly chat: ChatManager;
  readonly signal: SignalManager;
  readonly reaction: ReactionManager;
  readonly energyProcessor: EnergyProcessor;
  readonly highlightProcessor: HighlightProcessor;

  constructor(
    public readonly eventId: string,
    private readonly io: Server,
  ) {
    this.room = `${ROOM_PREFIX}${eventId}`;
    this.presence = new PresenceManager(eventId);
    this.chat = new ChatManager(eventId, io);
    this.signal = new SignalManager(eventId, io);
    this.reaction = new ReactionManager(eventId, io);
    this.energyProcessor = new EnergyProcessor(eventId);
    this.highlightProcessor = new HighlightProcessor(eventId);
  }

  /**
   * Register a socket as joined this event (room + presence).
   */
  join(socket: Socket): void {
    socket.join(this.room);
    this.presence.join(socket.id);
  }

  /**
   * Unregister a socket from this event (presence only; socket may already be disconnected).
   */
  leave(socketId: string): void {
    this.presence.leave(socketId);
  }

  /**
   * Handle send_message: broadcast to event room via chat manager.
   */
  handleSendMessage(payload: { eventId: string; [key: string]: unknown }): void {
    this.chat.broadcastMessage(payload);
  }

  /**
   * Record a tap input from a socket. Does NOT broadcast — raw taps are never emitted.
   * Phase 2B: route to pub/sub so the aggregator can batch and emit AudiencePulseAggregate.
   */
  handleTap(socketId: string): void {
    this.energyProcessor.recordTap(socketId);
    // TODO(Phase 2B): publish to Redis/NATS tap channel for cross-instance aggregation
  }

  /**
   * Record a typing presence signal (already rate-limited by the gateway).
   * Phase 2B: aggregator counts active typers and emits TypingPresenceEvent.
   */
  handleTyping(_socketId: string): void {
    // TODO(Phase 2B): publish typing signal to pub/sub; aggregator emits TypingPresenceEvent
  }
}
