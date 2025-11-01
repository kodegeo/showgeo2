export enum TourStatus {
  DRAFT = "DRAFT",
  UPCOMING = "UPCOMING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}

export enum StreamingAccessLevel {
  LOCAL = "LOCAL",
  REGIONAL = "REGIONAL",
  NATIONAL = "NATIONAL",
  INTERNATIONAL = "INTERNATIONAL",
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

