/**
 * Event Creation Wizard and event-related types.
 * Backend POST /events accepts: entityId, name, startTime; optional: description, ticketPrice, thumbnail, etc.
 */

export interface CreateEventRequest {
  entityId: string;
  name: string;
  description?: string;
  category?: string;
  visibility: string;
  startTime: string; // ISO date string
  ticketPrice?: number;
}

export interface EventWizardState {
  eventId: string | null;
  name: string;
  description: string;
  category: string;
  visibility: "PUBLIC" | "PRIVATE" | "TICKET_HOLDERS";
  startTime: string;
  thumbnailUrl: string | null;
  ticketPrice: number;
  ticketQuantity: number;
  geoRestricted: boolean;
  streamingAccessLevel: string;
  streamKey: string | null;
  streamingStatus: string | null;
}

export const defaultEventWizardState: EventWizardState = {
  eventId: null,
  name: "",
  description: "",
  category: "",
  visibility: "PUBLIC",
  startTime: "",
  thumbnailUrl: null,
  ticketPrice: 0,
  ticketQuantity: 100,
  geoRestricted: false,
  streamingAccessLevel: "PUBLIC",
  streamKey: null,
  streamingStatus: null,
};
