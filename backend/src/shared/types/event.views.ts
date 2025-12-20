export type ProfileEventStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface ProfileEvent {
  id: string;
  name: string;
  startTime: string;
  status: ProfileEventStatus;
  location?: string | null;
  thumbnail?: string | null;
  entity?: {
    id: string;
    name: string;
  };
}
