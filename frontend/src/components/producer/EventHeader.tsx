import { EventPhase, EventStatus } from "@/types/eventPhase";
import type { Event } from "@/types/event.types";
import { useModalContext } from "@/state/creator/modalContext";

/**
 * Event Header Component
 * 
 * Displays event information at the top of the console
 * Shows event name, status, timing, and location
 * 
 * Phase 5C.1: Accepts real Event type from API
 * Phase 5C.3: Adds phase transition controls
 */

interface EventHeaderProps {
  event: Event;
  onPhaseChange?: (newPhase: EventPhase) => void;
}

export function EventHeader({ event, onPhaseChange }: EventHeaderProps) {
  const { openModal } = useModalContext();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getPhaseLabel = (phase: EventPhase) => {
    return phase.replace(/_/g, " ");
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case "LIVE":
        return "text-red-400";
      case "SCHEDULED":
        return "text-blue-400";
      case "COMPLETED":
        return "text-gray-400";
      default:
        return "text-white/60";
    }
  };

  const getNextPhase = (currentPhase: EventPhase): EventPhase | null => {
    switch (currentPhase) {
      case "PRE_LIVE":
        return "LIVE";
      case "LIVE":
        return "POST_LIVE";
      case "POST_LIVE":
        return null; // No forward transition
      default:
        return null;
    }
  };

  const handleAdvancePhase = () => {
    const nextPhase = getNextPhase(event.phase);
    if (!nextPhase) {
      return;
    }

    openModal("confirmPhaseTransition", {
      eventId: event.id,
      eventName: event.name,
      currentPhase: event.phase,
      nextPhase,
    });
  };

  const canAdvancePhase = getNextPhase(event.phase) !== null;

  return (
    <div className="mb-6 space-y-4">
      {/* Event Title and Actions */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-white mb-2">{event.name}</h2>
          {event.description && (
            <p className="text-white/60 text-sm">{event.description}</p>
          )}
        </div>
        {/* Advance Phase Button */}
        {canAdvancePhase && (
          <button
            onClick={handleAdvancePhase}
            className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors uppercase tracking-wider"
            title={`Advance event from ${getPhaseLabel(event.phase)} to ${getPhaseLabel(getNextPhase(event.phase)!)}`}
          >
            Advance Phase
          </button>
        )}
      </div>

      {/* Event Metadata */}
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-white/40">Phase:</span>{" "}
          <span className="text-white/80 font-medium">
            {getPhaseLabel(event.phase)}
          </span>
        </div>
        <div>
          <span className="text-white/40">Status:</span>{" "}
          <span className={`font-medium ${getStatusColor(event.status)}`}>
            {event.status}
          </span>
        </div>
        <div>
          <span className="text-white/40">Starts:</span>{" "}
          <span className="text-white/80">{formatDate(event.startTime)}</span>
        </div>
        {event.endTime && (
          <div>
            <span className="text-white/40">Ends:</span>{" "}
            <span className="text-white/80">{formatDate(event.endTime)}</span>
          </div>
        )}
        {event.location && (
          <div>
            <span className="text-white/40">Location:</span>{" "}
            <span className="text-white/80">{event.location}</span>
          </div>
        )}
        <div>
          <span className="text-white/40">Type:</span>{" "}
          <span className="text-white/80">
            {event.isVirtual ? "Virtual" : "In-Person"}
          </span>
        </div>
      </div>
    </div>
  );
}

