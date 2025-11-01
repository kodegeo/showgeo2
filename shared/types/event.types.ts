export enum EventType {
  LIVE = "LIVE",
  PRERECORDED = "PRERECORDED",
}

export enum EventPhase {
  PRE_CONCERT = "PRE_CONCERT",
  CONCERT = "CONCERT",
  POST_CONCERT = "POST_CONCERT",
}

export enum EventStatus {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  LIVE = "LIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum StreamingAccessLevel {
  LOCAL = "LOCAL",
  REGIONAL = "REGIONAL",
  NATIONAL = "NATIONAL",
  INTERNATIONAL = "INTERNATIONAL",
}

export enum TicketType {
  FREE = "FREE",
  GIFTED = "GIFTED",
  PAID = "PAID",
}

export interface Ticket {
  type: TicketType;
  price: number;
  currency: string;
  availability: number;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  eventType: EventType;
  phase: EventPhase;
  startTime: string;
  endTime?: string;
  location?: string;
  status: EventStatus;
  entityId: string;
  eventCoordinatorId?: string;
  tourId?: string;
  isVirtual: boolean;
  streamUrl?: string;
  testStreamUrl?: string;
  videoUrl?: string;
  streamingAccessLevel?: StreamingAccessLevel;
  geoRegions: string[];
  geoRestricted: boolean;
  ticketRequired: boolean;
  ticketTypes?: Ticket[];
  entryCodeRequired: boolean;
  entryCodeDelivery: boolean;
  ticketEmailTemplate?: string;
  testingEnabled: boolean;
  testResultLogs?: unknown[];
  liveMetrics?: Record<string, unknown>;
  customBranding?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastLaunchedBy?: string;
}

