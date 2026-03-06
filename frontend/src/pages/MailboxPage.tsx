import { useState, useMemo } from "react";
import { ProfileLayout } from "@/layouts/ProfileLayout";
import { useMailbox, MailboxItem } from "@/hooks/useMailbox";
import { MailboxItemCard } from "@/components/mailbox/MailboxItemCard";
import { EventPhase } from "@/types/eventPhase";
import { useAuth } from "@/hooks/useAuth";
import { useUserEntities } from "@/hooks/useUsers";
import { isCreator } from "@/utils/creator";
import {
  Mail,
  Calendar,
  MessageSquare,
  Settings,
  Loader2,
  Inbox,
} from "lucide-react";

type MailboxFilter =
  | "all"
  | "events"
  | "invitations"
  | "tickets"
  | "live-now"
  | "past-events"
  | "discussions"
  | "system";

export function MailboxPage() {
  const [activeFilter, setActiveFilter] = useState<MailboxFilter>("all");
  const { data: items = [], isLoading, error } = useMailbox();
  const { user } = useAuth();
  const { data: entitiesData } = useUserEntities(user?.id || null);
  
  // Check if user is a creator
  const hasEntities =
    !!entitiesData &&
    ((entitiesData.owned?.length ?? 0) > 0 ||
      (entitiesData.managed?.length ?? 0) > 0);
  const userIsCreator = isCreator(user, hasEntities);

  // Filter items based on user role and active filter
  const filteredItems = useMemo(() => {
    if (!items.length) return [];

    // First, filter by user role:
    // - Creators see both system messages and audience messages
    // - Regular users see only audience messages (not system/audit messages)
    const roleFilteredItems = userIsCreator
      ? items // Creators see everything
      : items.filter(
          (item) =>
            item._messageClassification === "audience_message" ||
            item._isAudienceMessage === true
        ); // Regular users only see audience messages

    // Then apply the active filter
    switch (activeFilter) {
      case "all":
        return roleFilteredItems;

      case "events":
        // All event-related items (invitations, tickets, notifications)
        return items.filter(
          (item) =>
            item.type === "INVITATION" ||
            item.type === "TICKET" ||
            (item.type === "NOTIFICATION" && item.metadata?.eventId)
        );

      case "invitations":
        return items.filter((item) => item.type === "INVITATION");

      case "tickets":
        return items.filter((item) => item.type === "TICKET");

      case "live-now":
        return items.filter(
          (item) =>
            item.metadata?.phase === "LIVE" &&
            (item.type === "TICKET" || item.type === "NOTIFICATION")
        );

      case "past-events":
        return items.filter(
          (item) =>
            item.metadata?.phase === "POST_LIVE" && item.type === "TICKET"
        );

      case "discussions":
        // Placeholder - filter by type when discussions are implemented
        return [];

      case "system":
        return roleFilteredItems.filter(
          (item) => item._messageClassification === "system_message"
        );

      default:
        return roleFilteredItems;
    }
  }, [items, activeFilter, userIsCreator]);

  // Count unread items per filter
  const unreadCounts = useMemo(() => {
    const counts: Record<MailboxFilter, number> = {
      all: items.filter((item) => !item.isRead).length,
      events: items.filter(
        (item) =>
          (item.type === "INVITATION" ||
            item.type === "TICKET" ||
            (item.type === "NOTIFICATION" && item.metadata?.eventId)) &&
          !item.isRead
      ).length,
      invitations: items.filter(
        (item) => item.type === "INVITATION" && !item.isRead
      ).length,
      tickets: items.filter(
        (item) => item.type === "TICKET" && !item.isRead
      ).length,
      "live-now": items.filter(
        (item) =>
          item.metadata?.phase === "LIVE" &&
          (item.type === "TICKET" || item.type === "NOTIFICATION") &&
          !item.isRead
      ).length,
      "past-events": items.filter(
        (item) =>
          item.metadata?.phase === "POST_LIVE" &&
          item.type === "TICKET" &&
          !item.isRead
      ).length,
      discussions: 0,
      system: items.filter(
        (item) => item.type === "NOTIFICATION" && !item.isRead
      ).length,
    };
    return counts;
  }, [items]);

  const sidebarItems: Array<{
    id: MailboxFilter;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: "all",
      label: "All Mail",
      icon: <Mail className="w-5 h-5" />,
      badge: unreadCounts.all,
    },
    {
      id: "events",
      label: "Events",
      icon: <Calendar className="w-5 h-5" />,
      badge: unreadCounts.events,
    },
    {
      id: "invitations",
      label: "Invitations",
      icon: <Calendar className="w-5 h-5" />,
      badge: unreadCounts.invitations,
    },
    {
      id: "tickets",
      label: "Tickets",
      icon: <Calendar className="w-5 h-5" />,
      badge: unreadCounts.tickets,
    },
    {
      id: "live-now",
      label: "Live Now",
      icon: <Calendar className="w-5 h-5" />,
      badge: unreadCounts["live-now"],
    },
    {
      id: "past-events",
      label: "Past Events",
      icon: <Calendar className="w-5 h-5" />,
      badge: unreadCounts["past-events"],
    },
    {
      id: "discussions",
      label: "Discussions",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      id: "system",
      label: "System",
      icon: <Settings className="w-5 h-5" />,
      badge: unreadCounts.system,
    },
  ];

  return (
    <ProfileLayout>
      <div className="min-h-screen bg-[#0B0B0B] text-white">
        <div className="flex h-full">
          {/* Left Sidebar Navigation */}
          <aside className="w-64 border-r border-gray-800 bg-gray-900/50 p-4">
            <h2 className="text-xl font-bold mb-4 px-2">Mailbox</h2>
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveFilter(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeFilter === item.id
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">
                  Failed to load mailbox items
                </p>
                <p className="text-gray-400 text-sm">
                  Please try refreshing the page
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  {activeFilter === "all"
                    ? "Your mailbox is empty"
                    : `No ${sidebarItems.find((i) => i.id === activeFilter)?.label.toLowerCase()}`}
                </h3>
                <p className="text-gray-500 text-sm">
                  {activeFilter === "all"
                    ? "When you receive invitations, tickets, or notifications, they'll appear here."
                    : activeFilter === "events"
                    ? "You don't have any event-related items."
                    : activeFilter === "invitations"
                    ? "You don't have any pending invitations."
                    : activeFilter === "tickets"
                    ? "You don't have any tickets yet."
                    : activeFilter === "live-now"
                    ? "No events are currently live."
                    : activeFilter === "past-events"
                    ? "You don't have any past event tickets."
                    : "No items in this category."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold">
                    {sidebarItems.find((i) => i.id === activeFilter)?.label}
                  </h1>
                  {unreadCounts[activeFilter] > 0 && (
                    <span className="text-sm text-gray-400">
                      {unreadCounts[activeFilter]} unread
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <MailboxItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProfileLayout>
  );
}

