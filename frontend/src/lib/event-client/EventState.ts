import type { EventStateData, ChatMessage, ReactionItem, Listener } from "./types";
import type { FanPresenceItem, FanRankingItem } from "@/services/fan-interaction.service";
import type { EnergySnapshotItem, HighlightMomentItem } from "@/services/engagement.service";

const initialState: EventStateData = {
  viewerCount: 0,
  fans: [],
  fanRankings: [],
  energySnapshots: [],
  highlightMoments: [],
  chatMessages: [],
  reactions: [],
};

/**
 * Simple state container for a single event session.
 * Exposes getters and update methods; notifies listeners on change.
 */
export class EventState {
  private state: EventStateData = { ...initialState };
  private listeners = new Set<Listener>();

  getViewerCount(): number {
    return this.state.viewerCount;
  }

  getFans(): FanPresenceItem[] {
    return this.state.fans;
  }

  getFanRankings(): FanRankingItem[] {
    return this.state.fanRankings;
  }

  getEnergySnapshots(): EnergySnapshotItem[] {
    return this.state.energySnapshots;
  }

  getHighlightMoments(): HighlightMomentItem[] {
    return this.state.highlightMoments;
  }

  getChatMessages(): ChatMessage[] {
    return this.state.chatMessages;
  }

  getReactions(): ReactionItem[] {
    return this.state.reactions;
  }

  getState(): Readonly<EventStateData> {
    return this.state;
  }

  setViewerCount(value: number): void {
    this.state.viewerCount = value;
    this.notify();
  }

  setFans(fans: FanPresenceItem[]): void {
    this.state.fans = fans;
    this.notify();
  }

  setFanRankings(rankings: FanRankingItem[]): void {
    this.state.fanRankings = rankings;
    this.notify();
  }

  setEnergySnapshots(snapshots: EnergySnapshotItem[]): void {
    this.state.energySnapshots = snapshots;
    this.notify();
  }

  setHighlightMoments(moments: HighlightMomentItem[]): void {
    this.state.highlightMoments = moments;
    this.notify();
  }

  setChatMessages(messages: ChatMessage[]): void {
    this.state.chatMessages = messages;
    this.notify();
  }

  appendChatMessage(message: ChatMessage): void {
    this.state.chatMessages = [...this.state.chatMessages, message];
    this.notify();
  }

  setReactions(reactions: ReactionItem[]): void {
    this.state.reactions = reactions;
    this.notify();
  }

  appendReaction(reaction: ReactionItem): void {
    this.state.reactions = [...this.state.reactions, reaction];
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  reset(): void {
    this.state = { ...initialState };
    this.notify();
  }
}
