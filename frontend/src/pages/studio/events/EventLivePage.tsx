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
  const { session, loading: sessionLoading, endSession } = useStreaming(eventId!);
  const { room, setRoom, connected } = useLiveKitRoom();

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [localTracks, setLocalTracks] = useState<any[]>([]);
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

    // Loading OR session/event not yet hydrated
    if (sessionLoading || eventLoading || session === null || !event) {
        return (
        <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-gray-400">
            <div className="text-center">
            <div className="animate-pulse mb-2">Connecting to live stream...</div>
            </div>
        </div>
        );
    }
    
    // No active session (REAL case)
    if (!session.active) {
        // Debug log before rendering "No active stream"
        console.log("Streaming decision", {
            session,
            sessionLoading,
            eventId,
        });
        
        return (
        <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
            <div className="text-center text-gray-400 p-6">
            <p className="mb-4">No active stream for this event.</p>
            <button
                onClick={() => navigate(`/studio/events/${eventId}/dashboard`)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
            >
                Go Back
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
            {joining ? "Joining stream..." : publishing ? "Starting broadcast..." : "Connecting..."}
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

