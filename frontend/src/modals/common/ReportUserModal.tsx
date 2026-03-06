/**
 * Report User Modal
 * 
 * Phase 6A: Moderation & Trust (Frontend)
 * 
 * Allows users to report inappropriate behavior
 */

import { useState } from "react";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useCreateReport } from "@/hooks/useModeration";
import { useToast } from "@/hooks/creator/useToast";
import type {
  ModerationReason,
  ModerationRoleContext,
} from "@/services/moderation.service";
import { EventPhase } from "@/types/eventPhase";

const MODERATION_REASONS: { value: ModerationReason; label: string }[] = [
  { value: "HARASSMENT", label: "Harassment" },
  { value: "EXPLICIT_CONTENT", label: "Explicit Content" },
  { value: "HATE_SPEECH", label: "Hate Speech" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "INAPPROPRIATE_BEHAVIOR", label: "Inappropriate Behavior" },
  { value: "OTHER", label: "Other" },
];

export function ReportUserModal() {
  const { currentModal, closeModal, modalData } = useModalContext();
  const createReport = useCreateReport();
  const { toast } = useToast();

  const {
    eventId,
    eventName,
    eventPhase,
    reportedUserId,
    roleContext,
    activityId,
    activityTitle,
    meetGreetSessionId,
    meetGreetSlotOrder,
  } = modalData || {};

  const isOpen = currentModal === "reportUser";
  const [reason, setReason] = useState<ModerationReason | "">("");
  const [description, setDescription] = useState("");

  const isValid = reason !== "" && reportedUserId && eventId;

  const getPhaseLabel = (phase: EventPhase) => {
    return phase.replace(/_/g, " ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || !reportedUserId || !eventId || !roleContext) {
      return;
    }

    try {
      await createReport.mutateAsync({
        eventId,
        payload: {
          reportedUserId,
          roleContext: roleContext as ModerationRoleContext,
          reason: reason as ModerationReason,
          description: description.trim() || undefined,
          activityId: activityId || undefined,
          meetGreetSessionId: meetGreetSessionId || undefined,
        },
      });

      toast({
        type: "success",
        title: "Report submitted",
        description:
          "Your report has been submitted and will be reviewed by the event team.",
      });

      closeModal();
      setReason("");
      setDescription("");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit report. Please try again.";
      toast({
        type: "error",
        title: "Failed to submit report",
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  if (!isOpen || !eventId || !reportedUserId) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Report User"
      description="Submit a report for inappropriate behavior. Reports are reviewed by the event team."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Context Information */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2 text-sm">
          <div>
            <span className="text-white/60">Event:</span>{" "}
            <span className="text-white font-medium">{eventName || "N/A"}</span>
          </div>
          {eventPhase && (
            <div>
              <span className="text-white/60">Phase:</span>{" "}
              <span className="text-white font-medium">
                {getPhaseLabel(eventPhase)}
              </span>
            </div>
          )}
          {activityTitle && (
            <div>
              <span className="text-white/60">Activity:</span>{" "}
              <span className="text-white font-medium">{activityTitle}</span>
            </div>
          )}
          {meetGreetSlotOrder !== undefined && (
            <div>
              <span className="text-white/60">VIP Meet & Greet:</span>{" "}
              <span className="text-white font-medium">
                Session #{meetGreetSlotOrder}
              </span>
            </div>
          )}
        </div>

        {/* Reason Selection */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Reason for Report *
          </label>
          <select
            required
            value={reason}
            onChange={(e) => setReason(e.target.value as ModerationReason)}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select a reason...</option>
            {MODERATION_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Additional Details (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-blue-500 focus:outline-none resize-none"
            placeholder="Provide any additional context about the incident..."
          />
        </div>

        {/* Explanation Text */}
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-xs">
          Reports are reviewed by the event team. No immediate action is
          guaranteed.
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={closeModal}
            disabled={createReport.isPending}
            className="px-6 py-2 border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || createReport.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createReport.isPending ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

