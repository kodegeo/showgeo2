// Local mirror of packages/shared/types/realtime.types.ts for use within
// the realtime service. Keep in sync with the shared package — it is the source of truth.

export type RealtimeRole = "audience" | "creator" | "coordinator";

export const REALTIME_TOPICS = {
  EVENT_STATE: "event-state",
  AUDIENCE_PULSE: "audience-pulse",
  CHAT: "chat",
  TYPING: "typing",
  CAMERA_CONTROL: "camera-control",
  MODERATION: "moderation",
  CREATOR_FEEDBACK: "creator-feedback",
} as const;

export type RealtimeTopic = (typeof REALTIME_TOPICS)[keyof typeof REALTIME_TOPICS];

export interface AudienceTapInput {
  eventId: string;
  userId?: string;
  timestamp: number;
}

export interface ChatMessageEvent {
  eventId: string;
  messageId: string;
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
}

export interface TypingPresenceEvent {
  eventId: string;
  typingCount: number;
  timestamp: number;
}

export interface AudiencePulseAggregate {
  eventId: string;
  windowMs: number;
  tapCount: number;
  activeUsers: number;
  energy: number;
  velocity: number;
  dominantEmotion?: string;
  timestamp: number;
}

export interface EventStateUpdate {
  eventId: string;
  isLive: boolean;
  activeCameraId?: string;
  viewerCount: number;
  energyLevel: number;
  timestamp: number;
}

export const ROLE_SUBSCRIPTIONS: Record<RealtimeRole, RealtimeTopic[]> = {
  audience: ["event-state", "audience-pulse", "chat"],
  creator: ["event-state", "audience-pulse", "creator-feedback", "chat"],
  coordinator: [
    "event-state",
    "audience-pulse",
    "creator-feedback",
    "chat",
    "typing",
    "camera-control",
    "moderation",
  ],
};
