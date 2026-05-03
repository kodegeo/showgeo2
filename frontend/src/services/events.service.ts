import { apiClient } from "./api";
import type { PaginatedResponse, QueryParams } from "./types";
import type { EventPhase, EventStatus } from "@/types/eventPhase";
import type { Event } from "@/types/event.types";
import type { ProfileEvent } from "@/types/event.types";
import type { EventWithEntity } from "@/types/event.types";


// events.service.ts
export interface CreateEventRequest {
  // ✅ REQUIRED FIELDS ONLY
  entityId: string; // UUID of entity
  name: string;
  startTime: string; // ISO date string
  
  // ✅ OPTIONAL FIELDS
  description?: string;
  location?: string;
  endTime?: string; // ISO date string
  thumbnail?: string;
  
  // ❌ DO NOT SEND - Backend applies defaults
  // phase, status, eventType, geoRestricted, ticketRequired, etc.
  // These are handled by the backend automatically
}

export interface UpdateEventRequest {
  // Basic details
  name?: string;
  description?: string;
  thumbnail?: string;
  startTime?: string;
  endTime?: string;
  location?: string;

  // Lifecycle
  status?: EventStatus;
  phase?: EventPhase;

  // Access & delivery
  isVirtual?: boolean;
  streamUrl?: string;
  videoUrl?: string;

  // Geo / access control
  geoRestricted?: boolean;
  geoRegions?: string[];

  // Ticketing
  ticketRequired?: boolean;
  ticketTypes?: {
    name: string;
    price: number;
    currency: string;
    quantity: number;
    accessLevel: "GENERAL" | "VIP";
  }[];

  // Entry / testing
  entryCodeRequired?: boolean;
  entryCodeDelivery?: boolean;
  testingEnabled?: boolean;

  // Relationships
  collaboratorEntityIds?: string[];
  tourId?: string;

  // Live Introduction
  liveIntroduction?: {
    enabled: boolean;
    videoUrl?: string;
  };

  registrationAccess?: "OPEN" | "INVITE_ONLY";
  customBranding?: Record<string, unknown>;
}

export interface PhaseTransitionRequest {
  phase: EventPhase;
}

export type AudienceActionType = "SEND_REMINDER" | "INVITE_AUDIENCE" | "SCHEDULE_REMINDER";

export interface AudienceActionRequest {
  actionType: AudienceActionType;
  message?: string;
  scheduledFor?: string; // ISO date string for scheduled reminders
}

export interface UpdateMetricsRequest {
  viewers?: number;
  messages?: number;
  reactions?: number;
  participants?: number;
}

export interface TestResultsRequest {
  audioLevel?: number;
  videoQuality?: string;
  bitrate?: number;
  latency?: number;
}

/** GET /events/:id/access-status — fan registration / ticket eligibility */
export interface EventAccessStatus {
  hasAccess: boolean;
  hasTicket: boolean;
  requiresInvite: boolean;
  requiresPayment: boolean;
  availableTicketTypes: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    capacity: number | null;
    visibility: string | null;
    requires_invite: boolean | null;
  }>;
  claimedAccessPassId: string | null;
  activeTicketId: string | null;
  inviteCodeStatus: "none" | "valid" | "invalid" | "used";
  accessCode: string | null;
  resolvedAccessPassIdFromCode: string | null;
  resolvedTicketTypeIdFromCode: string | null;
}

/** Row from GET /events/:eventId/ticket-types (`ticket_types` table, JSON-serialized) */
export interface CatalogTicketType {
  id: string;
  name: string;
  price?: string | number | null;
  currency?: string | null;
  capacity?: number | null;
  requires_invite?: boolean | null;
}

/** Studio ticket tier payload for POST /events/:eventId/ticket-types */
export type SaveTicketTierPayload = {
  name: string;
  price: number;
  currency: string;
  quantity: number;
  accessLevel: "GENERAL" | "VIP";
};

function toProfileEvent(event: EventWithEntity): ProfileEvent {
  return {
    id: event.id,
    name: event.name,
    startTime: event.startTime,
    status: event.status,
    location: event.location,
    thumbnail: event.thumbnail,
    entity: event.entities_events_entityIdToentities
      ? {
          id: event.entities_events_entityIdToentities.id,
          name: event.entities_events_entityIdToentities.name,
        }
      : undefined,
  };
}

