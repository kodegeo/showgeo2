import type { Event } from "./index"; // or wherever Event is exported from

export type EventWithEntity = Event & {
  // matches the Prisma include name from your backend
  entity?: {
    id: string;
    name: string;
  } | null;
};
