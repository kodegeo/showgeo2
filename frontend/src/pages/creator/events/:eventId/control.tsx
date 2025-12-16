import { useParams } from "react-router-dom";
import { EventPhase, EventStatus } from "@shared/types";
import { useEvent } from "@/hooks/useEvents";
import { eventsService } from "@/services/events.service";

export default function EventControlPage() {
  const { eventId } = useParams<{ eventId: string }>();

  const { data: event, isLoading } = useEvent(eventId!);

  const currentPhase = event?.phase;

  const canLaunchPreLIVE = !currentPhase;
  const canLaunchLIVE = currentPhase === EventPhase.PRE_LIVE;

  const canEndLIVE = currentPhase === EventPhase.LIVE;

  const handleLaunchPreLIVE = async () => {
    if (!eventId) return;
  
    const confirmed = window.confirm(
      "Launch Pre-LIVE?\n\nThis will open the event for testing and preparation."
    );
  
    if (!confirmed) return;
  
    await eventsService.update(eventId, {
      phase: EventPhase.PRE_LIVE,
      status: EventStatus.SCHEDULED,
    });
  };
  
  const handleLaunchLIVE = async () => {
    if (!eventId) return;
  
    const confirmed = window.confirm(
      "Go LIVE now?\n\nAttendees will be able to view the event immediately."
    );
  
    if (!confirmed) return;
  
    await eventsService.update(eventId, {
      phase: EventPhase.LIVE,
      status: EventStatus.LIVE,
    });
  };
  
  const handleEndLIVE = async () => {
    if (!eventId) return;
  
    const confirmed = window.confirm(
      "End the LIVE?\n\nThis will disconnect all viewers and move the event to Post-LIVE."
    );
  
    if (!confirmed) return;
  
    await eventsService.update(eventId, {
      phase: EventPhase.POST_LIVE,
      status: EventStatus.COMPLETED,
    });
  };
  
  if (isLoading) {
    return <div className="p-6 text-white">Loading event…</div>;
  }

  if (!event) {
    return <div className="p-6 text-red-400">Event not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading text-white">Event Control</h1>
        <p className="text-sm text-gray-400">{event.name}</p>
      </div>
  
      {/* Current State */}
      <div className="rounded-lg border border-gray-800 p-4">
        <p className="text-sm text-gray-400 mb-1">Current Phase</p>
        <p className="text-lg font-semibold text-white">
          {event.phase ?? "Not Started"}
        </p>
  
        <p className="text-sm text-gray-400 mt-2">Status</p>
        <p className="text-white">{event.status}</p>
      </div>
  
      {/* 🔹 TEST STREAM (PRE-LIVE ONLY) */}
      {event.phase === EventPhase.PRE_LIVE && (
        <div className="rounded-lg border border-gray-800 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white">
            Stream Test
          </h3>
  
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            <span className="text-gray-500">
              Test stream preview (LiveKit)
            </span>
          </div>
  
          <p className="text-xs text-gray-400">
            Visible only to coordinators
          </p>
        </div>
      )}
  
      {/* Controls */}
      <div className="space-y-3">
        <button
          disabled={!canLaunchPreLIVE}
          onClick={handleLaunchPreLIVE}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          Launch Pre-LIVE
        </button>
  
        <button
          disabled={!canLaunchLIVE}
          onClick={handleLaunchLIVE}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          Launch LIVE
        </button>
  
        <button
          disabled={!canEndLIVE}
          onClick={handleEndLIVE}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          End LIVE
        </button>
      </div>
    </div>
  );
  }