export const eventsService = {
  /**
   * Create event
   */
  async create(data: CreateEventRequest): Promise<Event> {
    const response = await apiClient.post<Event>("/events", data);
    return response.data;
  },

  /**
   * Get all events
   */
  async getAll(
    params?: QueryParams & {
      entityId?: string;
      phase?: EventPhase;
      status?: EventStatus;
      type?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<PaginatedResponse<ProfileEvent>> {
    const response = await apiClient.get<PaginatedResponse<Event>>("/events", { params });
  
    return {
      ...response.data,
      data: response.data.data.map(toProfileEvent),
    };
  },

  /**
   * Get event by ID
   */
  async getById(id: string): Promise<Event> {
    const response = await apiClient.get<Event>(`/events/${id}`);
    return response.data;
  },

  /**
   * Get current user's event-scoped access (role + operational roles). Returns null if not authenticated or no role.
   */
  async getAccess(id: string): Promise<EventAccess | null> {
    const response = await apiClient.get<EventAccess | null>(`/events/${id}/access`);
    return response.data;
  },

  /**
   * Update event
   */
  async update(id: string, data: UpdateEventRequest): Promise<Event> {
    const response = await apiClient.patch<Event>(`/events/${id}`, data);
    return response.data;
  },

  /**
   * Delete event
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/events/${id}`);
  },

  /**
   * Transition event phase
   */
  async transitionPhase(id: string, phase: EventPhase): Promise<Event> {
    const response = await apiClient.post<Event>(`/events/${id}/phase/transition`, { phase });
    return response.data;
  },

  /**
   * Extend event phase
   */
  async extendPhase(id: string, minutes: number): Promise<Event> {
    const response = await apiClient.post<Event>(`/events/${id}/phase/extend`, null, {
      params: { minutes },
    });
    return response.data;
  },

  /**
   * Get event metrics
   */
  async getMetrics(id: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(`/events/${id}/metrics`);
    return response.data;
  },

  /**
   * Update event metrics
   */
  async updateMetrics(id: string, data: UpdateMetricsRequest): Promise<Event> {
    const response = await apiClient.post<Event>(`/events/${id}/metrics`, data);
    return response.data;
  },

  /**
   * Log test results
   */
  async logTestResults(id: string, data: TestResultsRequest): Promise<Event> {
    const response = await apiClient.post<Event>(`/events/${id}/test-results`, data);
    return response.data;
  },

  /**
   * Get event analytics (Phase 3B)
   */
  async getAnalytics(id: string): Promise<EventAnalytics> {
    const response = await apiClient.get<EventAnalytics>(`/events/${id}/analytics`);
    return response.data;
  },

  /**
   * Perform audience action (send reminder, invite audience, schedule reminder)
   */
  async performAudienceAction(
    id: string,
    data: AudienceActionRequest,
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/events/${id}/audience-action`,
      data,
    );
    return response.data;
  },

  /**
   * Create a scheduled reminder
   */
  async createReminder(
    id: string,
    data: {
      type: "FOLLOWERS" | "TICKET_HOLDERS" | "CUSTOM";
      scheduledFor: string;
      messageTemplate?: string;
    },
  ): Promise<any> {
    const response = await apiClient.post<any>(`/events/${id}/reminders`, data);
    return response.data;
  },

  /**
   * Get all reminders for an event
   */
  async getReminders(id: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/events/${id}/reminders`);
    return response.data;
  },

  /**
   * Create a blast (message blast to audience)
   */
  async createBlast(
    id: string,
    data: {
      audience: "FOLLOWERS" | "TICKET_HOLDERS" | "CUSTOM";
      channel: "IN_APP" | "EMAIL";
      title: string;
      message: string;
    },
  ): Promise<{ success: boolean; recipientsCount: number }> {
    const response = await apiClient.post<{ success: boolean; recipientsCount: number }>(`/events/${id}/blasts`, data);
    return response.data;
  },

  /**
   * Creator dashboard: events for entities the user owns or collaborates on
   * GET /events/my-events
   */
  async getMyEvents(): Promise<GetMyEventsResponse> {
    const response = await apiClient.get<GetMyEventsResponse>("/events/my-events");
    return response.data;
  },

  /**
   * Invite followers or emails to a ticket type
   * POST /events/:id/invite
   */
  async inviteToEvent(
    eventId: string,
    body: { type: "FOLLOWERS" | "EMAIL"; emails?: string[]; ticketTypeId: string },
  ): Promise<{ created: number }> {
    const response = await apiClient.post<{ created: number }>(`/events/${eventId}/invite`, body);
    return response.data;
  },

  /**
   * List catalog ticket types for an event
   * GET /events/:eventId/ticket-types
   */
  async getTicketTypes(eventId: string): Promise<CatalogTicketType[]> {
    const response = await apiClient.get<CatalogTicketType[]>(`/events/${eventId}/ticket-types`);
    return response.data;
  },

  /**
   * Replace ticket catalog + mirror events.ticketTypes JSON
   * POST /events/:eventId/ticket-types
   */
  async saveTicketTypes(
    eventId: string,
    tiers: SaveTicketTierPayload[],
  ): Promise<CatalogTicketType[]> {
    const body = {
      ticketTypes: tiers.map(t => ({
        name: t.name,
        price: t.price,
        currency: t.currency ?? "USD",
        quantity: t.quantity,
        accessLevel: t.accessLevel,
        requiresInvite: t.accessLevel === "VIP",
      })),
    };
    const response = await apiClient.post<CatalogTicketType[]>(
      `/events/${eventId}/ticket-types`,
      body,
    );
    return response.data;
  },

  /**
   * Get or create shareable registration access code (creator only)
   * GET /events/:eventId/registrations/access-code
   */
  async getEventAccessCode(eventId: string): Promise<{ accessCode: string }> {
    const response = await apiClient.get<{ accessCode: string }>(
      `/events/${eventId}/registrations/access-code`,
    );
    return response.data;
  },

  /**
   * Invite entity followers (or subset) to a ticket type
   * POST /events/:eventId/invite-followers
   */
  async inviteFollowers(
    eventId: string,
    body: { ticketTypeId: string; followerIds?: string[]; emails?: string[] },
  ): Promise<{ created: number }> {
    const response = await apiClient.post<{ created: number }>(
      `/events/${eventId}/invite-followers`,
      body,
    );
    return response.data;
  },

  /**
   * Fan-facing: eligibility + catalog for registration (optional `?code=` invite).
   * GET /events/:id/access-status
   */
  async getAccessStatus(
    eventId: string,
    options?: { inviteCode?: string },
  ): Promise<EventAccessStatus> {
    const params =
      options?.inviteCode && options.inviteCode.trim().length > 0
        ? { code: options.inviteCode.trim() }
        : undefined;
    const response = await apiClient.get<EventAccessStatus>(
      `/events/${eventId}/access-status`,
      { params },
    );
    return response.data;
  },

  /**
   * Free tier registration — POST /events/:id/register-free
   */
  async registerFreeForEvent(
    eventId: string,
    body: { ticketTypeId: string; accessPassId?: string; accessCode?: string },
  ): Promise<{ ticket: unknown; accessPass: { id: string } }> {
    const response = await apiClient.post<{ ticket: unknown; accessPass: { id: string } }>(
      `/events/${eventId}/register-free`,
      body,
    );
    return response.data;
  },

  /**
   * Paid tier — POST /events/:id/checkout (returns Stripe URL or dev placeholder).
   */
  async createEventTicketCheckout(
    eventId: string,
    body: { ticketTypeId: string; accessPassId?: string; accessCode?: string },
  ): Promise<{
    orderId: string;
    checkoutUrl: string | null;
    placeholder?: boolean;
    devConfirmAvailable?: boolean;
    message?: string;
  }> {
    const response = await apiClient.post(
      `/events/${eventId}/checkout`,
      body,
    );
    return response.data;
  },
};

export interface EventAnalytics {
  registrationsCount: number;
  ticketsIssued: number;
  viewersJoined: number;
  joinRate: number;
  guestViewers: number;
  loggedInViewers: number;
  remindersSent10Min: number;
  remindersSent30Min: number;
}

/** GET /events/:id/access */
export interface EventAccess {
  accessRole: string;
  operationalRoles: string[];
}

export interface MyEventRow {
  id: string;
  name: string;
  startTime: string;
  status: string;
  phase?: string;
  lastLaunchedBy?: string | null;
  entityId: string;
  ticketsSold: number;
  grossRevenue: number;
  escrowHeld: number;
  estimatedPayout: number;
}

export interface GetMyEventsResponse {
  events: MyEventRow[];
  recentClips: Array<{
    id: string;
    eventId: string;
    title: string | null;
    thumbnailUrl: string | null;
    views: number;
    createdAt: string | null;
    event?: { id: string; name: string };
  }>;
}






