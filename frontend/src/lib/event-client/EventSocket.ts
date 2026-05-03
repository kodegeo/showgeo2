import type { Socket } from "socket.io-client";
import { getSharedSocket } from "./socket-shared";

type EventHandler = (payload: unknown) => void;

/**
 * Manages the websocket connection for an event session.
 * Reuses the shared socket from socket-shared (same as useRealtime).
 */
export class EventSocket {
  private socket: Socket;
  private eventId: string | null = null;
  private handlers = new Map<string, Set<EventHandler>>();

  constructor(socketInstance?: Socket) {
    this.socket = socketInstance ?? getSharedSocket();
    this.socket.on("disconnect", () => {
      this.eventId = null;
    });
  }

  connect(eventId: string): void {
    if (this.eventId === eventId) return;
    this.leaveEvent();
    this.eventId = eventId;
    this.socket.emit("event:join", { eventId, role: "audience" });
  }

  disconnect(): void {
    this.leaveEvent();
  }

  private leaveEvent(): void {
    if (this.eventId) {
      this.socket.emit("event:leave", { eventId: this.eventId });
    }
    this.eventId = null;
  }

  getEventId(): string | null {
    return this.eventId;
  }

  emit(eventName: string, payload?: unknown): void {
    if (payload !== undefined) {
      this.socket.emit(eventName, payload);
    } else {
      this.socket.emit(eventName);
    }
  }

  on(eventName: string, handler: EventHandler): () => void {
    let set = this.handlers.get(eventName);
    if (!set) {
      set = new Set();
      this.handlers.set(eventName, set);
      this.socket.on(eventName, (payload: unknown) => {
        set!.forEach(h => h(payload));
      });
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  getSocket(): Socket {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket.connected;
  }
}
