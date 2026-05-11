// Studio live broadcast — mounted outside CreatorDashboardLayout (see App.tsx)
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useStreaming } from "@/hooks/useStreaming";
import { useAuth } from "@/hooks/useAuth";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import { useEvent } from "@/hooks/useEvents";
import { useEntityContext } from "@/hooks/useEntityContext";
import { streamingService } from "@/services";
import { joinStream } from "@/lib/livekit/joinStream";
// Removed publishLocal import - using setCameraEnabled/setMicrophoneEnabled instead
import { StreamingLiveLayout } from "@/components/streaming/StreamingLiveLayout";

export function EventLivePage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event, isLoading: eventLoading } = useEvent(eventId!);
  const { currentEntity } = useEntityContext();
  const {
    session,
    loading: sessionLoading,
    endSession,
    createSession,
    refetch: refetchStreamingSession,
    error: streamingQueryError,
  } = useStreaming(eventId!);
  const { room, setRoom, connected } = useLiveKitRoom();

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [localTracks, setLocalTracks] = useState<any[]>([]);
  const [startingSession, setStartingSession] = useState(false);
  const [startSessionError, setStartSessionError] = useState<string | null>(null);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const hasRequestedTokenRef = useRef(false);

  const isBroadcaster = !!(
    user?.role === "ADMIN" ||
    user?.role === "COORDINATOR" ||
    (event && currentEntity && event.entityId === currentEntity.id)
  );

  // Join LiveKit room
  const handleJoin = useCallback(async () => {
    if (!eventId || !session || !event || hasRequestedTokenRef.current) {
      return;
    }

    if (room && connected) {
      console.log("[EventLivePage] Already connected to room");
      return;
    }

    setJoining(true);
    setJoinError(null);
    hasRequestedTokenRef.current = true;

    try {
      // Generate token
      const streamRole: "BROADCASTER" | "VIEWER" = isBroadcaster ? "BROADCASTER" : "VIEWER";
      const tokenRequestBody = {
        streamRole,
      };

      const tokenResponse = await streamingService.generateToken(eventId, tokenRequestBody);

      if (!tokenResponse?.token || typeof tokenResponse.token !== "string") {
        throw new Error("Invalid token response from server");
      }

      const token = tokenResponse.token;
      
      // Use URL from token response first, fallback to env
      const serverUrl = (tokenResponse as any).livekitUrl || 
                       (tokenResponse as any).url || 
                       (tokenResponse as any).wsUrl || 
                       import.meta.env.VITE_LIVEKIT_URL;

      if (!serverUrl) {
        throw new Error("LiveKit server URL missing from token response and env");
      }

      // Log before joining
      console.log("[EventLivePage] Joining LiveKit", { 
        serverUrl, 
        hasToken: !!token, 
        streamRole 
      });

      // Join room (connect only - no automatic publishing)
      const lkRoom = await joinStream({ token, serverUrl });
      
      // Log room state after connect
      console.log("[EventLivePage] Room connected", { 
        roomState: lkRoom.state,
        roomName: lkRoom.name,
        localParticipant: lkRoom.localParticipant?.identity
      });
      
      setRoom(lkRoom);

      // Camera is off by default - user can enable via BroadcasterControls
      console.log("[EventLivePage] Room connected - camera off by default, enable via controls");

      hasRequestedTokenRef.current = false;
    } catch (error) {
      console.error("[EventLivePage] Join failed:", error);
      let errorMessage = error instanceof Error ? error.message : "Failed to join stream";
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const data = error.response.data as { message?: string | string[] } | undefined;
        const msg = Array.isArray(data?.message)
          ? data.message[0]
          : typeof data?.message === "string"
            ? data.message
            : "";
        if (msg.toLowerCase().includes("not live")) {
          errorMessage =
            "This event is not in a live window yet. Open the event dashboard and use Go Live when you are ready, then return here.";
        }
      }
      setJoinError(errorMessage);
      // Keep hasRequestedTokenRef true so auto-join does not loop on 403; use Retry to try again.
    } finally {
      setJoining(false);
    }
  }, [eventId, session, event, isBroadcaster, room, connected, setRoom]);

  const handleStartStream = useCallback(async () => {
    if (!eventId || startingSession) return;
    setStartSessionError(null);
    setStartingSession(true);
    try {
      console.log("[EventLivePage] Creating streaming session (POST /streaming/session)", {
        eventId,
        isBroadcaster,
      });
      const created = await createSession();
      if (created) {
        console.log("[EventLivePage] Session ready", {
          sessionId: created.id,
          active: created.active,
          roomId: created.roomId,
        });
        return;
      }
      // Hook returns null on 400 "already active" — pull latest from GET /streaming/active
      console.log("[EventLivePage] createSession returned null; refetching active sessions");
      await refetchStreamingSession({ silent: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start stream";
      console.error("[EventLivePage] Start stream failed:", err);
      setStartSessionError(message);
    } finally {
      setStartingSession(false);
    }
  }, [eventId, createSession, refetchStreamingSession, startingSession, isBroadcaster]);

  // Auto-join when session becomes active
  useEffect(() => {
    if (session?.active && !connected && !joining && !hasRequestedTokenRef.current) {
      console.log("[EventLivePage] Auto-joining room");
      handleJoin();
    }
  }, [session?.active, connected, joining, handleJoin, event]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        console.log("[EventLivePage] Cleaning up room on unmount");
        // Stop local tracks
        localTracks.forEach((track) => {
          track.stop();
        });
        // Disconnect room
        room.disconnect();
      }
    };
  }, [room, localTracks]);

  // Handle end stream
  const handleEndStream = useCallback(async () => {
    if (!session) return;

    try {
      // Disconnect from room
      if (room) {
        // Stop local tracks
        localTracks.forEach((track) => {
          track.stop();
        });
        setLocalTracks([]);

        // Disconnect room
        room.disconnect();
        setRoom(null);
      }

      // End session if broadcaster
      if (isBroadcaster) {
        await endSession(session.id);
      }

      // Navigate away
      navigate(`/studio/events/${eventId}/dashboard`);
    } catch (error) {
      console.error("[EventLivePage] Failed to end stream:", error);
      // Still navigate away even if end fails
      navigate(`/studio/events/${eventId}/dashboard`);
    }
  }, [session, room, localTracks, isBroadcaster, eventId, navigate, setRoom]);

  // Initial load only: `session === null` after fetch means "no active session", not "still connecting".
  if (eventLoading || sessionLoading || !event) {
    const label = eventLoading ? "Loading event…" : "Checking for a live session…";
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-gray-400">
        <div className="text-center px-6">
          <div className="animate-pulse mb-2">{label}</div>
          {streamingQueryError && (
            <p className="text-sm text-amber-500/90 mt-2 max-w-md">{streamingQueryError}</p>
          )}
        </div>
      </div>
    );
  }

  // No row in GET /streaming/active for this event (body was [] or no matching eventId)
  if (!session) {
    console.log("[EventLivePage] No active streaming session for event", {
      eventId,
      isBroadcaster,
      hint: "POST /api/streaming/session/:eventId creates an active session when permitted",
    });

    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-6">
        <div className="text-center text-gray-300 max-w-md space-y-4">
          <h1 className="text-lg font-semibold text-white">No live session yet</h1>
          <p className="text-sm text-gray-400">
            {isBroadcaster
              ? "Start a stream to create an active session and connect to LiveKit. Your event must be allowed to go live (entity active, permissions OK)."
              : "The host has not started broadcasting yet. You can wait here — we check every few seconds — or go back."}
          </p>
          {startSessionError && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              {startSessionError}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {isBroadcaster && (
              <button
                type="button"
                disabled={startingSession}
                onClick={() => void handleStartStream()}
                className="px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] disabled:opacity-50 text-sm font-medium"
              >
                {startingSession ? "Starting stream…" : "Start stream"}
              </button>
            )}
            <button
              type="button"
              disabled={refreshingSession}
              onClick={async () => {
                setRefreshingSession(true);
                try {
                  await refetchStreamingSession({ silent: true });
                } finally {
                  setRefreshingSession(false);
                }
              }}
              className="px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 text-sm disabled:opacity-50"
            >
              {refreshingSession ? "Refreshing…" : "Refresh status"}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/studio/events/${eventId}/dashboard`)}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              Go to event
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Session row exists but marked inactive (unusual for /active list; defensive)
  if (!session.active) {
    console.warn("[EventLivePage] Session present but inactive", {
      sessionId: session.id,
      eventId,
    });
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-6">
        <div className="text-center text-gray-400 max-w-md space-y-4">
          <p>This stream session is not active.</p>
          <button
            type="button"
            onClick={() => navigate(`/studio/events/${eventId}/dashboard`)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Go to event
          </button>
        </div>
      </div>
    );
  }
  
  // Joining state
  if (joining || !connected || !room) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center text-gray-400 p-6">
          <div className="animate-pulse mb-2">
            {joining ? "Joining stream…" : "Connecting to room…"}
          </div>
          {joinError && (
            <div className="mt-4 text-red-400 text-sm">
              <p>{joinError}</p>
              <button
                onClick={() => {
                  hasRequestedTokenRef.current = false;
                  setJoinError(null);
                  void handleJoin();
                }}
                className="mt-2 px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005]"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Connected - show full live layout
  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <StreamingLiveLayout
        room={room}
        session={session}
        isBroadcaster={isBroadcaster}
        onEndStream={handleEndStream}
        showViewerSidebar={!isBroadcaster}
      />
    </div>
  );
}

