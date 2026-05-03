// Canonical room naming for event-scoped realtime channels.
// Format: event:{eventId} and event:{eventId}:{topic}
// See: /docs/REALTIME_ARCHITECTURE.md — "Core Systems: Event Room Model"
//
// NOTE: The legacy lobby gateway uses "event_" (underscore) prefix.
// Phase 2A+ gateways use "event:" (colon) format per the architecture doc.

const P = "event";

export const roomNames = {
  /** Base event room. All roles join this. */
  event: (eventId: string): string => `${P}:${eventId}`,

  /** Topic-scoped room within an event. Used for role-filtered subscriptions. */
  topic: (eventId: string, topic: string): string => `${P}:${eventId}:${topic}`,

  eventState: (eventId: string): string => `${P}:${eventId}:event-state`,
  audiencePulse: (eventId: string): string => `${P}:${eventId}:audience-pulse`,
  chat: (eventId: string): string => `${P}:${eventId}:chat`,
  typing: (eventId: string): string => `${P}:${eventId}:typing`,
  cameraControl: (eventId: string): string => `${P}:${eventId}:camera-control`,
  moderation: (eventId: string): string => `${P}:${eventId}:moderation`,
  creatorFeedback: (eventId: string): string => `${P}:${eventId}:creator-feedback`,
};
