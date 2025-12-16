import { apiClient } from "./api";
import type { PaginatedResponse, QueryParams } from "./types";
import type { Event, EventPhase, EventStatus } from "../../../packages/shared/types";
import type  { ProfileEvent }  from "../../../packages/shared/types/event.views";
import type { EventWithEntity } from "../../../packages/shared/types/event.api";


// events.service.ts
export interface CreateEventRequest {
  entityId: string;
  name: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  isVirtual?: boolean;
  eventType: "LIVE" | "PRERECORDED";
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
}

export interface PhaseTransitionRequest {
  phase: EventPhase;
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
  async extendPhase(id: string, duration: number): Promise<Event> {
    const response = await apiClient.post<Event>(`/events/${id}/phase/extend`, { duration });
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
};






