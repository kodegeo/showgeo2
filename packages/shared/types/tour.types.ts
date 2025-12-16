// Re-export StreamingAccessLevel from event.types for consistency
import type { StreamingAccessLevel } from "./event.types";
export { StreamingAccessLevel } from "./event.types";

export enum TourStatus {
  DRAFT = "DRAFT",
  UPCOMING = "UPCOMING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface Tour {
  id: string;
  primaryEntityId: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  bannerImage?: string;
  startDate: string;
  endDate?: string;
  status: TourStatus;
  tags: string[];
  geoRestricted: boolean;
  streamingAccessLevel?: StreamingAccessLevel;
  geoRegions: string[];
  createdAt: string;
  updatedAt: string;
}
