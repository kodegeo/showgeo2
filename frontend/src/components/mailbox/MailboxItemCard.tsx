import { MailboxItem } from "@/hooks/useMailbox";
import { EventPhase } from "@/types/eventPhase";
import { Calendar, Clock, MapPin, ExternalLink, MessageSquare } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
// Date formatting helper (no external dependency)
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours() % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = date.getHours() >= 12 ? "PM" : "AM";
  return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
};

interface MailboxItemCardProps {
  item: MailboxItem;
  onAction?: () => void;
}

export function MailboxItemCard({ item, onAction }: MailboxItemCardProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const metadata = item.metadata || {};
  const eventId = metadata.eventId;
  const eventName = metadata.eventName || "Event";
  const startTime = metadata.startTime;
  const phase = metadata.phase as EventPhase | undefined;
  const ticketId = metadata.ticketId as string | undefined;
  const accessCode = metadata.accessCode as string | undefined;
  const isLive = phase === "LIVE";
  const isPast = phase === "POST_LIVE";

  // Format date if available
  const formattedDate = startTime ? formatDate(startTime) : null;

  // Determine CTA based on type and phase
  const getCTA = (): {
    label: string;
    path: string | null;
    variant: "primary" | "secondary" | "live";
    requiresTicket?: boolean;
  } | null => {
    // ✅ Creator-related messages: Link to Event Dashboard
    // Check for audience action messages (Reminder Sent, Invitation Sent, Reminder Scheduled)
    const isAudienceActionMessage =
      item.title?.toLowerCase().includes("reminder sent") ||
      item.title?.toLowerCase().includes("invitation sent") ||
      item.title?.toLowerCase().includes("reminder scheduled") ||
      item.metadata?.actionType === "SEND_REMINDER" ||
      item.metadata?.actionType === "INVITE_AUDIENCE" ||
      item.metadata?.actionType === "SCHEDULE_REMINDER";

    const isCreatorMessage = 
      item.title?.toLowerCase().includes("set up ticketing") ||
      item.title?.toLowerCase().includes("configure stream") ||
      item.title?.toLowerCase().includes("live introduction") ||
      item.title?.toLowerCase().includes("manage your event") ||
      item.message?.toLowerCase().includes("set up ticketing") ||
      item.message?.toLowerCase().includes("configure stream") ||
      item.message?.toLowerCase().includes("live introduction") ||
      item.message?.toLowerCase().includes("manage your event");

    // ✅ Audience action messages: Link to Event Dashboard (audit trail)
    if ((isAudienceActionMessage || isCreatorMessage) && eventId) {
      return {
        label: "Manage Event",
        path: `/studio/events/${eventId}`,
        variant: "primary" as const,
      };
    }

    if (item.type === "INVITATION") {
      return {
        label: "Register",
        path: eventId ? `/events/${eventId}/register` : null,
        variant: "primary" as const,
      };
    }

    if (item.type === "TICKET") {
      if (isLive) {
        return {
          label: "Watch Event",
          path: eventId ? `/events/${eventId}/watch` : null,
          variant: "live" as const,
          requiresTicket: true,
        };
      }
      if (isPast) {
        return {
          label: "View Ticket",
          path: null,
          variant: "secondary" as const,
        };
      }
      return {
        label: "View Ticket",
        path: eventId ? `/events/${eventId}` : null,
        variant: "secondary" as const,
      };
    }

    if (item.type === "NOTIFICATION" && isLive) {
      return {
        label: "Watch Event",
        path: eventId ? `/events/${eventId}/watch` : null,
        variant: "live" as const,
        requiresTicket: true,
      };
    }

    if (item.type === "EVENT_UPDATE" && isLive) {
      return {
        label: "Watch Event",
        path: eventId ? `/events/${eventId}/watch` : null,
        variant: "live" as const,
        requiresTicket: true,
      };
    }

    // Audience messages: Link to event if available
    if (item.type === "AUDIENCE_MESSAGE" || item._isAudienceMessage) {
      if (eventId) {
        return {
          label: "View Event",
          path: `/events/${eventId}`,
          variant: "primary" as const,
        };
      }
      return null;
    }

    return null;
  };

  const cta = getCTA();
  const isAudienceMessage = 
    item.type === "AUDIENCE_MESSAGE" || 
    item._isAudienceMessage ||
    item._messageClassification === "audience_message";
  const isSystemMessage = item._messageClassification === "system_message";
  const senderEntityName = item._senderEntityName || metadata.entityName;

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isSystemMessage
          ? item.isRead
            ? "bg-gray-900/30 border-gray-800/50"
            : "bg-gray-900/40 border-gray-800"
          : item.isRead
          ? "bg-gray-900/50 border-gray-800"
          : isAudienceMessage
          ? "bg-blue-900/20 border-blue-700"
          : "bg-gray-900 border-gray-700"
      } ${isLive ? "ring-2 ring-red-500/50" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isAudienceMessage && (
              <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
            )}
            <h3
              className={
                isAudienceMessage
                  ? "font-bold text-white text-base"
                  : isSystemMessage
                  ? "font-medium text-gray-300 text-sm"
                  : "font-semibold text-white"
              }
            >
              {item.title}
            </h3>
            {/* Status Badges */}
            {isSystemMessage && (
              <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs font-medium rounded-full">
                System
              </span>
            )}
            {isAudienceMessage && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                MESSAGE
              </span>
            )}
            {item.type === "INVITATION" && (
              <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs font-bold rounded-full">
                INVITED
              </span>
            )}
            {item.type === "TICKET" && !isLive && !isPast && (
              <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full">
                REGISTERED
              </span>
            )}
            {isLive && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                LIVE
              </span>
            )}
            {!item.isRead && isAudienceMessage && (
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
            {!item.isRead && !isAudienceMessage && (
              <span className="w-2 h-2 bg-gray-500 rounded-full" />
            )}
          </div>
          <p
            className={
              isSystemMessage
                ? "text-xs text-gray-500"
                : isAudienceMessage
                ? "text-sm text-gray-300"
                : "text-sm text-gray-400"
            }
          >
            {item.message}
          </p>
          {isAudienceMessage && senderEntityName && (
            <p className="text-xs text-blue-400 mt-1 font-medium">
              From {senderEntityName}
            </p>
          )}
        </div>
      </div>

      {/* Event Metadata */}
      {eventId && (
        <div className="space-y-2 mb-3 text-sm text-gray-300">
          {eventName && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{eventName}</span>
            </div>
          )}
          {formattedDate && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
          )}
          {phase && (
            <div className="flex items-center gap-2">
              <span className="capitalize text-gray-400">
                Status: {phase.replace("_", " ").toLowerCase()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* CTA Button */}
      {cta && (
        <div className="mt-4">
          {cta.path ? (
            <button
              onClick={() => {
                // Navigate with ticket authorization data in state
                // ⚠️ STRICT RULE: Logged-in users pass ticketId only, logged-out users pass accessCode only
                if (cta.requiresTicket && eventId) {
                  const navigationState: { ticketId?: string; accessCode?: string } = {};
                  
                  if (isAuthenticated) {
                    // Logged-in user: pass ticketId only (NOT accessCode)
                    if (ticketId) {
                      navigationState.ticketId = ticketId;
                    }
                  } else {
                    // Logged-out user: pass accessCode only (NOT ticketId)
                    if (accessCode) {
                      navigationState.accessCode = accessCode;
                    }
                  }
                  
                  navigate(`/events/${eventId}/watch`, {
                    state: navigationState,
                  });
                } else {
                  navigate(cta.path);
                }
                onAction?.();
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                cta.variant === "live"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : cta.variant === "primary"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
            >
              {cta.label}
              <ExternalLink className="w-4 h-4" />
            </button>
          ) : (
            <button
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                cta.variant === "live"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : cta.variant === "primary"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              onClick={onAction}
              disabled
            >
              {cta.label}
            </button>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-3 text-xs text-gray-500">
        {formatDate(item.createdAt).split(" at ")[0]}
      </div>
    </div>
  );
}

