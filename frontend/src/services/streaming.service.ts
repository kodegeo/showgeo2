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

// ✅ Single-token authorization model: backend returns ONLY the JWT token string
// Room name and permissions are embedded in the token
// LiveKit URL comes from environment config, not backend
export interface LivekitTokenResponse {
  token: string;
}

export interface UpdateMetricsRequest {
  viewers?: number;
  participants?: number;
  messages?: number;
  [key: string]: unknown;
}

/**
 * Streaming service - all endpoints use relative paths /api/streaming/*
 * These go through apiClient which proxies to Fly.io backend.
 * 
 * NOTE: Media flows directly to LiveKit Cloud. Fly handles signaling only.
 * - Fly.io: Handles auth + token generation via /api/streaming/* endpoints
 * - LiveKit Cloud: Handles all WebRTC media traffic via wss://*.livekit.cloud
 * - No Fly routing for WebRTC traffic - connections go directly to LiveKit
 */
export const streamingService = {
  /**
   * Create streaming session
   * Endpoint: POST /api/streaming/session/:eventId
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
   * Endpoint: POST /api/streaming/:eventId/token
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
    
    // Log raw response for debugging
    console.log("[streamingService.generateToken] Raw response:", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      dataType: typeof response.data,
      hasToken: !!response.data?.token,
      tokenType: typeof response.data?.token,
      keys: response.data ? Object.keys(response.data) : []
    });
    
    return response.data;
  },

  /**
   * End streaming session
   * Endpoint: POST /api/streaming/session/:id/end
   */
  async endSession(sessionId: string): Promise<StreamingSession> {
    const response = await apiClient.post<StreamingSession>(
      `/streaming/session/${sessionId}/end`,
    );
    return response.data;
  },

  /**
   * Get active streaming sessions
   * Endpoint: GET /api/streaming/active
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






