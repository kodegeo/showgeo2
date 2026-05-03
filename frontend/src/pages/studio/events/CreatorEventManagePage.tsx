import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useEvent } from "@/hooks/useEvents";
import {
  EventManageHeader,
  EventManageTabs,
  EventManageOverviewTab,
  EventManageAudienceTab,
  EventManageTicketsTab,
  EventManageMessagingTab,
  EventManageSettingsTab,
  normalizeManageTab,
  type ManageTab,
} from "@/components/events/manage";

/**
 * Unified event control center after creation.
 * Route: /studio/events/:id/manage?tab=...
 */
export function CreatorEventManagePage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeTab = normalizeManageTab(searchParams.get("tab"));

  const { data: event, isLoading, error } = useEvent(eventId!);

  const goTab = (tab: ManageTab) => {
    if (tab === "overview") {
      navigate(`/studio/events/${eventId}/manage`, { replace: true });
    } else {
      navigate(`/studio/events/${eventId}/manage?tab=${tab}`, { replace: true });
    }
  };

  const goToInviteAudience = () => {
    if (activeTab === "audience") {
      if (window.location.hash !== "#invite-audience") {
        window.location.hash = "invite-audience";
      } else {
        const inviteSection = document.getElementById("invite-audience");
        inviteSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    navigate(`/studio/events/${eventId}/manage?tab=audience#invite-audience`, {
      replace: true,
    });
  };

  const invalidateEvent = () => {
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    queryClient.invalidateQueries({ queryKey: ["ticket-types", eventId] });
  };

  if (!eventId) {
    return <div className="max-w-6xl mx-auto px-6 py-6 text-red-400">Invalid event</div>;
  }

  if (isLoading) {
    return <div className="max-w-6xl mx-auto px-6 py-6 text-white/60">Loading event…</div>;
  }

  if (error || !event) {
    return <div className="max-w-6xl mx-auto px-6 py-6 text-red-400">Event not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex justify-between items-start gap-4 flex-wrap mb-2">
        <Link
          to={`/studio/events/${eventId}`}
          className="text-sm text-white/60 hover:text-white shrink-0"
        >
          ← Event Studio
        </Link>
      </div>

      <EventManageHeader
        eventId={eventId}
        event={event}
        onInviteAudience={goToInviteAudience}
        onSendMessage={() => goTab("messaging")}
      />

      <EventManageTabs eventId={eventId} activeTab={activeTab} />

      <div className="mt-6">
        {activeTab === "overview" && <EventManageOverviewTab eventId={eventId} event={event} />}
        {activeTab === "audience" && <EventManageAudienceTab eventId={eventId} event={event} />}
        {activeTab === "tickets" && (
          <EventManageTicketsTab
            eventId={eventId}
            event={event}
            onTicketTypesUpdated={invalidateEvent}
          />
        )}
        {activeTab === "messaging" && <EventManageMessagingTab eventId={eventId} event={event} />}
        {activeTab === "settings" && <EventManageSettingsTab eventId={eventId} event={event} />}
      </div>
    </div>
  );
}
