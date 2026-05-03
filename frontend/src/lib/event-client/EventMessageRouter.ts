import type { EventState } from "./EventState";
import type { EventSocket } from "./EventSocket";
import type { ChatMessage, ReactionItem } from "./types";
import type { FanPresenceItem } from "@/services/fan-interaction.service";
import type { EnergySnapshotItem, HighlightMomentItem } from "@/services/engagement.service";

/**
 * Routes incoming socket messages to EventState.
 * Handles: message (chat), event:joined, fan:signal, fan:reaction, presence:update, highlight:new, energy:update
 */
export class EventMessageRouter {
  private unsubscribes: Array<() => void> = [];

  constructor(private socket: EventSocket, private state: EventState) {}

  start(): void {
    this.unsubscribes.push(
      this.socket.on("event:chat", (payload: unknown) => this.handleChatMessage(payload)),
      this.socket.on("event:joined", (payload: unknown) => this.handleEventJoined(payload)),
      this.socket.on("fan:signal", (payload: unknown) => this.handleFanSignal(payload)),
      this.socket.on("fan:reaction", (payload: unknown) => this.handleFanReaction(payload)),
      this.socket.on("presence:update", (payload: unknown) => this.handlePresenceUpdate(payload)),
      this.socket.on("highlight:new", (payload: unknown) => this.handleHighlightNew(payload)),
      this.socket.on("energy:update", (payload: unknown) => this.handleEnergyUpdate(payload)),
    );
  }

  stop(): void {
    this.unsubscribes.forEach(fn => fn());
    this.unsubscribes = [];
  }

  private handleChatMessage(payload: unknown): void {
    const msg = payload as ChatMessage;
    if (msg && typeof msg === "object") {
      this.state.appendChatMessage(msg);
    }
  }

  private handleEventJoined(_payload: unknown): void {
    // Optional: update state when client is confirmed joined
  }

  private handleFanSignal(_payload: unknown): void {
    // Optional: aggregate or show fan signal in state
  }

  private handleFanReaction(payload: unknown): void {
    const r = payload as ReactionItem;
    if (r && typeof r === "object" && r.type) {
      this.state.appendReaction({
        id: r.id ?? `${Date.now()}-${Math.random()}`,
        type: r.type,
        userId: r.userId,
        timestamp: r.timestamp ?? Date.now(),
        ...r,
      });
    }
  }

  private handlePresenceUpdate(payload: unknown): void {
    const p = payload as { viewerCount?: number; fans?: FanPresenceItem[] };
    if (p && typeof p === "object") {
      if (typeof p.viewerCount === "number") this.state.setViewerCount(p.viewerCount);
      if (Array.isArray(p.fans)) this.state.setFans(p.fans);
    }
  }

  private handleHighlightNew(payload: unknown): void {
    const h = payload as HighlightMomentItem;
    if (h && typeof h === "object") {
      this.state.setHighlightMoments([...this.state.getHighlightMoments(), h]);
    }
  }

  private handleEnergyUpdate(payload: unknown): void {
    const e = payload as { snapshot?: EnergySnapshotItem; snapshots?: EnergySnapshotItem[] };
    if (e && typeof e === "object") {
      if (e.snapshot) {
        this.state.setEnergySnapshots([...this.state.getEnergySnapshots(), e.snapshot]);
      }
      if (Array.isArray(e.snapshots)) this.state.setEnergySnapshots(e.snapshots);
    }
  }
}
