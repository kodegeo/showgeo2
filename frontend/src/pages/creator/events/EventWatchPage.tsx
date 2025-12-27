import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LiveKitRoom } from "@livekit/components-react";
import { ViewerPlayer } from "@/components/streaming/ViewerPlayer";
import { useStreaming } from "@/hooks/useStreaming";
import { useEvent } from "@/hooks/useEvents";
import { streamingService } from "@/services";

export function EventWatchPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, loading: sessionLoading, refetch } = useStreaming(eventId!);
  const { data: event, isLoading: eventLoading } = useEvent(eventId!);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Generate viewer token when session becomes active
  useEffect(() => {
    if (session?.active && !token && !connecting) {
      setConnecting(true);
      setError(null);
      
      // ✅ Temporary logging: request details before API call
      const tokenRequestBody: { streamRole: "VIEWER" } = { streamRole: "VIEWER" };
      console.log("[EventWatchPage] About to call generateToken:", {
        eventId: eventId!,
        eventIdType: typeof eventId,
        eventIdValue: eventId,
        requestBody: tokenRequestBody,
        requestUrl: `/streaming/${eventId}/token`,
      });
      
      streamingService
        .generateToken(eventId!, tokenRequestBody)
        .then((response) => {
          setToken(response.token);
          // ✅ Single-token authorization model: LiveKit URL comes ONLY from environment config
          // Backend returns only the token string - room name and URL are not included
          const serverUrl = import.meta.env.VITE_LIVEKIT_URL;
          if (!serverUrl) {
            throw new Error("LiveKit server URL not configured. Please set VITE_LIVEKIT_URL environment variable.");
          }
          setServerUrl(serverUrl);
          setConnecting(false);
        })
        .catch((err) => {
          console.error("Failed to generate viewer token:", err);
          setError(err instanceof Error ? err.message : "Failed to connect");
          setConnecting(false);
        });
    }
  }, [session?.active, eventId, token, connecting]);

  // Refetch session periodically to check if it becomes active
  useEffect(() => {
    if (!session?.active && !sessionLoading) {
      const interval = setInterval(() => {
        refetch();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [session?.active, sessionLoading, refetch]);

  if (sessionLoading || eventLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="animate-pulse mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center text-red-400 p-6">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!session?.active) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center text-gray-400 p-6">
          <p className="mb-4">This event is not live yet.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="animate-pulse mb-2">Connecting to stream...</div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={true}
      data-lk-theme="default"
      className="min-h-screen bg-[#0B0B0B]"
    >
      <ViewerPlayer 
        session={session} 
        event={event || undefined}
        onLeave={() => navigate(-1)}
      />
    </LiveKitRoom>
  );
}
