/**
 * Moderation Panel
 * 
 * Phase 6A: Moderation & Trust (Frontend)
 * 
 * Displays moderation reports for event producers/admins
 */

import { useState } from "react";
import { EventPhase } from "@/types/eventPhase";
import { useEventReports, useUpdateReportStatus } from "@/hooks/useModeration";
import { useToast } from "@/hooks/creator/useToast";
import { LoadingScreen } from "@/components/LoadingScreen";
import type {
  ModerationReport,
  ModerationStatus,
} from "@/services/moderation.service";

interface ModerationPanelProps {
  eventId: string;
  eventPhase: EventPhase;
  userRole: string;
}

export function ModerationPanel({
  eventId,
  eventPhase,
  userRole,
}: ModerationPanelProps) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | "ALL">(
    "OPEN",
  );

  const {
    data: reports = [],
    isLoading,
    error,
  } = useEventReports(eventId);

  const updateStatus = useUpdateReportStatus();

  const filteredReports =
    statusFilter === "ALL"
      ? reports
      : reports.filter((r) => r.status === statusFilter);

  const handleUpdateStatus = async (
    reportId: string,
    newStatus: ModerationStatus,
  ) => {
    try {
      await updateStatus.mutateAsync({
        reportId,
        payload: { status: newStatus },
      });

      toast({
        type: "success",
        title: "Report status updated",
        description: `Report marked as ${newStatus.toLowerCase()}.`,
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update report status. Please try again.";
      toast({
        type: "error",
        title: "Failed to update status",
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  const getStatusColor = (status: ModerationStatus) => {
    switch (status) {
      case "OPEN":
        return "bg-yellow-500/20 border-yellow-500/30 text-yellow-400";
      case "REVIEWED":
        return "bg-blue-500/20 border-blue-500/30 text-blue-400";
      case "DISMISSED":
        return "bg-gray-500/20 border-gray-500/30 text-gray-400";
      default:
        return "bg-white/20 border-white/30 text-white/60";
    }
  };

  const getReasonLabel = (reason: string) => {
    return reason.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) =>
      l.toUpperCase(),
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingScreen message="Loading moderation reports..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-400">
        <p className="mb-2">Failed to load moderation reports</p>
        <p className="text-sm text-white/60">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Moderation Reports</h3>
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ModerationStatus | "ALL")
              }
              className="px-3 py-1 bg-[#0B0B0B] border border-gray-700 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All</option>
              <option value="OPEN">Open</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>
        </div>

        <p className="text-white/60 text-sm mb-6">
          Review and manage moderation reports submitted for this event.
        </p>

        {/* Reports Table */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <p>No reports found</p>
            {statusFilter !== "ALL" && (
              <p className="text-sm mt-2">
                Try changing the status filter to see more reports.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm text-white/60">
                  <th className="pb-3 pr-4">Reporter</th>
                  <th className="pb-3 pr-4">Reported</th>
                  <th className="pb-3 pr-4">Phase</th>
                  <th className="pb-3 pr-4">Reason</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="py-3 pr-4 text-sm">
                      {report.reporter?.email || "Unknown"}
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      {report.reported?.email || "Unknown"}
                    </td>
                    <td className="py-3 pr-4 text-sm text-white/70">
                      {report.phase.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 pr-4 text-sm text-white/70">
                      {getReasonLabel(report.reason)}
                    </td>
                    <td className="py-3 pr-4 text-sm text-white/60">
                      {formatDate(report.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          report.status,
                        )}`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {report.status === "OPEN" && (
                          <>
                            <button
                              onClick={() =>
                                handleUpdateStatus(report.id, "REVIEWED")
                              }
                              disabled={updateStatus.isPending}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Review
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateStatus(report.id, "DISMISSED")
                              }
                              disabled={updateStatus.isPending}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {report.description && (
                          <button
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium transition-colors"
                            title={report.description}
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

