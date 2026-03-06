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






