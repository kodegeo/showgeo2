import { useMemo, useState, useEffect, useRef } from "react";
import { useStreaming } from "@/hooks/useStreaming";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { streamingService } from "@/services";
import { joinStream } from "@/lib/livekit/joinStream";
import { publishLocal } from "../../lib/livekit/publishLocal";
import { useLiveKitRoom } from "../../hooks/useLiveKitRoom";
import { LiveKitViewer } from "./LiveKitViewer";
import { StreamingLive } from "../../components/streaming/StreamingLive";
import { StreamingNotLive } from "../../components/streaming/StreamingNotLive";


type StreamingPanelProps = {
    eventId: string;
    event?: {
      status?: string;
      phase?: string;
      startTime?: string | null;
    };
    isEntity: boolean;
  };

export function StreamingPanel({ eventId, isEntity: isEntityProp, event }: StreamingPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onCancel = () => navigate(-1);
  const isEntity = isEntityProp || user?.isEntity || user?.role === "ADMIN" || user?.role === "COORDINATOR";

  // ✅ Validate eventId prop
  if (!eventId || typeof eventId !== "string") {
    console.error("[StreamingPanel] Invalid eventId prop:", { eventId, type: typeof eventId });
    return (
      <div className="border border-red-800 p-4 rounded-lg text-red-400">
        Invalid event ID. Please refresh the page.
      </div>
    );
  }

  console.log(
    "[ENV CHECK] VITE_LIVEKIT_URL =",
    import.meta.env.VITE_LIVEKIT_URL
  );
  console.log("[StreamingPanel] Initialized with eventId:", eventId, "type:", typeof eventId);
  
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null); // ✅ Fix 2: Visible error state

  const [publishing, setPublishing] = useState(false);
  const [localTracks, setLocalTracks] = useState<any[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false); // ✅ Fix 3: Host broadcasting state

  const { session, loading, error, createSession, endSession, refetch } = useStreaming(eventId);
  const { room, setRoom, connected } = useLiveKitRoom();
  
  // ✅ Auto-join guard: ensures auto-join only happens once
  const autoJoinAttemptedRef = useRef(false);
  
  // ✅ Get host param from URL
  const hostParam = searchParams.get("host");
  
  const canManageStream = useMemo(() => {
    return (
      !!isEntityProp ||
      !!user?.isEntity ||
      user?.role === "ADMIN" ||
      user?.role === "COORDINATOR"
    );
  }, [isEntityProp, user?.isEntity, user?.role]);

  // NOTE: your events table likely uses SCHEDULED/APPROVED etc — adjust to your real values.
  const eventStatus = String(event?.status);
  const eventPhase = String(event?.phase);
  
  const isApproved =
    eventStatus === "APPROVED" || eventStatus === "SCHEDULED";
  
  const isPreLive =
    eventPhase === "PRE_LIVE";
  
  const canGoLive = canManageStream && isApproved && isPreLive;
  

  const scheduledStart =
    event?.startTime && new Date(event.startTime) > new Date()
      ? new Date(event.startTime)
      : null;

  // ✅ Define onJoin before useEffect so it can be called in auto-join logic
  const onJoin = async (opts?: { publish?: boolean; sessionOverride?: typeof session }) => {
        const activeSession = opts?.sessionOverride || session;
        if (!activeSession) {
          const errorMsg = "No active streaming session";
          setStreamError(errorMsg); // ✅ Fix 2: Surface error
          throw new Error(errorMsg);
        }
      
        // ✅ Validate eventId before making API call
        if (!eventId || typeof eventId !== "string") {
          const errorMsg = `Invalid eventId: ${eventId} (type: ${typeof eventId})`;
          console.error("[onJoin] Invalid eventId:", { eventId, type: typeof eventId });
          setStreamError(errorMsg);
          throw new Error(errorMsg);
        }
      
        const shouldPublish = opts?.publish === true;
        console.log("[onJoin] Called with publish:", shouldPublish, "eventId:", eventId);
      
        try {
          setJoining(true);
          setJoinError(null);
          setStreamError(null); // ✅ Fix 2: Clear previous errors
          setIsBroadcasting(false); // ✅ Fix 3: Reset broadcasting state
      
          const streamRole: "BROADCASTER" | "VIEWER" = shouldPublish ? "BROADCASTER" : "VIEWER";
          
          // ✅ Temporary logging: request details before API call
          const tokenRequestBody: { streamRole: "BROADCASTER" | "VIEWER" } = { streamRole };
          console.log("[onJoin] About to call generateToken:", {
            eventId,
            eventIdType: typeof eventId,
            eventIdValue: eventId,
            requestBody: tokenRequestBody,
            requestUrl: `/streaming/${eventId}/token`,
          });
          
          // ✅ Fix 2: Surface token generation errors
          let tokenResponse;
          try {
            tokenResponse = await streamingService.generateToken(eventId, tokenRequestBody);
          } catch (tokenError: any) {
            console.error("[onJoin] Token generation failed:", {
              error: tokenError,
              message: tokenError?.message,
              response: tokenError?.response?.data,
              status: tokenError?.response?.status,
              statusText: tokenError?.response?.statusText,
              eventId,
              streamRole,
            });
            
            // Extract actual error message from backend if available
            let errorMsg = "Unable to connect to streaming server. Please check your connection and try again.";
            if (tokenError?.response?.data?.message) {
              errorMsg = tokenError.response.data.message;
            } else if (tokenError?.message) {
              errorMsg = tokenError.message;
            }
            
            setStreamError(errorMsg);
            throw new Error(errorMsg);
          }
          
          console.log("[onJoin] Token response:", { hasToken: !!tokenResponse.token, hasUrl: !!tokenResponse.url, roomName: tokenResponse.roomName });
      
          // Log LiveKit token payload
          console.log("[LiveKit] Token payload:", {
            roomName: tokenResponse.roomName,
            identity: user?.id || "unknown",
            role: streamRole,
          });
      
          // ✅ Compare room names to detect mismatches
          const tokenRoomName = tokenResponse.roomName;
          const sessionRoomId = activeSession.roomId;
          const roomNamePassedToConnect = activeSession.roomId; // Currently using session.roomId
          
          console.log("[Room Name Comparison]", {
            "tokenResponse.roomName": tokenRoomName,
            "streaming_sessions.roomId": sessionRoomId,
            "roomName passed to joinStream()": roomNamePassedToConnect,
            "tokenRoomName === sessionRoomId": tokenRoomName === sessionRoomId,
            "tokenRoomName === roomNamePassedToConnect": tokenRoomName === roomNamePassedToConnect,
          });
          
          if (tokenRoomName !== sessionRoomId) {
            console.warn("[Room Name Mismatch] tokenResponse.roomName differs from streaming_sessions.roomId:", {
              tokenRoomName,
              sessionRoomId,
              difference: "Token room name does not match session room ID",
            });
          }
          
          if (tokenRoomName !== roomNamePassedToConnect) {
            console.warn("[Room Name Mismatch] tokenResponse.roomName differs from roomName passed to joinStream():", {
              tokenRoomName,
              roomNamePassedToConnect,
              difference: "Token room name does not match room name passed to LiveKit connect",
            });
          }
      
          // Use URL from token response if available, otherwise fall back to env var
          const serverUrl = tokenResponse.url || import.meta.env.VITE_LIVEKIT_URL;
          console.log("[onJoin] Joining LiveKit room:", activeSession.roomId, "at", serverUrl);
          
          // ✅ Fix 2: Surface LiveKit connection errors
          let lkRoom;
          try {
            lkRoom = await joinStream({
              token: tokenResponse.token,
              roomName: activeSession.roomId,
              serverUrl,
            });
          } catch (connectError: any) {
            console.error("[onJoin] LiveKit connection failed:", {
              error: connectError,
              message: connectError?.message,
              roomName: activeSession.roomId,
              serverUrl,
              hasToken: !!tokenResponse.token,
              tokenLength: tokenResponse.token?.length,
            });
            
            // Extract actual error message if available
            let errorMsg = "Unable to connect to streaming server. Please check your connection and try again.";
            if (connectError?.message) {
              errorMsg = connectError.message;
            }
            
            setStreamError(errorMsg);
            throw new Error(errorMsg);
          }
          
          console.log("[onJoin] LiveKit room connected, state:", lkRoom.state);
          setRoom(lkRoom);
      
          if (shouldPublish) {
            console.log("[onJoin] Publishing local tracks...");
            setPublishing(true);
            try {
              const tracks = await publishLocal(lkRoom);
              setLocalTracks(tracks);
              console.log("[onJoin] Published", tracks.length, "tracks");
              
              // ✅ Fix 3: Set broadcasting state only after successful publish
              setIsBroadcasting(true);
            } catch (publishError) {
              console.error("[onJoin] Publish failed:", publishError);
              const errorMsg = "Failed to start camera/microphone. Please check permissions and try again.";
              setStreamError(errorMsg); // ✅ Fix 2: Surface publish errors
              setIsBroadcasting(false);
              throw new Error(errorMsg);
            }
          } else {
            console.log("[onJoin] Skipping publish (VIEWER mode)");
          }
        } catch (e) {
          console.error("[onJoin] Error:", e);
          const errorMessage = e instanceof Error ? e.message : "Failed to join stream";
          setJoinError(errorMessage);
          // streamError is already set above for specific errors
          if (!streamError) {
            setStreamError(errorMessage); // ✅ Fix 2: Fallback error display
          }
          throw e; // Re-throw to allow onGoLive to handle it
        } finally {
          setJoining(false);
          setPublishing(false);
        }
      };
  
  // ✅ Auto-join host when conditions are met
  useEffect(() => {
    const shouldAutoJoin = hostParam === "1";
    
    // Conditions: canManageStream === true AND session.active === true AND host=1 AND not already attempted
    if (
      shouldAutoJoin &&
      canManageStream &&
      session?.active &&
      !autoJoinAttemptedRef.current &&
      !loading &&
      !connected &&
      !joining
    ) {
      console.log("[StreamingPanel] Auto-join conditions met, joining as broadcaster...");
      autoJoinAttemptedRef.current = true;
      
      // Call onJoin with publish=true
      onJoin({ publish: true }).catch((e) => {
        console.error("[StreamingPanel] Auto-join failed:", e);
        // Error is already handled by onJoin (sets streamError/joinError)
        // Reset guard on error so user can retry manually
        autoJoinAttemptedRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostParam, canManageStream, session?.id, session?.active, loading, connected, joining]);
            
  // ✅ Fix 1: Make onGoLive() deterministic - ALWAYS attempts to join as broadcaster
  // Never relies on React state timing, always calls onJoin({ publish: true })
  const onGoLive = async () => {
    console.log("[onGoLive] Starting...");
    try {
      setJoining(true);
      setJoinError(null);
      setStreamError(null); // ✅ Fix 2: Clear errors
      setIsBroadcasting(false); // ✅ Fix 3: Reset broadcasting state

      // Strategy: Always fetch fresh session state, never rely on React state
      // This ensures we don't miss a session that was created between renders
      let activeSessionToUse: typeof session | null = null;

      // Step 1: Check if session exists in current state (fast path)
      if (session?.active) {
        console.log("[onGoLive] Active session found in state, using it");
        activeSessionToUse = session;
      } else {
        // Step 2: No session in state - try to create one
        console.log("[onGoLive] No session in state, attempting to create...");
        try {
          const newSession = await createSession();
          console.log("[onGoLive] Session created successfully");
          activeSessionToUse = newSession;
        } catch (createError: any) {
          // Step 3: Creation failed - check if it's because session already exists
          const errorMessage = createError?.message || String(createError);
          if (errorMessage.includes("active session") || errorMessage.includes("already has")) {
            console.log("[onGoLive] Session creation failed - active session exists, fetching...");
            // Fetch fresh session list to get the existing active session
            const activeSessions = await streamingService.getActiveSessions();
            const existingSession = activeSessions.find((s) => s.eventId === eventId && s.active);
            
            if (existingSession) {
              console.log("[onGoLive] Found existing active session");
              activeSessionToUse = existingSession;
              // Update hook state for future renders
              await refetch();
            } else {
              const errorMsg = "Active session exists but could not be retrieved";
              setStreamError(errorMsg); // ✅ Fix 2: Surface error
              throw new Error(errorMsg);
            }
          } else {
            // Other error (permissions, network, etc.)
            const errorMsg = createError?.message || "Failed to create streaming session";
            setStreamError(errorMsg); // ✅ Fix 2: Surface error
            throw createError;
          }
        }
      }

      // Step 4: CRITICAL - Always call onJoin with publish=true
      // This is the deterministic part - we ALWAYS attempt to join as broadcaster
      if (!activeSessionToUse) {
        const errorMsg = "No active session available";
        setStreamError(errorMsg); // ✅ Fix 2: Surface error
        throw new Error(errorMsg);
      }

      console.log("[onGoLive] Joining as broadcaster with session:", activeSessionToUse.id);
      await onJoin({ publish: true, sessionOverride: activeSessionToUse });
      // ✅ Fix 1: No early returns - onJoin always called if we reach here
      
    } catch (e) {
      console.error("[onGoLive] Error:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to go live";
      setJoinError(errorMessage);
      // streamError is already set in onJoin or above, but ensure it's set here too
      if (!streamError) {
        setStreamError(errorMessage); // ✅ Fix 2: Ensure error is visible
      }
    } finally {
      setJoining(false);
    }
  };

  const onEnd = async () => {
    // your hook likely already knows how to end the active one;
    // if it requires sessionId, change useStreaming endSession signature accordingly.
    if (!session) return;
    await endSession(session.id);
    room?.disconnect();
    setRoom(null);
    setIsBroadcasting(false); // ✅ Fix 3: Reset broadcasting state when ending
    setStreamError(null); // ✅ Fix 2: Clear errors
  };

  if (loading) {
    return (
      <div className="border border-gray-800 p-4 rounded-lg text-sm text-gray-400">
        Checking live stream…
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-800 p-4 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  // 🔴 LIVE (session exists and active)
  if (session?.active) {
    return (
      <div className="border border-[#CD000E] bg-[#0B0B0B] p-6 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#CD000E] animate-pulse" />
            <span className="text-[#CD000E] font-heading font-semibold uppercase text-sm">
              Live Now
            </span>

            <StreamingLive
              session={session}
              canManageStream={canManageStream}
              onJoin={() => onJoin({ publish: true })}
              onEnd={() => void onEnd()}
            />
          </div>
        </div>

        {/* ✅ Fix 2: Prominent error display */}
        {(streamError || joinError) && (
          <div className="border-2 border-red-600 bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-400 font-semibold mb-1">Streaming Error</p>
                <p className="text-red-300 text-sm">{streamError || joinError}</p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Fix 3: Host Broadcasting View - Clear indicator when creator is live */}
        {isBroadcasting && canManageStream && (
          <div className="border-2 border-[#CD000E] bg-[#CD000E]/10 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#CD000E] animate-pulse" />
                <span className="text-[#CD000E] font-heading font-bold uppercase text-lg">
                  🔴 You are live
                </span>
              </div>
              <p className="text-gray-300 text-sm ml-auto">
                Your stream is active and broadcasting
              </p>
            </div>
          </div>
        )}

        {!connected ? (
          <div className="flex gap-3">
            <button
              className="px-5 py-2 bg-[#CD000E] hover:bg-[#860005] text-white rounded-lg font-heading uppercase tracking-wide disabled:opacity-50"
              onClick={() => onJoin()}
              disabled={joining}
            >
              {joining ? "Joining…" : "Join Stream"}
            </button>

            {hostParam !== "1" && (
              <button
                className="px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                onClick={() => onJoin({ publish: true })}
                disabled={joining}
              >
                {joining ? "Joining…" : "Join as Host"}
              </button>
            )}

            {canManageStream && (
              <button
                className="px-5 py-2 bg-transparent border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <LiveKitViewer room={room!} />

            {canManageStream && (
              <button
                onClick={() => void onEnd()}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                End Stream
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // 🟡 NOT LIVE YET
  return (
    <div className="border border-gray-800 bg-[#0B0B0B] p-6 rounded-lg space-y-4">
      <p className="text-[#9A9A9A] font-body">This event is not live yet.</p>

      {scheduledStart && (
        <p className="text-xs text-gray-400">
          Scheduled to start at{" "}
          <span className="text-white">{scheduledStart.toLocaleString()}</span>
        </p>
      )}

      {/* ✅ Fix 2: Show errors in "not live" state too */}
      {streamError && (
        <div className="border-2 border-red-600 bg-red-900/20 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-400 font-semibold mb-1">Streaming Error</p>
              <p className="text-red-300 text-sm">{streamError}</p>
            </div>
          </div>
        </div>
      )}

      {canManageStream && (
        <div className="flex gap-3">
          <button
            onClick={() => void onGoLive()}
            disabled={!canGoLive || joining}
            className={`px-5 py-2 rounded-lg font-heading uppercase tracking-wide ${
              canGoLive
                ? "bg-[#CD000E] hover:bg-[#860005] text-white"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {joining ? "Starting…" : "Go Live"}
          </button>

          <button
            onClick={onCancel}
            className="px-5 py-2 bg-transparent border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
