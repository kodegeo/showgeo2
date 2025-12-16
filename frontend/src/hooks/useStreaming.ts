// frontend/src/components/streaming/useStreaming.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface StreamingSession {
  id: string;
  eventId: string;
  entityId: string;
  active: boolean;
  roomId: string;
  viewers?: number;         // ✅ add this
  startTime?: string;       // optional but matches backend response
  endTime?: string | null;  // optional
}

export function useStreaming(eventId: string) {
  const [session, setSession] = useState<StreamingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/streaming/active");
      const data = await res.json();

      const match = data.find((s: StreamingSession) => s.eventId === eventId);
      setSession(match || null);
    } catch (e) {
      setError("Failed to load streaming session");
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (): Promise<StreamingSession> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const res = await fetch(`/api/streaming/session/${eventId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      let errorMessage = "Failed to create session";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error("[createSession] Error response:", {
          status: res.status,
          statusText: res.statusText,
          error: errorData,
        });
      } catch (e) {
        const text = await res.text();
        console.error("[createSession] Error response (text):", {
          status: res.status,
          statusText: res.statusText,
          body: text,
        });
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    setSession(data);
    return data;
  };

  useEffect(() => {
    fetchSession();
  }, [eventId]);

  const endSession = async (sessionId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
  
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }
  
    await fetch(`/api/streaming/session/${sessionId}/end`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  
    await fetchSession();
  };
  
  return {
    session,
    loading,
    error,
    createSession,
    endSession,   
    refetch: fetchSession,
  };
}
