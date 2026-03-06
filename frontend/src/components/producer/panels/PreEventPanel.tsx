/**
 * Pre-Event Panel
 * 
 * Manages pre-event activities and setup
 * 
 * TODO Phase 5C:
 * - Add event setup checklist
 * - Add ticket management preview
 * - Add streaming setup controls
 * - Add pre-event activity management
 */

interface PreEventPanelProps {
  eventId: string;
  eventPhase: EventPhase;
  userRole: string;
}

import { EventPhase } from "@/types/eventPhase";

export function PreEventPanel({
  eventId,
  eventPhase,
  userRole,
}: PreEventPanelProps) {
  const isActive = eventPhase === EventPhase.PRE_LIVE;

  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-xl font-semibold mb-4">Event Setup</h3>
        <p className="text-white/60 text-sm mb-4">
          Configure your event before going live.
        </p>

        {/* Placeholder sections */}
        <div className="space-y-4">
          <div className="bg-white/5 rounded p-4 border border-white/10">
            <h4 className="font-medium mb-2">Streaming Configuration</h4>
            <p className="text-white/50 text-sm">
              TODO Phase 5C: Add streaming setup controls
            </p>
            <button
              disabled
              className="mt-3 px-4 py-2 bg-blue-600/50 text-white/50 rounded text-sm cursor-not-allowed"
              title="Coming in Phase 5C"
            >
              Configure Stream
            </button>
          </div>

          <div className="bg-white/5 rounded p-4 border border-white/10">
            <h4 className="font-medium mb-2">Ticket Management</h4>
            <p className="text-white/50 text-sm">
              TODO Phase 5C: Add ticket preview and management
            </p>
            <button
              disabled
              className="mt-3 px-4 py-2 bg-blue-600/50 text-white/50 rounded text-sm cursor-not-allowed"
              title="Coming in Phase 5C"
            >
              Manage Tickets
            </button>
          </div>

          <div className="bg-white/5 rounded p-4 border border-white/10">
            <h4 className="font-medium mb-2">Go Live</h4>
            <p className="text-white/50 text-sm mb-3">
              {isActive
                ? "Ready to start your event? Click below to go live."
                : "Event is not in PRE_LIVE phase."}
            </p>
            <button
              disabled={!isActive}
              className={`mt-3 px-4 py-2 rounded text-sm ${
                isActive
                  ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  : "bg-red-600/30 text-white/30 cursor-not-allowed"
              }`}
              title={
                !isActive
                  ? "Event must be in PRE_LIVE phase to go live"
                  : "Coming in Phase 5C"
              }
            >
              Go Live
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

