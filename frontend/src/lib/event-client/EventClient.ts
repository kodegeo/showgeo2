import { fanInteractionService } from "@/services/fan-interaction.service";
import { engagementService } from "@/services/engagement.service";
import type { FansResponse, RankingsResponse } from "@/services/fan-interaction.service";
import type { EnergyResponse, HighlightsResponse } from "@/services/engagement.service";
import { EventSocket } from "./EventSocket";
import { EventState } from "./EventState";
import { EventMessageRouter } from "./EventMessageRouter";
import {
  ChatClient,
  PresenceClient,
  FanSignalsClient,
  ReactionsClient,
  StreamingClient,
  EngagementClient,
} from "./modules";

/**
 * Central client for a single event session.
 * Manages socket, state, and REST API calls; components use this instead of calling services/sockets directly.
 */
export class EventClient {
  readonly eventId: string;
  readonly state: EventState;
  readonly chat: ChatClient;
  readonly presence: PresenceClient;
  readonly fanSignals: FanSignalsClient;
  readonly reactions: ReactionsClient;
  readonly streaming: StreamingClient;
  readonly engagement: EngagementClient;

  private socket: EventSocket;
  private router: EventMessageRouter;

  constructor(eventId: string, socketUrl?: string) {
    this.eventId = eventId;
    this.state = new EventState();
    this.socket = new EventSocket(socketUrl);
    this.router = new EventMessageRouter(this.socket, this.state);

    this.chat = new ChatClient(eventId, this.socket, this.state);
    this.presence = new PresenceClient(this.state);
    this.fanSignals = new FanSignalsClient(eventId, this.socket, this.state);
    this.reactions = new ReactionsClient(eventId, this.socket, this.state);
    this.streaming = new StreamingClient(this.state);
    this.engagement = new EngagementClient(this.state);
  }

  joinEvent(): void {
    this.socket.connect(this.eventId);
    this.router.start();
  }

  leaveEvent(): void {
    this.router.stop();
    this.socket.disconnect();
    this.state.reset();
  }

  sendChat(message: string): void {
    this.chat.send(message);
  }

  sendFanSignal(signal: { type: string; intensity?: number; [key: string]: unknown }): void {
    this.fanSignals.send(signal);
  }

  sendReaction(type: string, payload?: Record<string, unknown>): void {
    this.reactions.send(type, payload);
  }

  async getFans(): Promise<FansResponse> {
    const res = await fanInteractionService.getFans(this.eventId);
    this.state.setFans(res.fans);
    return res;
  }

  async getRankings(): Promise<RankingsResponse> {
    const res = await fanInteractionService.getRankings(this.eventId);
    this.state.setFanRankings(res.rankings);
    return res;
  }

  async getEnergy(): Promise<EnergyResponse> {
    const res = await engagementService.getEnergy(this.eventId);
    this.state.setEnergySnapshots(res.snapshots);
    return res;
  }

  async getHighlights(): Promise<HighlightsResponse> {
    const res = await engagementService.getHighlights(this.eventId);
    this.state.setHighlightMoments(res.highlights);
    return res;
  }

  getSocket(): EventSocket {
    return this.socket;
  }
}
