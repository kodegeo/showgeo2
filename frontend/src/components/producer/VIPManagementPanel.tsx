/**
 * VIP Management Panel
 * 
 * Manages VIP Meet & Greet sessions for an event
 * 
 * Phase 5C.4: VIP Meet & Greet integration in Production Console
 */

import { useState } from "react";
import {
  useMeetGreetQueue,
  useMeetGreetCurrent,
  useStartNextSession,
  useCompleteSession,
  useMissSession,
} from "@/hooks/useMeetGreet";
import { useToast } from "@/hooks/creator/useToast";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useEvent } from "@/hooks/useEvents";
import { ReportButton } from "@/components/common/ReportButton";
import type { MeetGreetSession } from "@/services/meet-greet.service";

interface VIPManagementPanelProps {
  eventId: string;
}

export function VIPManagementPanel({ eventId }: VIPManagementPanelProps) {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  // Fetch event data for report context
  const { data: event } = useEvent(eventId);

  // Fetch queue and current session
  const {
    data: queue = [],
    isLoading: queueLoading,
    error: queueError,
  } = useMeetGreetQueue(eventId);

  const {
    data: currentSession,
    isLoading: currentLoading,
    error: currentError,
  } = useMeetGreetCurrent(eventId);

  // Mutations
  const startNextMutation = useStartNextSession();
  const completeMutation = useCompleteSession();
  const missMutation = useMissSession();

  const isLoading = queueLoading || currentLoading;
  const error = queueError || currentError;

  // Get pending sessions count
  const pendingSessions = queue.filter((s) => s.status === "PENDING");
  const completedSessions = queue.filter((s) => s.status === "COMPLETED");
  const missedSessions = queue.filter((s) => s.status === "MISSED");

  const handleStartNext = async () => {
    try {
      const result = await startNextMutation.mutateAsync(eventId);
      if (result.started && result.session) {
        toast({
          type: "success",
          title: "Session started",
          description: `Session #${result.session.slotOrder} is now active.`,
        });
      } else {
        toast({
          type: "info",
          title: "No pending sessions",
          description: "All sessions have been processed.",
        });
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to start session. Please try again.";
      toast({
        type: "error",
        title: "Failed to start session",
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  const handleComplete = async (sessionId: string) => {
    try {
      await completeMutation.mutateAsync({ sessionId, eventId });
      toast({
        type: "success",
        title: "Session completed",
        description: "Session marked as completed.",
      });
      setSelectedSessionId(null);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to complete session. Please try again.";
      toast({
        type: "error",
        title: "Failed to complete session",
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  const handleMiss = async (sessionId: string) => {
    try {
      await missMutation.mutateAsync({ sessionId, eventId });
      toast({
        type: "success",
        title: "Session marked as missed",
        description: "Session marked as missed.",
      });
      setSelectedSessionId(null);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to mark session as missed. Please try again.";
      toast({
        type: "error",
        title: "Failed to mark session",
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  const getStatusColor = (status: MeetGreetSession["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500/20 border-green-500/30 text-green-400";
      case "COMPLETED":
        return "bg-gray-500/20 border-gray-500/30 text-gray-400";
      case "MISSED":
        return "bg-red-500/20 border-red-500/30 text-red-400";
      case "PENDING":
        return "bg-blue-500/20 border-blue-500/30 text-blue-400";
      default:
        return "bg-white/20 border-white/30 text-white/60";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingScreen message="Loading VIP sessions..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-400">
        <p className="mb-2">Failed to load VIP sessions</p>
        <p className="text-sm text-white/60">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="text-sm text-white/60 mb-1">Total Sessions</div>
          <div className="text-2xl font-bold text-white">{queue.length}</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="text-sm text-blue-400 mb-1">Pending</div>
          <div className="text-2xl font-bold text-blue-400">
            {pendingSessions.length}
          </div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="text-sm text-green-400 mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-400">
            {completedSessions.length}
          </div>
        </div>
        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <div className="text-sm text-red-400 mb-1">Missed</div>
          <div className="text-2xl font-bold text-red-400">
            {missedSessions.length}
          </div>
        </div>
      </div>

      {/* Current Active Session */}
      {currentSession && (
        <div className="bg-green-500/10 rounded-lg p-6 border border-green-500/30">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                Current Active Session
              </h3>
              <div className="text-sm text-white/60">
                Session #{currentSession.slotOrder} •{" "}
                {currentSession.durationMinutes} minutes
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleComplete(currentSession.id)}
                disabled={completeMutation.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completeMutation.isPending ? "Completing..." : "Complete"}
              </button>
              {event && (
                <ReportButton
                  eventId={eventId}
                  eventName={event.name}
                  eventPhase={event.phase}
                  reportedUserId={currentSession.userId}
                  roleContext="CREATOR_REPORTING_FAN"
                  meetGreetSessionId={currentSession.id}
                  meetGreetSlotOrder={currentSession.slotOrder}
                  variant="button"
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">Started:</span>{" "}
              <span className="text-white">
                {formatDate(currentSession.startedAt)}
              </span>
            </div>
            <div>
              <span className="text-white/60">Joined:</span>{" "}
              <span className="text-white">
                {currentSession.joinedAt ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Queue Management */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Session Queue</h3>
          <button
            onClick={handleStartNext}
            disabled={
              startNextMutation.isPending ||
              pendingSessions.length === 0 ||
              currentSession !== null
            }
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              currentSession
                ? "Complete current session first"
                : pendingSessions.length === 0
                ? "No pending sessions"
                : "Start next pending session"
            }
          >
            {startNextMutation.isPending ? "Starting..." : "Start Next"}
          </button>
        </div>

        {/* Queue List */}
        {queue.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <p>No VIP sessions configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-lg border ${
                  session.id === currentSession?.id
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-lg font-semibold text-white">
                      #{session.slotOrder}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white/60">
                        Duration: {session.durationMinutes} min
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        {session.startedAt
                          ? `Started: ${formatDate(session.startedAt)}`
                          : "Not started"}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        session.status,
                      )}`}
                    >
                      {session.status}
                    </span>
                  </div>
                  {session.status === "ACTIVE" && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleComplete(session.id)}
                        disabled={completeMutation.isPending}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Complete
                      </button>
                      {event && (
                        <ReportButton
                          eventId={eventId}
                          eventName={event.name}
                          eventPhase={event.phase}
                          reportedUserId={session.userId}
                          roleContext="CREATOR_REPORTING_FAN"
                          meetGreetSessionId={session.id}
                          meetGreetSlotOrder={session.slotOrder}
                          variant="icon"
                          className="text-white/60 hover:text-red-400"
                        />
                      )}
                    </div>
                  )}
                  {session.status === "PENDING" && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleMiss(session.id)}
                        disabled={missMutation.isPending}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mark Missed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

