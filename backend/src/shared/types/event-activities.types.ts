/**
 * Event Activity Types
 * 
 * Local TypeScript enums for event activities.
 * These enums are NOT in Prisma Client because the event_activities
 * model does not exist in the current Prisma schema.
 * 
 * Values match database enum values exactly.
 */

export enum EventActivityType {
  VIP_MEET_GREET = "VIP_MEET_GREET",
  FAN_DISCUSSION = "FAN_DISCUSSION",
  REPLAY = "REPLAY",
  PROMOTION = "PROMOTION",
  SURVEY = "SURVEY",
}

export enum EventActivityStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  EXPIRED = "EXPIRED",
}

export enum ActivityVisibility {
  ALL_ATTENDEES = "ALL_ATTENDEES",
  REGISTERED_ONLY = "REGISTERED_ONLY",
  VIP_ONLY = "VIP_ONLY",
}

