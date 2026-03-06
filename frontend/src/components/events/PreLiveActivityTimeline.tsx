import { useMemo } from "react";
import { useMailbox, MailboxItem } from "@/hooks/useMailbox";
import { Bell, Users, Send, Ticket, Clock } from "lucide-react";

// Simple relative time formatter (no external dependency)
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else {
    // For older items, show date
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
};

interface PreLiveActivityTimelineProps {
  eventId: string;
}

type ActivityActionType = "BLAST_SENT" | "SCHEDULE_REMINDER" | "INVITE_AUDIENCE" | "TICKETS_PUBLISHED";

interface ActivityItem extends MailboxItem {
  actionType?: ActivityActionType;
}

export function PreLiveActivityTimeline({ eventId }: PreLiveActivityTimelineProps) {
  const { data: mailboxItems = [], isLoading } = useMailbox();

  // Filter and sort activities for this event
  const activities = useMemo(() => {
    if (!mailboxItems.length) return [];

    const relevantActionTypes: ActivityActionType[] = [
      "BLAST_SENT",
      "SCHEDULE_REMINDER",
      "INVITE_AUDIENCE",
      "TICKETS_PUBLISHED",
    ];

    return mailboxItems
      .filter((item) => {
        const metadata = item.metadata || {};
        const itemEventId = metadata.eventId;
        const actionType = metadata.actionType as ActivityActionType | undefined;

        return (
          itemEventId === eventId &&
          actionType &&
          relevantActionTypes.includes(actionType)
        );
      })
      .map((item) => ({
        ...item,
        actionType: item.metadata?.actionType as ActivityActionType | undefined,
      }))
      .sort((a, b) => {
        // Sort descending by createdAt (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [mailboxItems, eventId]);

  const getActivityIcon = (actionType?: ActivityActionType) => {
    switch (actionType) {
      case "BLAST_SENT":
        return <Send className="w-4 h-4" />;
      case "SCHEDULE_REMINDER":
        return <Bell className="w-4 h-4" />;
      case "INVITE_AUDIENCE":
        return <Users className="w-4 h-4" />;
      case "TICKETS_PUBLISHED":
        return <Ticket className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityColor = (actionType?: ActivityActionType) => {
    switch (actionType) {
      case "BLAST_SENT":
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "SCHEDULE_REMINDER":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "INVITE_AUDIENCE":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "TICKETS_PUBLISHED":
        return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  if (isLoading) {
    return (
      <div className="pt-6 border-t border-white/10">
        <div className="text-sm text-white/60">Loading activity...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null; // Don't show timeline if no activities
  }

  return (
    <div className="pt-6 border-t border-white/10">
      <h2 className="text-lg font-semibold text-white mb-4">Activity Timeline</h2>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const colorClasses = getActivityColor(activity.actionType);
          const timeAgo = formatTimeAgo(activity.createdAt);

          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 relative"
            >
              {/* Timeline line */}
              {index < activities.length - 1 && (
                <div className="absolute left-5 top-8 w-0.5 h-full bg-gray-700" />
              )}

              {/* Icon */}
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${colorClasses} flex-shrink-0 relative z-10`}
              >
                {getActivityIcon(activity.actionType)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white mb-1">
                      {activity.title}
                    </h3>
                    {activity.message && (
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                        {activity.message}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                    {timeAgo}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
