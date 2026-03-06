import { apiClient } from "./api";

/**
 * Meet & Greet Session Status
 */
export type MeetGreetSessionStatus =
  | "PENDING"
  | "ACTIVE"
  | "COMPLETED"
  | "MISSED";

/**
 * Meet & Greet Session
 */
export interface MeetGreetSession {
  id: string;
  eventId: string;
  ticketId: string;
  userId: string;
  slotOrder: number;
  durationMinutes: number;
  status: MeetGreetSessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Start Next Session Response
 */
export interface StartNextSessionResponse {
  session: MeetGreetSession | null;
  started: boolean;
  message?: string;
}

/**
 * Meet & Greet Service
 * 
 * Phase 5C.4: VIP Meet & Greet integration in Production Console
 */
export const meetGreetService = {
  /**
   * Get queue of all sessions for an event
   * GET /api/events/:eventId/meet-greet/queue
   */
  getQueue: async (eventId: string): Promise<MeetGreetSession[]> => {
    const response = await apiClient.get<MeetGreetSession[]>(
      `/events/${eventId}/meet-greet/queue`,
    );
    return response.data;
  },

  /**
   * Get current active session
   * GET /api/events/:eventId/meet-greet/current
   */
  getCurrent: async (eventId: string): Promise<MeetGreetSession | null> => {
    const response = await apiClient.get<MeetGreetSession | null>(
      `/events/${eventId}/meet-greet/current`,
    );
    return response.data;
  },

  /**
   * Start the next pending session
   * POST /api/events/:eventId/meet-greet/start-next
   */
  startNext: async (eventId: string): Promise<StartNextSessionResponse> => {
    const response = await apiClient.post<StartNextSessionResponse>(
      `/events/${eventId}/meet-greet/start-next`,
    );
    return response.data;
  },

  /**
   * Mark a session as completed
   * POST /api/meet-greet/sessions/:sessionId/complete
   */
  completeSession: async (sessionId: string): Promise<MeetGreetSession> => {
    const response = await apiClient.post<MeetGreetSession>(
      `/meet-greet/sessions/${sessionId}/complete`,
    );
    return response.data;
  },

  /**
   * Mark a session as missed
   * POST /api/meet-greet/sessions/:sessionId/miss
   */
  missSession: async (sessionId: string): Promise<MeetGreetSession> => {
    const response = await apiClient.post<MeetGreetSession>(
      `/meet-greet/sessions/${sessionId}/miss`,
    );
    return response.data;
  },

  /**
   * Generate VIP room token for fan
   * POST /api/meet-greet/sessions/:sessionId/join-vip
   */
  joinVip: async (sessionId: string): Promise<{
    roomName: string;
    livekitToken: string;
    expiresAt: string;
  }> => {
    const response = await apiClient.post<{
      roomName: string;
      livekitToken: string;
      expiresAt: string;
    }>(`/meet-greet/sessions/${sessionId}/join-vip`);
    return response.data;
  },
};

