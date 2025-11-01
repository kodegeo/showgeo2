export enum GeofencingType {
  ALLOWLIST = "ALLOWLIST",
  BLOCKLIST = "BLOCKLIST",
}

export enum GeofencingTargetType {
  EVENT = "EVENT",
  TOUR = "TOUR",
  STORE = "STORE",
}

export interface Geofencing {
  id: string;
  targetType: GeofencingTargetType;
  targetId: string;
  type: GeofencingType;
  regions: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

