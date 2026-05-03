import type { FanPresenceItem, FanRankingItem } from "@/services/fan-interaction.service";
import type { EnergySnapshotItem, HighlightMomentItem } from "@/services/engagement.service";

export interface ChatMessage {
  eventId: string;
  message?: string;
  displayName?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface ReactionItem {
  id: string;
  type: string;
  userId?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface EventStateData {
  viewerCount: number;
  fans: FanPresenceItem[];
  fanRankings: FanRankingItem[];
  energySnapshots: EnergySnapshotItem[];
  highlightMoments: HighlightMomentItem[];
  chatMessages: ChatMessage[];
  reactions: ReactionItem[];
}

export type Listener = () => void;
