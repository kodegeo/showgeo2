/**
 * Activity Card Component
 * 
 * Displays an activity with its status and controls
 * 
 * Phase 5C.1: READ-ONLY - Renders real activity data
 * Phase 5C.2: Activity lifecycle mutations enabled
 */

import type { EventActivity } from "@/services/event-activities.service";
import { EventPhase } from "@/types/eventPhase";
import { useLaunchActivity, useCompleteActivity } from "@/hooks/useEventActivities";
import { useToast } from "@/hooks/creator/useToast";

interface ActivityCardProps {
  activity: EventActivity;
  eventId: string;
  eventPhase: EventPhase;
  isEventActive: boolean;
  userRole: string;
  onManageVIP?: (activityId: string) => void;
}

export function ActivityCard({
  activity,
  eventId,
  eventPhase,
  isEventActive,
  userRole,
  onManageVIP,
}: ActivityCardProps) {
  const { toast } = useToast();
  const launchMutation = useLaunchActivity();
  const completeMutation = useCompleteActivity();

  const getStatusColor = (status: EventActivity["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500/20 border-green-500/30 text-green-400";
      case "COMPLETED":
        return "bg-gray-500/20 border-gray-500/30 text-gray-400";
      case "EXPIRED":
        return "bg-red-500/20 border-red-500/30 text-red-400";
      default:
        return "bg-blue-500/20 border-blue-500/30 text-blue-400";
    }
  };

  const getStatusLabel = (status: EventActivity["status"]) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const getTypeIcon = (type: EventActivity["type"]) => {
    switch (type) {
      case "VIP_MEET_GREET":
        return "👋";
      case "FAN_DISCUSSION":
        return "💬";
      case "REPLAY":
        return "▶️";
      case "PROMOTION":
        return "🎁";
      case "SURVEY":
        return "📊";
      default:
        return "📋";
    }
  };

  // Launch button enabled when:
  // - activity.status === INACTIVE
  // - event.phase === activity.phase
  const canLaunch =
    activity.status === "INACTIVE" &&
    eventPhase === activity.phase &&
    isEventActive;

  // Complete button enabled when:
  // - activity.status === ACTIVE
  const canComplete = activity.status === "ACTIVE";

  // Disable buttons while mutations are in progress
  const isLaunching = launchMutation.isPending;
  const isCompleting = completeMutation.isPending;
  const isMutating = isLaunching || isCompleting;

  const handleLaunch = async () => {
    if (!canLaunch || isMutating) return;

    try {
      await launchMutation.mutateAsync(activity.id);
      toast({
        type: "success",
        title: "Activity launched",
        description: `${activity.title} is now active.`,
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Please try again later.";
      toast({
        type: "error",
        title: "Failed to launch activity",
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  const handleComplete = async () => {
    if (!canComplete || isMutating) return;

    try {
      await completeMutation.mutateAsync(activity.id);
      toast({
        type: "success",
        title: "Activity completed",
        description: `${activity.title} has been completed.`,
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Please try again later.";
      toast({
        type: "error",
        title: "Failed to complete activity",
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  return (
    <div className="bg-white/5 rounded-lg p-5 border border-white/10 hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getTypeIcon(activity.type)}</span>
          <div>
            <h4 className="font-semibold text-white">{activity.title}</h4>
            <p className="text-xs text-white/50 mt-1">
              {activity.type.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
            activity.status
          )}`}
        >
          {getStatusLabel(activity.status)}
        </span>
      </div>

      {/* Description */}
      {activity.description && (
        <p className="text-sm text-white/60 mb-4">{activity.description}</p>
      )}

      {/* Visibility Badge */}
      <div className="mb-4">
        <span className="text-xs text-white/40">Visibility: </span>
        <span className="text-xs text-white/70">
          {activity.visibility.replace(/_/g, " ")}
        </span>
      </div>

      {/* Activity Type Badge */}
      <div className="mb-4">
        <span className="text-xs text-white/40">Type: </span>
        <span className="text-xs text-white/70">
          {activity.type.replace(/_/g, " ")}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          disabled={!canLaunch || isMutating}
          onClick={handleLaunch}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            canLaunch && !isMutating
              ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              : "bg-green-600/30 text-white/30 cursor-not-allowed"
          }`}
          title={
            isLaunching
              ? "Launching..."
              : !canLaunch
              ? eventPhase !== activity.phase
                ? `Event phase (${eventPhase}) must match activity phase (${activity.phase})`
                : activity.status !== "INACTIVE"
                ? "Activity must be INACTIVE to launch"
                : !isEventActive
                ? "Event must be in the correct phase"
                : "Cannot launch activity"
              : `Launch ${activity.title}`
          }
        >
          {isLaunching ? "Launching..." : "Launch"}
        </button>
        <button
          disabled={!canComplete || isMutating}
          onClick={handleComplete}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            canComplete && !isMutating
              ? "bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
              : "bg-orange-600/30 text-white/30 cursor-not-allowed"
          }`}
          title={
            isCompleting
              ? "Completing..."
              : !canComplete
              ? "Activity must be ACTIVE to complete"
              : `Complete ${activity.title}`
          }
        >
          {isCompleting ? "Completing..." : "Complete"}
        </button>
        {/* Manage VIP Sessions button for VIP_MEET_GREET when ACTIVE */}
        {activity.type === "VIP_MEET_GREET" &&
          activity.status === "ACTIVE" &&
          onManageVIP && (
            <button
              onClick={() => onManageVIP(activity.id)}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
              title="Manage VIP Meet & Greet sessions"
            >
              Manage VIP
            </button>
          )}
        <button
          disabled
          className="px-3 py-2 bg-blue-600/30 text-white/30 rounded text-sm cursor-not-allowed"
          title="Coming in Phase 5C.3"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

