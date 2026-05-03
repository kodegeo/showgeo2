// Shared realtime contracts for Showgeo Phase 2A.
// Source of truth: /docs/REALTIME_ARCHITECTURE.md
// Consumed by: frontend (via @shared), backend (via @showgeo/shared).
// Mirrored in: services/realtime/src/types/realtime.ts (keep in sync).

// --- Roles ---

export type RealtimeRole = "audience" | "creator" | "coordinator";

// --- Topics ---

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

// --- Inputs (client → server; NEVER broadcast raw) ---

export interface AudienceTapInput {
  eventId: string;
  userId?: string;
  timestamp: number;
}

// --- Broadcast payloads (server → client) ---

export interface AudiencePulseAggregate {
  eventId: string;
  windowMs: number;
  tapCount: number;
  activeUsers: number;
  energy: number;           // 0–100
  velocity: number;         // change rate over window
  dominantEmotion?: string;
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
  typingCount: number;      // aggregated count, never per-keystroke
  timestamp: number;
}

export interface CameraSwitchEvent {
  eventId: string;
  type: "SWITCH_CAMERA";
  cameraId: string;
  coordinatorId: string;
  timestamp: number;
}

export interface ModerationEvent {
  eventId: string;
  action: "REMOVE_MESSAGE" | "MUTE_USER" | "FLAG_USER";
  targetId: string;         // messageId or userId depending on action
  moderatorId: string;
  timestamp: number;
}

export interface EventStateUpdate {
  eventId: string;
  isLive: boolean;
  activeCameraId?: string;
  viewerCount: number;
  energyLevel: number;      // 0–100, derived from pulse aggregate
  timestamp: number;
}

// --- Role-to-topic subscription map ---
// Each role only receives topics listed here; all others are invisible to them.

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
