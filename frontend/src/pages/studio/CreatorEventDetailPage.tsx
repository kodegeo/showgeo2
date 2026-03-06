import { useParams, Link } from "react-router-dom";
import { useEvent, useTransitionEventPhase, useEventAnalytics } from "@/hooks/useEvents";
import { EventPhase, EventStatus } from "@/types/eventPhase";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { getPhaseCapabilities } from "@/utils/eventPhaseCapabilities";
import { StreamingPanel } from "@/components/streaming/StreamingPanel";
import { AudiencePromotionSection } from "@/components/events/AudiencePromotionSection";
import { PreLiveActivityTimeline } from "@/components/events/PreLiveActivityTimeline";
import { PreLiveChecklist } from "@/components/events/PreLiveChecklist";


export function CreatorEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading, error } = useEvent(id!);
  const { data: analytics, isLoading: analyticsLoading } = useEventAnalytics(id!);
  const transition = useTransitionEventPhase();

  // Check if event ID is missing
  if (!id) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-red-400">
          <h2 className="text-lg font-semibold mb-2">Invalid Event ID</h2>
          <p className="text-sm text-gray-400 mb-4">
            The event ID is missing from the URL. Please navigate from the events list.
          </p>
          <Link
            to="/creator/events"
            className="text-sm text-[#CD000E] hover:text-[#860005]"
          >
            ← Back to events
          </Link>
        </div>
      </CreatorDashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-white/60">Loading event…</div>
      </CreatorDashboardLayout>
    );
  }

  if (error || !event) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-red-400">
          <h2 className="text-lg font-semibold mb-2">Event Not Found</h2>
          <p className="text-sm text-gray-400 mb-4">
            {error instanceof Error ? error.message : "The event you're looking for doesn't exist or you don't have permission to view it."}
          </p>
          <Link
            to="/creator/events"
            className="text-sm text-[#CD000E] hover:text-[#860005]"
          >
            ← Back to events
          </Link>
        </div>
      </CreatorDashboardLayout>
    );
  }

  const hasTickets =
    Array.isArray(event.ticketTypes) && event.ticketTypes.length > 0;

  function label(value: string) {
    return value.replace(/_/g, " ").toLowerCase();
  }

  // ✅ Use centralized phase capabilities
  const capabilities = getPhaseCapabilities(event.phase);
  
  function canEnd(status: EventStatus) {
    return status === EventStatus.LIVE;
  }

  return (
    <CreatorDashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-white">{event.name}</h1>
          <Link
            to="/creator/events"
            className="text-sm text-white/60 hover:text-white"
          >
            ← Back to events
          </Link>
        </div>

        {/* ✅ Phase Helper Text */}
        {capabilities.helperText && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-300 text-sm">{capabilities.helperText}</p>
          </div>
        )}

        {/* Meta */}
        <div className="space-y-2 text-white/70">
          <div>
            <span className="text-white/40">Status:</span>{" "}
            {label(event.status)}
          </div>
          <div>
            <span className="text-white/40">Phase:</span>{" "}
            {label(event.phase)}
          </div>
          <div>
            <span className="text-white/40">Start:</span>{" "}
            {new Date(event.startTime).toLocaleString()}
          </div>
          {event.location && (
            <div>
              <span className="text-white/40">Location:</span>{" "}
              {event.location}
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div className="pt-4 border-t border-white/10">
            <h2 className="text-lg font-medium mb-2 text-white">
              Description
            </h2>
            <p className="text-white/70">{event.description}</p>
          </div>
        )}

        {/* ✅ Audience & Promotion - Gated by audience capability */}
        {capabilities.audience && (
          <AudiencePromotionSection
            eventId={event.id}
            eventPhase={event.phase}
            eventStartTime={event.startTime}
            isPrimary={event.phase === EventPhase.PRE_LIVE}
          />
        )}

        {/* ✅ PRE_LIVE Activity Timeline - Only shown in PRE_LIVE phase */}
        {event.phase === EventPhase.PRE_LIVE && (
          <PreLiveActivityTimeline eventId={event.id} />
        )}

        {/* ✅ PRE_LIVE Checklist - Only shown in PRE_LIVE phase, above Start Event button */}
        {event.phase === EventPhase.PRE_LIVE && (
          <PreLiveChecklist event={event} />
        )}

        {/* Controls - Gated by Phase Capabilities */}
        <div className="pt-6 border-t border-white/10 flex flex-wrap gap-3">
          {/* ✅ Start Event - Phase transition from PRE_LIVE to LIVE (not a streaming action) */}
          {event.phase === EventPhase.PRE_LIVE && event.status !== EventStatus.LIVE && (
            <button
              onClick={() =>
                transition.mutate({
                  id: event.id,
                  phase: EventPhase.LIVE,
                })
              }
              className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded"
            >
              Start Event
            </button>
          )}

          {/* ✅ End Event - Only enabled when LIVE */}
          {canEnd(event.status) && (
            <button
              onClick={() =>
                transition.mutate({
                  id: event.id,
                  phase: EventPhase.POST_LIVE,
                })
              }
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded"
            >
              End Event
            </button>
          )}

          {/* ✅ Edit Event - Only enabled when eventMetadata capability is true */}
          {capabilities.eventMetadata && (
            <Link
              to={`/creator/events/${event.id}/edit`}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white font-semibold"
            >
              Edit Event
            </Link>
          )}

          {/* ✅ Tickets - Gated by ticketing capability */}
          {capabilities.ticketing && (
            <Link
              to={`/creator/events/${event.id}/tickets`}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white font-semibold"
            >
              Tickets
            </Link>
          )}
        </div>

        {/* ✅ Analytics Section - Gated by analytics capability */}
        {capabilities.analytics && (
        <div className="pt-6 border-t border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Analytics</h2>
          {analyticsLoading ? (
            <div className="text-white/60">Loading analytics...</div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Registrations</div>
                  <div className="text-2xl font-bold text-white">{analytics.registrationsCount}</div>
                </div>
                <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Tickets Issued</div>
                  <div className="text-2xl font-bold text-white">{analytics.ticketsIssued}</div>
                </div>
                <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Viewers Joined</div>
                  <div className="text-2xl font-bold text-white">{analytics.viewersJoined}</div>
                </div>
                <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Join Rate</div>
                  <div className="text-2xl font-bold text-white">{analytics.joinRate.toFixed(1)}%</div>
                </div>
              </div>

              {/* Breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Viewer Breakdown */}
                <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-white mb-3">Viewer Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Guest Viewers</span>
                      <span className="text-lg font-semibold text-white">{analytics.guestViewers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Logged-in Viewers</span>
                      <span className="text-lg font-semibold text-white">{analytics.loggedInViewers}</span>
                    </div>
                  </div>
                </div>

                {/* Reminder Effectiveness */}
                <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-white mb-3">Reminder Effectiveness</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">10-Min Reminders</span>
                      <span className="text-lg font-semibold text-white">{analytics.remindersSent10Min}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">30-Min Reminders</span>
                      <span className="text-lg font-semibold text-white">{analytics.remindersSent30Min}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-white/60">No analytics data available</div>
          )}
        </div>
        )}

        {/* ✅ Streaming - Only rendered when streaming capability is enabled */}
        {capabilities.streaming && (
          <div className="pt-6 border-t border-white/10">
            <StreamingPanel
              eventId={event.id}
              event={{
                status: event.status,
                phase: event.phase,
                startTime: event.startTime,
              }}
              isEntity={true}
              disableAutoJoin={true}
            />
          </div>
        )}

      </div>
    </CreatorDashboardLayout>
  );
}
