import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { LiveKitRoom } from "@livekit/components-react";
import { ViewerPlayer } from "@/components/streaming/ViewerPlayer";
import { useStreaming } from "@/hooks/useStreaming";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { useConsentRequired } from "@/hooks/useConsent";
import { useModalContext } from "@/state/creator/modalContext";
import { useEntityContext } from "@/hooks/useEntityContext";
import { streamingService } from "@/services";

export function EventWatchPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { currentEntity } = useEntityContext();
  const { session, loading: sessionLoading, refetch } = useStreaming(eventId!);
  const { data: event, isLoading: eventLoading } = useEvent(eventId!);
  const consentRequired = useConsentRequired();
  const { openModal } = useModalContext();
  
  // Check if current user is the event creator
  const isEventCreator = event && currentEntity && event.entityId === currentEntity.id;
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Extract ticket authorization from navigation state or query params
  const ticketId = (location.state as any)?.ticketId || searchParams.get("ticketId") || undefined;
  const accessCode = (location.state as any)?.accessCode || searchParams.get("accessCode") || undefined;

  const generateViewerToken = async () => {
    if (!session?.active || token || connecting) {
      return;
    }

    setConnecting(true);
    setError(null);
    
    // ⚠️ STRICT RULE: ALL VIEWER access requires a valid ticket
    // Logged-in users: pass ticketId only (NOT accessCode)
    // Logged-out users: pass accessCode only (NOT ticketId)
    const tokenRequestBody: {
      streamRole: "VIEWER";
      ticketId?: string;
      accessCode?: string;
    } = {
      streamRole: "VIEWER",
    };

    if (isAuthenticated) {
        // Logged-in user: use ticketId only
        if (ticketId) {
          tokenRequestBody.ticketId = ticketId;
        } else {
          setError("Ticket ID is required for authenticated users. Please check your mailbox.");
          setConnecting(false);
          return;
        }
      } else {
        // Logged-out user: use accessCode only
        if (accessCode) {
          tokenRequestBody.accessCode = accessCode;
        } else {
          setError("Access code is required for guest users. Please check your mailbox or log in.");
          setConnecting(false);
          return;
        }
      }

      console.log("[EventWatchPage] About to call generateToken:", {
        eventId: eventId!,
        isAuthenticated,
        ticketId: isAuthenticated ? ticketId : undefined,
        accessCode: !isAuthenticated ? accessCode : undefined,
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
        .catch((err: any) => {
          console.error("Failed to generate viewer token:", err);
          
          // ✅ Handle 403 Forbidden - stop retrying and show clear error
          if (err?.response?.status === 403) {
            const errorMessage = err?.response?.data?.message || err?.message || "";
            
            // Check if error is about Code of Conduct (allow retry after acceptance)
            if (errorMessage.includes("Code of Conduct") || errorMessage.includes("consent")) {
              if (isAuthenticated) {
                openModal("codeOfConduct", {
                  onAccept: () => {
                    // Retry after acceptance
                    generateViewerToken();
                  },
                });
                setConnecting(false);
                return; // Don't set error, modal will handle it
              } else {
                setError("You must accept the Code of Conduct. Please log in to accept it.");
                setConnecting(false);
                return; // Stop here, no retries
              }
            }
            
            // ✅ For all other 403 errors, show clear message and stop retrying
            if (
              errorMessage.includes("already been used") ||
              errorMessage.includes("already been claimed") ||
              errorMessage.includes("already been redeemed")
            ) {
              setError("This ticket has already been used or claimed. Please log into Showgeo or check your mailbox.");
            } else if (errorMessage.includes("session not ready") || errorMessage.includes("streaming session")) {
              setError("Streaming session not ready. Try again.");
            } else {
              setError("You need a valid ticket to watch this event. Please check your mailbox for your ticket.");
            }
            setConnecting(false);
            return; // Stop here, no retries
          }
          
          // Handle other errors
          if (err?.message?.includes("ticket") || err?.message?.includes("Forbidden")) {
            setError("You need a valid ticket to watch this event. Please check your mailbox for your ticket.");
          } else {
            setError(err instanceof Error ? err.message : "Failed to connect to the stream.");
          }
          setConnecting(false);
        });
  };

  // Generate viewer token when session becomes active
  useEffect(() => {
    // ✅ Don't retry if there's already an error (prevents repeated 403 retries)
    if (session?.active && !token && !connecting && !error) {
      // Check Code of Conduct consent for authenticated users
      if (isAuthenticated && consentRequired) {
        openModal("codeOfConduct", {
          onAccept: () => {
            // Retry token generation after acceptance
            generateViewerToken();
          },
        });
        return;
      }

      generateViewerToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.active, token, connecting, isAuthenticated, consentRequired, openModal, error]);

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
        <div className="text-center text-red-400 p-6 max-w-md">
          <p className="mb-4 text-lg">{error}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/profile/mailbox")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Mailbox
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Log in to Showgeo
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
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
      {/* ✅ Manage Event link for creators */}
      {isEventCreator && eventId && (
        <div className="fixed top-4 right-4 z-50">
          <Link
            to={`/creator/events/${eventId}`}
            className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50"
          >
            Manage Event
          </Link>
        </div>
      )}
      <ViewerPlayer 
        session={session} 
        event={event || undefined}
        onLeave={() => navigate(-1)}
      />
    </LiveKitRoom>
  );
}
