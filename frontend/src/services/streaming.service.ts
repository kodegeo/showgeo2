import { apiClient } from "./api";


export interface CreateSessionRequest {
  accessLevel?: "PUBLIC" | "REGISTERED" | "TICKETED";
  metadata?: Record<string, unknown>;
  geoRegions?: string[];
}

export interface GenerateTokenRequest {
  role?: "publisher" | "subscriber";
  country?: string;
  state?: string;
  city?: string;
  timezone?: string;

  streamRole?: "VIEWER" | "BROADCASTER";

}

export interface StreamingSession {
  id: string;
  eventId: string;
  entityId: string;
  roomId: string;
  sessionKey: string;
  accessLevel: string;
  startTime: string;
  endTime?: string;
  active: boolean;
  viewers: number;
  metrics?: Record<string, unknown>;
  geoRegions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LivekitTokenResponse {
  token: string;
  roomName: string;
  url: string;
}

export interface UpdateMetricsRequest {
  viewers?: number;
  participants?: number;
  messages?: number;
  [key: string]: unknown;
}

export const streamingService = {
  /**
   * Create streaming session
   */
  async createSession(eventId: string, data?: CreateSessionRequest): Promise<StreamingSession> {
    const response = await apiClient.post<StreamingSession>(
      `/streaming/session/${eventId}`,
      data || {}, // Don't include eventId in body - it's in the URL
    );
    return response.data;
  },

  /**
   * Generate LiveKit token
   * @param eventId - Event ID (goes in URL path, NOT in body)
   * @param data - Request body containing streamRole and optional geo fields
   */
  async generateToken(
    eventId: string,
    data: GenerateTokenRequest,
  ): Promise<LivekitTokenResponse> {
    // ✅ Temporary logging: request URL, body, and eventId type
    const requestUrl = `/streaming/${eventId}/token`;
    const requestBody = { ...data };
    
    // Ensure eventId is NOT in the body
    if ('eventId' in requestBody) {
      console.warn("[streamingService.generateToken] WARNING: eventId found in request body, removing it:", requestBody);
      delete (requestBody as any).eventId;
    }
    
    console.log("[streamingService.generateToken] Request details:", {
      url: requestUrl,
      body: requestBody,
      eventId,
      eventIdType: typeof eventId,
      eventIdValue: eventId,
    });
    
    const response = await apiClient.post<LivekitTokenResponse>(
      requestUrl,
      requestBody,
    );
    
    return response.data;
  },

  /**
   * End streaming session
   */
  async endSession(sessionId: string): Promise<StreamingSession> {
    const response = await apiClient.post<StreamingSession>(
      `/streaming/session/${sessionId}/end`,
    );
    return response.data;
  },

  /**
   * Get active streaming sessions
   */
  async getActiveSessions(): Promise<StreamingSession[]> {
    const response = await apiClient.get<StreamingSession[]>("/streaming/active");
    return response.data;
  },

  /**
   * Get session details
   */
  async getSession(id: string): Promise<StreamingSession> {
    const response = await apiClient.get<StreamingSession>(
      `/streaming/session/${id}`,
    );
    return response.data;
  },
  
  /**
   * Update session metrics
   */
  async updateMetrics(
    sessionId: string,
    data: UpdateMetricsRequest,
  ): Promise<StreamingSession> {
    const response = await apiClient.post<StreamingSession>(
      `/streaming/session/${sessionId}/metrics`,
      data
    );
    return response.data;
  }
  
};






