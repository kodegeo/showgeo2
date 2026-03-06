import { EventPhase } from "@/types/eventPhase";
import { useModalContext } from "@/state/creator/modalContext";
import { useNavigate } from "react-router-dom";
import { Bell, Users, FileText, Crown } from "lucide-react";

interface AudiencePromotionSectionProps {
  eventId: string;
  eventPhase: EventPhase;
  eventStartTime?: string;
  isPrimary?: boolean; // true for PRE_LIVE, false for LIVE/POST_LIVE
}

export function AudiencePromotionSection({
  eventId,
  eventPhase,
  eventStartTime,
  isPrimary = false,
}: AudiencePromotionSectionProps) {
  const { openModal } = useModalContext();
  const navigate = useNavigate();

  const handleScheduleReminder = () => {
    // Open the schedule reminder modal
    openModal("scheduleReminder", {
      eventId,
      eventStartTime,
    });
  };

  const handleInviteAudience = () => {
    // Navigate to Blast Composer
    navigate(`/studio/events/${eventId}/blast`);
  };

  const handleCreatePost = () => {
    // Use existing CreatePostModal
    openModal("createPost", { eventId });
  };

  const handleInviteToVIP = () => {
    // Placeholder for VIP room invitations
    // TODO: Implement VIP room invitation flow
    console.log("VIP room invitation - coming soon");
  };

  // Get phase-specific helper text
  const getHelperText = () => {
    switch (eventPhase) {
      case EventPhase.PRE_LIVE:
        return "Invite people, send reminders, and promote your event before going live.";
      case EventPhase.POST_LIVE:
        return "Engage your audience after the event with follow-ups and promotions.";
      case EventPhase.LIVE:
        return "Promote and engage with your audience while live.";
      default:
        return null;
    }
  };

  const helperText = getHelperText();
  const isPostLive = eventPhase === EventPhase.POST_LIVE;
  const isPreLive = eventPhase === EventPhase.PRE_LIVE;

  return (
    <div
      className={`pt-6 border-t border-white/10 ${
        isPrimary ? "bg-gray-900/30 rounded-lg p-6" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Audience & Promotion</h2>
      </div>

      {helperText && (
        <p className="text-sm text-[#9A9A9A] font-body mb-4">
          {helperText}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {/* Schedule Reminder Button - Only in PRE_LIVE */}
        {isPreLive && (
          <button
            onClick={handleScheduleReminder}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-gray-700 hover:border-[#CD000E] text-white font-semibold rounded-lg transition-all duration-300"
          >
            <Bell className="w-4 h-4" />
            Schedule Reminder
          </button>
        )}

        {/* Invite Audience / Send Blast Button - Available in PRE_LIVE, LIVE, and POST_LIVE */}
        <button
          onClick={handleInviteAudience}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-gray-700 hover:border-[#CD000E] text-white font-semibold rounded-lg transition-all duration-300"
        >
          <Users className="w-4 h-4" />
          {isPostLive ? "Send Blast" : "Invite Audience"}
        </button>

        {/* Create Post Button - Available in all phases */}
        <button
          onClick={handleCreatePost}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-gray-700 hover:border-[#CD000E] text-white font-semibold rounded-lg transition-all duration-300"
        >
          <FileText className="w-4 h-4" />
          Create Post
        </button>

        {/* Invite to VIP Rooms - Only in POST_LIVE (placeholder) */}
        {isPostLive && (
          <button
            onClick={handleInviteToVIP}
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-gray-800 text-gray-500 font-semibold rounded-lg transition-all duration-300 cursor-not-allowed opacity-50"
            title="VIP room invitations coming soon"
          >
            <Crown className="w-4 h-4" />
            Invite to VIP Rooms
          </button>
        )}
      </div>

    </div>
  );
}
