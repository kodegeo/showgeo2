/**
 * Runtime-safe enum arrays for class-validator decorators
 * 
 * These are hardcoded string arrays that match Prisma enum values exactly.
 * Used with @IsIn() decorator instead of @IsEnum() to avoid webpack tree-shaking issues.
 * 
 * IMPORTANT: Keep these values in sync with prisma/schema.prisma enum definitions.
 */

export const RuntimeEnums = {
  AssetType: ["IMAGE", "AUDIO", "VIDEO", "DOCUMENT", "OTHER"] as const,
  AssetOwnerType: ["USER", "ENTITY"] as const,
  OrderStatus: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED"] as const,
  OrderType: ["TICKET", "PRODUCT", "SUBSCRIPTION"] as const,
  UserRole: ["USER", "ENTITY", "MANAGER", "COORDINATOR", "ADMIN"] as const,
  EventType: ["LIVE", "PRERECORDED"] as const,
  EventPhase: ["PRE_LIVE", "LIVE", "POST_LIVE"] as const,
  EventStatus: ["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"] as const,
  StoreStatus: ["ACTIVE", "INACTIVE", "ARCHIVED"] as const,
  StoreVisibility: ["PUBLIC", "UNLISTED", "PRIVATE"] as const,
  NotificationType: ["LIVE_NOW", "NEW_DROP", "PHASE_UPDATE", "EVENT_CREATED", "EVENT_UPDATED", "FOLLOWED_ENTITY_UPDATE", "CUSTOM"] as const,
  EntityType: ["INDIVIDUAL", "ORGANIZATION"] as const,
  EntityRoleType: ["OWNER", "ADMIN", "MANAGER", "COORDINATOR"] as const,
  GeofencingAccessLevel: ["LOCAL", "REGIONAL", "NATIONAL", "INTERNATIONAL"] as const,
  TicketType: ["FREE", "GIFTED", "PAID"] as const,
  StreamingAccessLevel: ["PUBLIC", "REGISTERED", "TICKETED"] as const,
} as const;

/**
 * Type helpers for string literal unions
 */
export type AssetType = typeof RuntimeEnums.AssetType[number];
export type AssetOwnerType = typeof RuntimeEnums.AssetOwnerType[number];
export type OrderStatus = typeof RuntimeEnums.OrderStatus[number];
export type OrderType = typeof RuntimeEnums.OrderType[number];
export type UserRole = typeof RuntimeEnums.UserRole[number];
export type EventType = typeof RuntimeEnums.EventType[number];
export type EventPhase = typeof RuntimeEnums.EventPhase[number];
export type EventStatus = typeof RuntimeEnums.EventStatus[number];
export type StoreStatus = typeof RuntimeEnums.StoreStatus[number];
export type StoreVisibility = typeof RuntimeEnums.StoreVisibility[number];
export type NotificationType = typeof RuntimeEnums.NotificationType[number];
export type EntityType = typeof RuntimeEnums.EntityType[number];
export type EntityRoleType = typeof RuntimeEnums.EntityRoleType[number];
export type GeofencingAccessLevel = typeof RuntimeEnums.GeofencingAccessLevel[number];
export type TicketType = typeof RuntimeEnums.TicketType[number];
export type StreamingAccessLevel = typeof RuntimeEnums.StreamingAccessLevel[number];
