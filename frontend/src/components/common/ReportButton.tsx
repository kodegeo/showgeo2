/**
 * Report Button Component
 * 
 * Phase 6A: Moderation & Trust (Frontend)
 * 
 * Reusable button to open the report user modal
 */

import { useModalContext } from "@/state/creator/modalContext";
import { useAuth } from "@/hooks/useAuth";
import { Flag } from "lucide-react";
import type { EventPhase } from "@/types/eventPhase";
import type { ModerationRoleContext } from "@/services/moderation.service";

interface ReportButtonProps {
  eventId: string;
  eventName: string;
  eventPhase: EventPhase;
  reportedUserId: string;
  reportedUserEmail?: string;
  roleContext: ModerationRoleContext;
  activityId?: string;
  activityTitle?: string;
  meetGreetSessionId?: string;
  meetGreetSlotOrder?: number;
  className?: string;
  variant?: "button" | "icon";
}

export function ReportButton({
  eventId,
  eventName,
  eventPhase,
  reportedUserId,
  reportedUserEmail,
  roleContext,
  activityId,
  activityTitle,
  meetGreetSessionId,
  meetGreetSlotOrder,
  className = "",
  variant = "button",
}: ReportButtonProps) {
  const { openModal } = useModalContext();
  const { user } = useAuth();

  // Hide button if trying to report self
  if (user?.id === reportedUserId) {
    return null;
  }

  const handleClick = () => {
    openModal("reportUser", {
      eventId,
      eventName,
      eventPhase,
      reportedUserId,
      reportedUserEmail,
      roleContext,
      activityId,
      activityTitle,
      meetGreetSessionId,
      meetGreetSlotOrder,
    });
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={`p-2 text-white/60 hover:text-red-400 transition-colors ${className}`}
        title={`Report ${reportedUserEmail || "user"}`}
      >
        <Flag className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded transition-colors flex items-center gap-2 ${className}`}
    >
      <Flag className="w-3 h-3" />
      Report
    </button>
  );
}

