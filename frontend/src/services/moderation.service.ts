import { apiClient } from "./api";

/**
 * Moderation Reason
 */
export type ModerationReason =
  | "HARASSMENT"
  | "EXPLICIT_CONTENT"
  | "HATE_SPEECH"
  | "IMPERSONATION"
  | "INAPPROPRIATE_BEHAVIOR"
  | "OTHER";

/**
 * Moderation Status
 */
export type ModerationStatus = "OPEN" | "REVIEWED" | "DISMISSED";

/**
 * Moderation Role Context
 */
export type ModerationRoleContext =
  | "FAN_REPORTING_CREATOR"
  | "CREATOR_REPORTING_FAN";

/**
 * Moderation Report
 */
export interface ModerationReport {
  id: string;
  eventId: string;
  activityId: string | null;
  meetGreetSessionId: string | null;
  reporterUserId: string;
  reportedUserId: string;
  roleContext: ModerationRoleContext;
  phase: string;
  reason: ModerationReason;
  description: string | null;
  status: ModerationStatus;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    email: string;
  };
  reported?: {
    id: string;
    email: string;
  };
  activity?: {
    id: string;
    title: string;
  };
  meetGreetSession?: {
    id: string;
    slotOrder: number;
  };
  event?: {
    id: string;
    name: string;
  };
}

/**
 * Create Report Request
 */
export interface CreateReportRequest {
  activityId?: string;
  meetGreetSessionId?: string;
  reportedUserId: string;
  roleContext: ModerationRoleContext;
  reason: ModerationReason;
  description?: string;
}

/**
 * Update Report Status Request
 */
export interface UpdateReportStatusRequest {
  status: ModerationStatus;
}

/**
 * Moderation Service
 * 
 * Phase 6A: Moderation & Trust (Frontend)
 */
export const moderationService = {
  /**
   * Create a moderation report
   * POST /api/events/:eventId/reports
   */
  createReport: async (
    eventId: string,
    payload: CreateReportRequest,
  ): Promise<ModerationReport> => {
    const response = await apiClient.post<ModerationReport>(
      `/events/${eventId}/reports`,
      payload,
    );
    return response.data;
  },

  /**
   * Get reports created by the current user
   * GET /api/me/reports
   */
  getMyReports: async (): Promise<ModerationReport[]> => {
    const response = await apiClient.get<ModerationReport[]>("/me/reports");
    return response.data;
  },

  /**
   * Get reports for an event (producer/admin only)
   * GET /api/events/:eventId/reports
   */
  getEventReports: async (
    eventId: string,
  ): Promise<ModerationReport[]> => {
    const response = await apiClient.get<ModerationReport[]>(
      `/events/${eventId}/reports`,
    );
    return response.data;
  },

  /**
   * Update report status (admin/coordinator only)
   * PATCH /api/reports/:reportId/status
   */
  updateReportStatus: async (
    reportId: string,
    payload: UpdateReportStatusRequest,
  ): Promise<ModerationReport> => {
    const response = await apiClient.patch<ModerationReport>(
      `/reports/${reportId}/status`,
      payload,
    );
    return response.data;
  },
};

