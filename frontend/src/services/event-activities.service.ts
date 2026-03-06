import { apiClient } from "./api";
import type { EventPhase } from "@/types/eventPhase";

/**
 * Event Activity Type
 */
export type EventActivityType =
  | "VIP_MEET_GREET"
  | "FAN_DISCUSSION"
  | "REPLAY"
  | "PROMOTION"
  | "SURVEY";

/**
 * Event Activity Status
 */
export type EventActivityStatus =
  | "INACTIVE"
  | "ACTIVE"
  | "COMPLETED"
  | "EXPIRED";

/**
 * Activity Visibility
 */
export type ActivityVisibility =
  | "ALL_ATTENDEES"
  | "REGISTERED_ONLY"
  | "VIP_ONLY";

/**
 * Event Activity
 */
export interface EventActivity {
  id: string;
  eventId: string;
  phase: EventPhase;
  type: EventActivityType;
  status: EventActivityStatus;
  title: string;
  description: string | null;
  config: Record<string, any>;
  visibility: ActivityVisibility;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Event Activities Service
 * 
 * Phase 5C.1: READ-ONLY operations
 * Phase 5C.2: Activity lifecycle mutations
 */
export const eventActivitiesService = {
  /**
   * Get activities for an event
   * GET /api/events/:eventId/activities?phase=POST_LIVE
   */
  getActivities: async (
    eventId: string,
    phase?: EventPhase,
  ): Promise<EventActivity[]> => {
    const params = phase ? { phase } : {};
    const response = await apiClient.get<EventActivity[]>(
      `/events/${eventId}/activities`,
      { params },
    );
    return response.data;
  },

  /**
   * Launch an activity
   * POST /api/activities/:activityId/launch
   * Phase 5C.2
   */
  launchActivity: async (activityId: string): Promise<EventActivity> => {
    const response = await apiClient.post<EventActivity>(
      `/activities/${activityId}/launch`,
    );
    return response.data;
  },

  /**
   * Complete an activity
   * POST /api/activities/:activityId/complete
   * Phase 5C.2
   */
  completeActivity: async (activityId: string): Promise<EventActivity> => {
    const response = await apiClient.post<EventActivity>(
      `/activities/${activityId}/complete`,
    );
    return response.data;
  },
};

