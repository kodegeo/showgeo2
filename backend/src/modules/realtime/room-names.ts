// Room naming for event-scoped realtime channels.
// Mirrors services/realtime/src/utils/room-names.ts — keep in sync.
// Format defined in /docs/REALTIME_ARCHITECTURE.md: event:{eventId}:{topic}

const P = "event";

export const roomNames = {
  event: (eventId: string): string => `${P}:${eventId}`,
  topic: (eventId: string, topic: string): string => `${P}:${eventId}:${topic}`,
  audiencePulse: (eventId: string): string => `${P}:${eventId}:audience-pulse`,
  chat: (eventId: string): string => `${P}:${eventId}:chat`,
  typing: (eventId: string): string => `${P}:${eventId}:typing`,
  cameraControl: (eventId: string): string => `${P}:${eventId}:camera-control`,
  moderation: (eventId: string): string => `${P}:${eventId}:moderation`,
  creatorFeedback: (eventId: string): string => `${P}:${eventId}:creator-feedback`,
};

// Role → topic rooms the socket joins on event:join.
// Only audience-facing topics flow to audience sockets; coordinators see all.
export const ROLE_TOPIC_MAP: Record<string, string[]> = {
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
