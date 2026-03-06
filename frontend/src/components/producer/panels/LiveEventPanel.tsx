/**
 * Live Event Panel
 * 
 * Manages live event controls and monitoring
 * 
 * Phase 5C.5: Read-only status indicators
 * - Viewer count (if available)
 * - Active activities count
 */

import { EventPhase } from "@/types/eventPhase";
import { useEventAnalytics } from "@/hooks/useEvents";
import { useEventActivities } from "@/hooks/useEventActivities";

interface LiveEventPanelProps {
  eventId: string;
  eventPhase: EventPhase;
  userRole: string;
}

export function LiveEventPanel({
  eventId,
  eventPhase,
  userRole,
}: LiveEventPanelProps) {
  const isActive = eventPhase === EventPhase.LIVE;

  // Fetch analytics for viewer count
  const { data: analytics } = useEventAnalytics(eventId);

  // Fetch LIVE phase activities for active count
  const { data: activities = [] } = useEventActivities(
    eventId,
    EventPhase.LIVE,
  );

  // Calculate metrics
  const viewerCount = analytics?.viewersJoined ?? null;
  const activeActivitiesCount = activities.filter(
    (a) => a.status === "ACTIVE",
  ).length;

  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        {/* Header with Metrics */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <h3 className="text-xl font-semibold">Live Event Controls</h3>
          </div>
          {/* Metrics Summary Bar */}
          <div className="flex items-center gap-4 text-sm">
            {viewerCount !== null && (
              <div className="flex items-center gap-2">
                <span className="text-white/60">Viewers:</span>
                <span className="text-white font-semibold">{viewerCount}</span>
              </div>
            )}
            {activeActivitiesCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-white/60">Active Activities:</span>
                <span className="text-white font-semibold">
                  {activeActivitiesCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {!isActive && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-sm">
            Event is not currently live. Switch to PRE_LIVE phase to go live.
          </div>
        )}

        {/* Placeholder sections */}
        <div className="space-y-4">
          <div className="bg-white/5 rounded p-4 border border-white/10">
            <h4 className="font-medium mb-2">Streaming Status</h4>
            <p className="text-white/50 text-sm mb-3">
              TODO Phase 5C: Add LiveKit connection status and controls
            </p>
            <div className="flex gap-2">
              <button
                disabled
                className="px-4 py-2 bg-blue-600/50 text-white/50 rounded text-sm cursor-not-allowed"
                title="Coming in Phase 5C"
              >
                Camera
              </button>
              <button
                disabled
                className="px-4 py-2 bg-blue-600/50 text-white/50 rounded text-sm cursor-not-allowed"
                title="Coming in Phase 5C"
              >
                Microphone
              </button>
              <button
                disabled
                className="px-4 py-2 bg-blue-600/50 text-white/50 rounded text-sm cursor-not-allowed"
                title="Coming in Phase 5C"
              >
                Screen Share
              </button>
            </div>
          </div>

          <div className="bg-white/5 rounded p-4 border border-white/10">
            <h4 className="font-medium mb-2">Viewer Metrics</h4>
            {viewerCount !== null ? (
              <div className="mt-3">
                <div className="text-2xl font-bold text-white">
                  {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
                </div>
                {analytics && (
                  <div className="mt-2 text-xs text-white/60">
                    {analytics.ticketsIssued} tickets issued •{" "}
                    {analytics.joinRate.toFixed(1)}% join rate
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white/50 text-sm mt-3">
                Viewer data not available
              </p>
            )}
          </div>

          <div className="bg-white/5 rounded p-4 border border-white/10">
            <h4 className="font-medium mb-2">End Event</h4>
            <p className="text-white/50 text-sm mb-3">
              {isActive
                ? "End the live event and transition to post-event phase."
                : "Event is not currently live."}
            </p>
            <button
              disabled={!isActive}
              className={`mt-3 px-4 py-2 rounded text-sm ${
                isActive
                  ? "bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                  : "bg-orange-600/30 text-white/30 cursor-not-allowed"
              }`}
              title={
                !isActive
                  ? "Event must be LIVE to end"
                  : "Coming in Phase 5C"
              }
            >
              End Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

