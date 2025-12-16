import { useParams, Link } from "react-router-dom";
import { useEvent, useTransitionEventPhase } from "@/hooks/useEvents";
import { EventPhase, EventStatus } from "../../../../packages/shared/types/event.types";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";

import { StreamingPanel } from "@/components/streaming/StreamingPanel";


export function CreatorEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading, error } = useEvent(id!);
  const transition = useTransitionEventPhase();

  if (isLoading) {
    return <div className="p-6 text-white/60">Loading event…</div>;
  }

  if (error || !event) {
    return <div className="p-6 text-red-400">Event not found</div>;
  }

  const hasTickets =
    Array.isArray(event.ticketTypes) && event.ticketTypes.length > 0;

  function label(value: string) {
    return value.replace(/_/g, " ").toLowerCase();
  }

  function canGoLive(
    phase: EventPhase,
    status: EventStatus
  ) {
    return (
      phase === EventPhase.PRE_LIVE &&
      status !== EventStatus.LIVE
    );
  }
  
  function canEnd(status: EventStatus) {
    return status === EventStatus.LIVE;
  }

  return (
    <CreatorDashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-white">{event.name}</h1>
          <Link
            to="/creator/events"
            className="text-sm text-white/60 hover:text-white"
          >
            ← Back to events
          </Link>
        </div>

        {/* Meta */}
        <div className="space-y-2 text-white/70">
          <div>
            <span className="text-white/40">Status:</span>{" "}
            {label(event.status)}
          </div>
          <div>
            <span className="text-white/40">Phase:</span>{" "}
            {label(event.phase)}
          </div>
          <div>
            <span className="text-white/40">Start:</span>{" "}
            {new Date(event.startTime).toLocaleString()}
          </div>
          {event.location && (
            <div>
              <span className="text-white/40">Location:</span>{" "}
              {event.location}
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="pt-4 border-t border-white/10">
            <h2 className="text-lg font-medium mb-2 text-white">
              Description
            </h2>
            <p className="text-white/70">{event.description}</p>
          </div>
        )}

        {/* Controls */}
        <div className="pt-6 border-t border-white/10 flex flex-wrap gap-3">
        {canGoLive(event.phase, event.status) && (
            <button
                onClick={() =>
                transition.mutate({
                    id: event.id,
                    phase: EventPhase.LIVE,
                })
                }
            >
                Go Live
            </button>
            )}

            {canEnd(event.status) && (
            <button
                onClick={() =>
                transition.mutate({
                    id: event.id,
                    phase: EventPhase.POST_LIVE,
                })
                }
            >
                End Event
            </button>
            )}

        <Link
            to={`/creator/events/${event.id}/edit`}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white font-semibold"
        >
            Edit Event
        </Link>

        <Link
            to={`/creator/events/${event.id}/tickets`}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white font-semibold"
        >
            Tickets
        </Link>
        </div>

        {/* Streaming */}
        <div className="pt-6 border-t border-white/10">
          <StreamingPanel
            eventId={event.id}
            event={{
              status: event.status,
              phase: event.phase,
              startTime: event.startTime,
            }}
            isEntity={true}
          />
        </div>

      </div>
    </CreatorDashboardLayout>
  );
}
