import { Link } from "react-router-dom";
import { Share2, Users, MessageSquare, ExternalLink, Video } from "lucide-react";
import { toast } from "sonner";
import type { Event } from "@/types/event.types";

export interface EventManageHeaderProps {
  eventId: string;
  event: Event;
  onInviteAudience: () => void;
  onSendMessage: () => void;
}

export function EventManageHeader({
  eventId,
  event,
  onInviteAudience,
  onSendMessage,
}: EventManageHeaderProps) {
  const shareUrl = `${window.location.origin}/events/${eventId}`;
  const subtitle = [event.status, event.phase, formatDate(event.startTime)]
    .filter(Boolean)
    .join(" · ");

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Event link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{event.name}</h1>
        <p className="text-sm text-white/60 mt-1">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 text-sm font-medium"
        >
          <Share2 className="w-4 h-4" />
          Share Event
        </button>
        <button
          type="button"
          onClick={onInviteAudience}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 text-sm font-medium"
        >
          <Users className="w-4 h-4" />
          Invite Audience
        </button>
        <button
          type="button"
          onClick={onSendMessage}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 text-sm font-medium"
        >
          <MessageSquare className="w-4 h-4" />
          Send Message
        </button>
        <Link
          to={`/events/${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          View Public Page
        </Link>
        <Link
          to={`/studio/events/${eventId}/live`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] text-sm font-medium"
        >
          <Video className="w-4 h-4" />
          Go Live
        </Link>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
