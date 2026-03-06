/**
 * Post-Event Panel
 * 
 * Manages post-event activities
 * Displays Activity cards for:
 * - VIP Meet & Greet
 * - Fan Discussion
 * - Replay
 * - Promotion
 * 
 * Phase 5C.1: READ-ONLY - Fetches real activities from API
 * Phase 5C.2: Activity lifecycle mutations enabled
 * Phase 5C.4: VIP Meet & Greet integration
 */

import { useState } from "react";
import { EventPhase } from "@/types/eventPhase";
import { ActivityCard } from "../ActivityCard";
import { VIPManagementPanel } from "../VIPManagementPanel";
import { useEventActivities } from "@/hooks/useEventActivities";
import { useMeetGreetQueue } from "@/hooks/useMeetGreet";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { EventActivity } from "@/services/event-activities.service";

interface PostEventPanelProps {
  eventId: string;
  eventPhase: EventPhase;
  userRole: string;
}

export function PostEventPanel({
  eventId,
  eventPhase,
  userRole,
}: PostEventPanelProps) {
  const isActive = eventPhase === EventPhase.POST_LIVE;
  const [selectedVIPActivityId, setSelectedVIPActivityId] = useState<
    string | null
  >(null);

  // Fetch activities for POST_LIVE phase
  const {
    data: activities = [],
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useEventActivities(eventId, EventPhase.POST_LIVE);

  // Fetch VIP queue for progress calculation
  const { data: vipQueue = [] } = useMeetGreetQueue(eventId);

  // Find VIP Meet & Greet activity if selected
  const selectedVIPActivity = activities.find(
    (a) => a.id === selectedVIPActivityId && a.type === "VIP_MEET_GREET",
  ) as EventActivity | undefined;

  // Calculate metrics
  const activeActivitiesCount = activities.filter(
    (a) => a.status === "ACTIVE",
  ).length;

  // Calculate VIP session progress
  const vipActivity = activities.find((a) => a.type === "VIP_MEET_GREET");
  const vipProgress =
    vipActivity && vipQueue.length > 0
      ? {
          completed: vipQueue.filter((s) => s.status === "COMPLETED").length,
          total: vipQueue.length,
          active: vipQueue.filter((s) => s.status === "ACTIVE").length,
        }
      : null;

  const handleManageVIP = (activityId: string) => {
    setSelectedVIPActivityId(activityId);
  };

  const handleCloseVIP = () => {
    setSelectedVIPActivityId(null);
  };

  // Show VIP Management Panel if VIP activity is selected and ACTIVE
  if (selectedVIPActivity && selectedVIPActivity.status === "ACTIVE") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleCloseVIP}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ← Back to Activities
          </button>
          <h2 className="text-2xl font-bold text-white">
            VIP Meet & Greet Management
          </h2>
        </div>
        <VIPManagementPanel eventId={eventId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        {/* Header with Metrics Summary Bar */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Post-Event Activities</h3>
          <div className="flex items-center gap-4">
            {/* Metrics Summary Bar */}
            <div className="flex items-center gap-4 text-sm">
              {activeActivitiesCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Active:</span>
                  <span className="text-white font-semibold">
                    {activeActivitiesCount}
                  </span>
                </div>
              )}
              {vipProgress && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60">VIP Sessions:</span>
                  <span className="text-white font-semibold">
                    {vipProgress.completed}/{vipProgress.total}
                  </span>
                  {vipProgress.active > 0 && (
                    <span className="text-green-400 text-xs">
                      ({vipProgress.active} active)
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              disabled
              className="px-4 py-2 bg-blue-600/50 text-white/50 rounded text-sm cursor-not-allowed"
              title="Coming in Phase 5C"
            >
              + Create Activity
            </button>
          </div>
        </div>

        {!isActive && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-sm">
            Event is not in POST_LIVE phase. Activities will be available after the event ends.
          </div>
        )}

        <p className="text-white/60 text-sm mb-6">
          Manage post-event activities for your attendees. Launch activities when ready.
        </p>

        {/* Loading state */}
        {activitiesLoading && (
          <div className="text-center py-12">
            <LoadingScreen message="Loading activities..." />
          </div>
        )}

        {/* Error state */}
        {activitiesError && (
          <div className="text-center py-12 text-red-400">
            <p className="mb-2">Failed to load activities</p>
            <p className="text-sm text-white/60">
              Please try refreshing the page.
            </p>
          </div>
        )}

        {/* Activity Cards Grid */}
        {!activitiesLoading && !activitiesError && (
          <>
            {activities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    eventId={eventId}
                    eventPhase={eventPhase}
                    isEventActive={isActive}
                    userRole={userRole}
                    onManageVIP={handleManageVIP}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/40">
                <p className="mb-2">No activities configured</p>
                <p className="text-sm">
                  TODO Phase 5C.2: Add activity creation UI
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

