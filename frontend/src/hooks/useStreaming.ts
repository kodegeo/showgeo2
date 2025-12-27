// frontend/src/components/streaming/useStreaming.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface StreamingSession {
  id: string;
  eventId: string;
  entityId: string;
  active: boolean;
  roomId: string;
  viewers?: number;
  startTime?: string;
  endTime?: string | null;
}

async function getAuthToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Not authenticated");

  return accessToken;
}

export function useStreaming(eventId: string) {
  const [streamSession, setStreamSession] = useState<StreamingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();

      // IMPORTANT: disable caching so we don't get 304/ETag stale state
      // Add both Cache-Control and Pragma headers to prevent all forms of caching
      const res = await fetch(`/api/streaming/active?eventId=${encodeURIComponent(eventId)}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
        cache: "no-store",
      });

      // Handle 304 Not Modified: reuse last known state, but ensure loading is false
      if (res.status === 304) {
        console.log("[useStreaming] Received 304 Not Modified, reusing last known session state");
        // Don't update session state, just ensure loading is false
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setStreamSession(null);
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Support either `{ session: ... }` or a raw session object
      const s: StreamingSession | null = data?.session ?? data ?? null;
      const sessionForEvent = s && s.eventId === eventId ? s : null;
      setStreamSession(sessionForEvent);
    } catch (e) {
      console.error("[useStreaming] Failed to load streaming session:", e);
      setError("Failed to load streaming session");
      setStreamSession(null);
    } finally {
      // Ensure loading always becomes false on any response path
      setLoading(false);
    }
  }, [eventId]);

  const createSession = useCallback(async (): Promise<StreamingSession | null> => {
    const token = await getAuthToken();

    // Request body matching CreateSessionDto (all fields optional, but send defaults for clarity)
    const requestBody = {
      accessLevel: "PUBLIC" as const, // Default from backend DTO
      // metadata and geoRegions are optional, omit them
    };

    // Debug log before POST
    console.log("[useStreaming.createSession] Request details:", {
      eventId,
      requestBody,
      url: `/api/streaming/session/${eventId}`,
    });

    const res = await fetch(`/api/streaming/session/${eventId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      // Parse error response to check if it's an active session conflict
      let errorMessage = "";
      let errorPayload: any = null;
      
      try {
        const rawText = await res.text();
        try {
          errorPayload = JSON.parse(rawText);
          errorMessage = errorPayload?.message || errorPayload?.error || rawText;
        } catch {
          errorMessage = rawText || "Failed to create session";
        }
      } catch {
        errorMessage = "Failed to create session";
      }

      // Log error details for debugging
      console.error("[useStreaming.createSession] Request failed:", {
        status: res.status,
        statusText: res.statusText,
        errorMessage,
        errorPayload,
        eventId,
        requestBody,
      });

      // ✅ Handle 400 Bad Request for active session conflicts
      // Note: AllExceptionsFilter strips error messages from responses (only returns statusCode, path, timestamp)
      // Per backend streaming.service.ts, the ONLY 400 case for POST /api/streaming/session/:eventId 
      // is "Event already has an active streaming session" (BadRequestException at line 93-96)
      // Therefore, any 400 response from session creation = active session exists
      if (res.status === 400) {
        // Check error message if available (in case filter is updated in future to include message)
        const hasActiveSessionMessage = 
          errorMessage.includes("active streaming session") ||
          errorMessage.includes("active session") ||
          errorMessage.includes("already has") ||
          errorPayload?.error === "ACTIVE_SESSION_EXISTS";
        
        // 400 on session creation endpoint = active session exists (only 400 case for this endpoint)
        // Return null to allow StreamingPanel to pivot to getActiveSession() instead of throwing
        console.log("[useStreaming.createSession] Active session already exists (400 response), returning null to allow fallback to getActiveSession()");
        return null;
      }

      // Throw for other errors (permissions, network, etc.) where no active session exists
      throw new Error(errorMessage);
    }
    
    const created: StreamingSession = await res.json();
    setStreamSession(created);
    return created;
  }, [eventId]);

  const getActiveSession = useCallback(async (): Promise<StreamingSession | null> => {
    const token = await getAuthToken();

    const res = await fetch(`/api/streaming/active?eventId=${encodeURIComponent(eventId)}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
      cache: "no-store",
    });

    // Handle 304: return null (no new data available)
    if (res.status === 304) {
      return null;
    }

    if (!res.ok) return null;

    const data = await res.json();
    
    // Backend returns an array of all active sessions, filter by eventId
    if (Array.isArray(data)) {
      const sessionForEvent = data.find((s: any) => s.eventId === eventId);
      return sessionForEvent || null;
    }
    
    // Fallback: if backend returns a single object (future-proofing)
    return (data?.session ?? data ?? null) as StreamingSession | null;
  }, [eventId]);

  const endSession = useCallback(async (sessionId: string) => {
    const token = await getAuthToken();

    await fetch(`/api/streaming/session/${sessionId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    await fetchSession();
  }, [fetchSession]);

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Polling: refetch every 4 seconds while session is inactive
  useEffect(() => {
    // Only poll if session is not active (or null)
    if (streamSession?.active === true) {
      return; // Stop polling once session becomes active
    }

    const pollInterval = setInterval(() => {
      console.log("[useStreaming] Polling for active session (current session inactive or null)");
      fetchSession();
    }, 4000); // 4 second interval

    return () => clearInterval(pollInterval);
  }, [streamSession?.active, fetchSession]);

  return {
    session: streamSession,
    loading,
    error,
    createSession,
    getActiveSession,
    endSession,
    refetch: fetchSession,
  };
}
