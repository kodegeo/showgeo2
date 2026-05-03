import { useParams } from "react-router-dom";
import { EventLifecycleManager } from "@/lib/event-client";
import { CoordinatorLiveViewer } from "@/components/live/CoordinatorLiveViewer";

/**
 * Route: /studio/events/:id/control
 *
 * Coordinator/control-room page. Uses the same unified handshake as audience
 * and creator viewers, but renders an operational shell. Access gating is
 * enforced by the StudioRoute guard wrapping the route in App.tsx, plus the
 * backend's checkEventPermissions for streaming token issuance.
 */
export function CoordinatorLivePage() {
  const { id: eventId } = useParams<{ id: string }>();

  if (!eventId) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-white/60">
        Missing event id.
      </div>
    );
  }

  return (
    <EventLifecycleManager eventId={eventId}>
      <CoordinatorLiveViewer eventId={eventId} />
    </EventLifecycleManager>
  );
}
