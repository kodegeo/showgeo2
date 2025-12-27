import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useStreaming } from "@/hooks/useStreaming";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { streamingService } from "@/services";
import { joinStream } from "@/lib/livekit/joinStream";
// Removed publishLocal import - using setCameraEnabled/setMicrophoneEnabled instead
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

  const { session, loading, error, createSession, endSession, refetch, getActiveSession } = useStreaming(eventId);
  const { room, setRoom, connected } = useLiveKitRoom();
  
  // Token generation guard: blocks concurrent token requests (not "one per session")
  const hasRequestedTokenRef = useRef(false);
  
  // Auto-join guard: ensures auto-join only happens once
  const autoJoinAttemptedRef = useRef(false);
  
  // ✅ Reset join state helper: clears joining state, errors, and token guard
  const resetJoinState = useCallback(() => {
    console.log("[StreamingPanel] Resetting join state");
    setJoining(false);
    setJoinError(null);
    hasRequestedTokenRef.current = false;
  }, []);
  
  const canManageStream = useMemo(() => {
    return (
      !!isEntityProp ||
      !!user?.isEntity ||
      user?.role === "ADMIN" ||
      user?.role === "COORDINATOR"
    );
  }, [isEntityProp, user?.isEntity, user?.role]);

  const scheduledStart =
    event?.startTime && new Date(event.startTime) > new Date()
      ? new Date(event.startTime)
      : null;

  // ✅ Fix 5: Wrap onJoin in useCallback to fix auto-join effect dependencies
  const onJoin = useCallback(async (opts?: { publish?: boolean; sessionOverride?: typeof session }) => {
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
      
        // ✅ Block concurrent token requests (not "one per session")
        if (hasRequestedTokenRef.current) {
          const errorMsg = "Token request already in progress. Please wait for the current request to complete.";
          console.warn("[onJoin] Concurrent token request blocked:", {
            hasRequestedToken: hasRequestedTokenRef.current,
            sessionId: activeSession.id,
            shouldPublish
          });
          setStreamError(errorMsg);
          throw new Error(errorMsg);
        }
      
        try {
          setJoining(true);
          setJoinError(null);
          setStreamError(null);
          setIsBroadcasting(false);
          
          // ✅ Set guard BEFORE token generation to prevent concurrent requests
          hasRequestedTokenRef.current = true;
          
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
          
          console.log("[onJoin] Token response (raw):", tokenResponse);
          console.log("[onJoin] Token response (parsed):", { 
            hasToken: !!tokenResponse?.token, 
            tokenType: typeof tokenResponse?.token,
            tokenValue: typeof tokenResponse?.token === 'string' ? tokenResponse.token.substring(0, 50) + '...' : tokenResponse?.token,
            fullResponse: tokenResponse,
            responseKeys: tokenResponse ? Object.keys(tokenResponse) : []
          });
      
          // Extract and validate token - handle potential nested structures
          let tokenString: string;
          
          // Handle tokenResponse - it should be { token: string } but handle edge cases
          if (tokenResponse && typeof tokenResponse === 'object' && 'token' in tokenResponse) {
            // Normal case: tokenResponse.token should be a string
            if (typeof tokenResponse.token === 'string' && tokenResponse.token.length > 0) {
              tokenString = tokenResponse.token;
            } else if (tokenResponse.token && typeof tokenResponse.token === 'object') {
              // If token is an object, try to extract the actual token string
              // Check common nested structures
              const tokenObj = tokenResponse.token as any;
              if (tokenObj.token && typeof tokenObj.token === 'string' && tokenObj.token.length > 0) {
                tokenString = tokenObj.token;
              } else if (tokenObj.accessToken && typeof tokenObj.accessToken === 'string' && tokenObj.accessToken.length > 0) {
                tokenString = tokenObj.accessToken;
              } else {
                const errorMsg = `Invalid token format: token is an object but no valid token field found. Structure: ${JSON.stringify(tokenObj)}`;
                console.error("[onJoin] Token validation failed:", {
                  token: tokenResponse.token,
                  tokenType: typeof tokenResponse.token,
                  fullResponse: tokenResponse
                });
                setStreamError(errorMsg);
                hasRequestedTokenRef.current = false;
                throw new Error(errorMsg);
              }
            } else if (typeof tokenResponse.token === 'string' && tokenResponse.token.length === 0) {
              const errorMsg = `Invalid token: token field is an empty string. Backend may have failed to generate token.`;
              console.error("[onJoin] Token validation failed:", {
                token: tokenResponse.token,
                tokenType: typeof tokenResponse.token,
                fullResponse: tokenResponse
              });
              setStreamError(errorMsg);
              hasRequestedTokenRef.current = false;
              throw new Error(errorMsg);
            } else {
              const errorMsg = `Invalid token format: token field is not a string. Got: ${typeof tokenResponse.token}`;
              console.error("[onJoin] Token validation failed:", {
                token: tokenResponse.token,
                tokenType: typeof tokenResponse.token,
                fullResponse: tokenResponse
              });
              setStreamError(errorMsg);
              hasRequestedTokenRef.current = false;
              throw new Error(errorMsg);
            }
          } else {
            const errorMsg = `Invalid token response: missing or empty token field. Response structure: ${JSON.stringify(tokenResponse)}`;
            console.error("[onJoin] Token validation failed:", {
              tokenResponse,
              responseKeys: tokenResponse ? Object.keys(tokenResponse) : [],
              fullResponse: tokenResponse
            });
            setStreamError(errorMsg);
            hasRequestedTokenRef.current = false;
            throw new Error(errorMsg);
          }
      
          // ✅ Final validation: ensure tokenString is a non-empty string before use
          // After this point, only use the validated tokenString (aliased as 'token')
          if (typeof tokenString !== "string" || !tokenString.length) {
            const errorMsg = "Invalid LiveKit token: token must be a non-empty string";
            console.error("[onJoin] Invalid token:", { 
              tokenString, 
              tokenType: typeof tokenString,
              tokenLength: tokenString?.length,
              fullResponse: tokenResponse 
            });
            setStreamError(errorMsg);
            hasRequestedTokenRef.current = false;
            throw new Error(errorMsg);
          }
          
          // ✅ Use validated tokenString - do NOT use tokenResponse.token after this point
          const token = tokenString;
      
          // ✅ Single-token authorization model:
          // - Room name is embedded in token (computed by backend as event-${eventId})
          // - LiveKit URL comes ONLY from environment config, never from backend
          // - Frontend never receives or computes roomName
          const serverUrl = import.meta.env.VITE_LIVEKIT_URL;
          if (!serverUrl) {
            const errorMsg = "LiveKit server URL not configured. Please set VITE_LIVEKIT_URL environment variable.";
            console.error("[onJoin] Missing LiveKit URL:", { env: import.meta.env });
            setStreamError(errorMsg);
            hasRequestedTokenRef.current = false; // Reset guard on config failure
            throw new Error(errorMsg);
          }
          console.log("[onJoin] Joining LiveKit room (room name embedded in token) at", serverUrl);
          console.log("[onJoin] Using token (first 50 chars):", token.substring(0, 50) + '...');
          
          // ✅ Connect to LiveKit room
          let lkRoom;
          try {
            lkRoom = await joinStream({
              token,
              serverUrl,
            });
            
            // ✅ Reset guard immediately after successful connection
            console.log("[onJoin] LiveKit room connected, state:", lkRoom.state);
            hasRequestedTokenRef.current = false;
            setRoom(lkRoom);
            
            // ✅ Fix 2: Wait for engine to be ready before publishing
            // ConnectionState.Connected doesn't guarantee engine readiness
            if (shouldPublish) {
              console.log("[onJoin] Waiting for engine readiness before publishing...");
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (connectError: any) {
            console.error("[onJoin] LiveKit connection failed:", {
              error: connectError,
              message: connectError?.message,
              roomName: activeSession.roomId,
              serverUrl,
              hasToken: !!token,
              tokenLength: token?.length,
            });
            
            // ✅ Reset guard immediately after failed connection
            hasRequestedTokenRef.current = false;
            
            // Extract actual error message if available
            let errorMsg = "Unable to connect to streaming server. Please check your connection and try again.";
            if (connectError?.message) {
              errorMsg = connectError.message;
            }
            
            setStreamError(errorMsg);
            throw new Error(errorMsg);
          }
      
          if (shouldPublish) {
            console.log("[onJoin] Enabling camera and microphone...");
            setPublishing(true);
            try {
              // ✅ Use LiveKit's managed track APIs instead of manual publishLocal
              // This prevents conflicts with BroadcasterControls which also uses setCameraEnabled
              await lkRoom.localParticipant.setCameraEnabled(true);
              await lkRoom.localParticipant.setMicrophoneEnabled(true);
              
              console.log("[onJoin] Camera and microphone enabled");
              
              // ✅ Set broadcasting state only after successful enable
              setIsBroadcasting(true);
            } catch (publishError) {
              console.error("[onJoin] Failed to enable camera/microphone:", publishError);
              const errorMsg = "Failed to start camera/microphone. Please check permissions and try again.";
              setStreamError(errorMsg);
              setIsBroadcasting(false);
              throw new Error(errorMsg);
            } finally {
              setPublishing(false);
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
            setStreamError(errorMessage);
          }
          // ✅ Guard is already reset in catch blocks above, but ensure it's reset here too
          hasRequestedTokenRef.current = false;
          throw e; // Re-throw to allow onGoLive to handle it
        } finally {
          setJoining(false);
          setPublishing(false);
        }
      }, [session, eventId, canManageStream, setRoom]);
  
  // Auto-join creator as BROADCASTER when session is active but not connected
  // This enforces broadcaster-first workflow: creators start streaming immediately
  useEffect(() => {
    // Viewers NEVER auto-generate tokens
    if (!canManageStream) {
      return;
    }
    
    // Only proceed if all conditions are met (no hasRequestedTokenRef check - allows retries)
    if (
      session?.active &&
      !autoJoinAttemptedRef.current &&
      !loading &&
      !connected &&
      !joining
    ) {
      console.log("[StreamingPanel] Auto-joining creator as BROADCASTER (broadcaster-first workflow)");
      autoJoinAttemptedRef.current = true;
      
      // Immediately connect and publish - no waiting for viewers
      onJoin({ publish: true }).catch((e) => {
        console.error("[StreamingPanel] Auto-join failed:", e);
        // Error is already handled by onJoin (sets streamError/joinError)
        // Reset auto-join guard on error so user can retry manually
        autoJoinAttemptedRef.current = false;
      });
    }
  }, [canManageStream, session?.id, session?.active, loading, connected, joining, onJoin]);
            
  // ✅ Refactored onGoLive: Supports joining existing active sessions
  // Flow: If session exists → join, Else → create → join
  const onGoLive = async () => {
    console.log("[onGoLive] Starting...");
    try {
      setJoining(true);
      setJoinError(null);
      setStreamError(null);
      setIsBroadcasting(false);

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
          
          // ✅ createSession() returns null when active session already exists (not an error)
          // This allows StreamingPanel to pivot to getActiveSession() without throwing
          if (newSession === null) {
            console.log("[onGoLive] createSession returned null - active session exists, fetching...");
            const existingSession = await getActiveSession();
            
            if (existingSession && existingSession.active === true) {
              console.log("[onGoLive] Found existing active session, proceeding to join:", existingSession.id);
              activeSessionToUse = existingSession;
              await refetch();
            } else {
              const errorMsg = "Active session exists but could not be retrieved";
              console.error("[onGoLive] createSession returned null but no active session found");
              setStreamError(errorMsg);
              throw new Error(errorMsg);
            }
          } else {
            console.log("[onGoLive] Session created successfully");
            activeSessionToUse = newSession;
          }
        } catch (createError: any) {
          // Step 3: Creation failed with a real error (permissions, network, etc.)
          // Only throw if no active session exists to fall back to
          console.error("[onGoLive] Session creation failed with error:", createError);
          
          const existingSession = await getActiveSession();
          if (existingSession && existingSession.active === true) {
            console.log("[onGoLive] Found active session despite create error, proceeding to join");
            activeSessionToUse = existingSession;
            await refetch();
          } else {
            const errorMsg = createError?.message || "Failed to create streaming session";
            setStreamError(errorMsg);
            throw createError;
          }
        }
      }

      // Step 4: CRITICAL - Always call onJoin with publish=true if we have a session
      if (!activeSessionToUse) {
        const errorMsg = "No active session available";
        setStreamError(errorMsg);
        throw new Error(errorMsg);
      }

      console.log("[onGoLive] Joining as broadcaster with session:", activeSessionToUse.id);
      try {
        await onJoin({ publish: true, sessionOverride: activeSessionToUse });
        
        // ✅ Redirect to live page after successful join
        console.log("[onGoLive] Join successful, redirecting to live page");
        navigate(`/events/${eventId}/live`, { replace: true });
      } catch (joinError) {
        // ✅ Ensure joining state is cleared if joinStream throws
        console.error("[onGoLive] Join failed:", joinError);
        setJoining(false);
        // Error is already handled by onJoin (sets streamError/joinError)
        throw joinError;
      }
      
    } catch (e) {
      console.error("[onGoLive] Error:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to go live";
      setJoinError(errorMessage);
      // streamError is already set in onJoin or above, but ensure it's set here too
      if (!streamError) {
        setStreamError(errorMessage);
      }
    } finally {
      setJoining(false);
    }
  };

  const onEnd = async () => {
    if (!session) return;
    await endSession(session.id);
    room?.disconnect();
    setRoom(null);
    setIsBroadcasting(false);
    setStreamError(null);
    
    // ✅ Reset join state when session ends
    resetJoinState();
    autoJoinAttemptedRef.current = false;
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

  // State 1: No session → Show Go Live button
  if (!session?.active) {
    return (
      <div className="border border-gray-800 bg-[#0B0B0B] p-6 rounded-lg space-y-4">
        <p className="text-[#9A9A9A] font-body">This event is not live yet.</p>

        {scheduledStart && (
          <p className="text-xs text-gray-400">
            Scheduled to start at{" "}
            <span className="text-white">{scheduledStart.toLocaleString()}</span>
          </p>
        )}

        {/* Error display */}
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
              disabled={joining}
              className="px-5 py-2 bg-[#CD000E] hover:bg-[#860005] text-white rounded-lg font-heading uppercase tracking-wide disabled:opacity-50"
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

  // State 2: Session active but not connected
  // For creators: Auto-join is triggered by useEffect above
  // For viewers: Show join button
  if (session.active && !connected) {
    // If creator, show connecting state (auto-join in progress)
    if (canManageStream) {
      return (
        <div className="border border-[#CD000E] bg-[#0B0B0B] p-6 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#CD000E] animate-pulse" />
            <span className="text-[#CD000E] font-heading font-semibold uppercase text-sm">
              Connecting...
            </span>
          </div>

          <p className="text-[#9A9A9A] font-body">
            {joining ? "Joining stream and starting broadcast..." : "Preparing to go live..."}
          </p>

          {/* Error display */}
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

          {/* Manual retry button if auto-join failed */}
          {!joining && (streamError || joinError) && (
            <div className="flex gap-3">
              <button
                className="px-5 py-2 bg-[#CD000E] hover:bg-[#860005] text-white rounded-lg font-heading uppercase tracking-wide"
                onClick={() => {
                  resetJoinState(); // ✅ Reset join state before retry
                  autoJoinAttemptedRef.current = false;
                  onJoin({ publish: true });
                }}
              >
                Retry Join
              </button>
              <button
                className="px-5 py-2 bg-transparent border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      );
    }

    // For viewers: Show join button
    return (
      <div className="border border-[#CD000E] bg-[#0B0B0B] p-6 rounded-lg space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#CD000E] animate-pulse" />
          <span className="text-[#CD000E] font-heading font-semibold uppercase text-sm">
            Stream Ready
          </span>
        </div>

        <p className="text-[#9A9A9A] font-body">
          The stream is ready. Click below to join as a viewer.
        </p>

        {/* Error display */}
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

        <button
          className="px-5 py-2 bg-[#CD000E] hover:bg-[#860005] text-white rounded-lg font-heading uppercase tracking-wide disabled:opacity-50"
          onClick={() => onJoin()}
          disabled={joining}
        >
          {joining ? "Joining…" : "Join Stream"}
        </button>
      </div>
    );
  }

  // State 3: Connected → Redirect to live page
  // After successful join, user should be redirected to /events/:eventId/live
  // This state should not normally be reached if redirect works correctly
  // ✅ Fix 1: Move navigate() to useEffect to avoid React render violation
  useEffect(() => {
    if (connected && room && canManageStream) {
      console.log("[StreamingPanel] Connected, redirecting to live page");
      navigate(`/events/${eventId}/live`, { replace: true });
    }
  }, [connected, room, canManageStream, navigate, eventId]);

  if (connected && room) {
    // Show loading state while redirect happens
    return (
      <div className="border border-[#CD000E] bg-[#0B0B0B] p-6 rounded-lg">
        <p className="text-gray-400">Redirecting to live page...</p>
      </div>
    );
  }

  // This should not be reached in normal flow
  return (
    <div className="border border-[#CD000E] bg-[#0B0B0B] p-6 rounded-lg">
      <p className="text-gray-400">Unexpected state</p>
    </div>
  );
}
