import { useMemo, useState } from "react";
import { useEntityContext } from "@/hooks/useEntityContext";
import type { ProfileEvent } from "@/types/event.types";
import { EventPhase } from "@/types/event.types";
import { Calendar, Plus, Eye, ListFilter } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { eventsService, type MyEventRow } from "@/services/events.service";

function toIsoStartTime(startTime: string | Date): string {
  if (typeof startTime === "string") return startTime;
  return new Date(startTime).toISOString();
}

function startMs(e: ProfileEvent): number {
  return new Date(e.startTime).getTime();
}

/** Local calendar day (midnight) for comparing “is this show’s day still today or later?”. */
function startOfDayLocalMs(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function startOfTodayLocalMs(): number {
  return startOfDayLocalMs(new Date());
}

function eventStartDayLocalMs(iso: string): number {
  return startOfDayLocalMs(new Date(iso));
}

function parsePhase(raw: string | undefined): EventPhase | undefined {
  if (!raw) return undefined;
  const v = String(raw).trim().toUpperCase().replace(/-/g, "_");
  if ((Object.values(EventPhase) as string[]).includes(v)) {
    return v as EventPhase;
  }
  return undefined;
}

/** True if this event has gone live at least once (phase, launch record, or active live). */
function eventHadLiveBroadcast(event: ProfileEvent): boolean {
  if (event.phase === EventPhase.LIVE || event.phase === EventPhase.POST_LIVE) {
    return true;
  }
  if (event.lastLaunchedBy && String(event.lastLaunchedBy).trim().length > 0) {
    return true;
  }
  return false;
}

/** DRAFT/SCHEDULED, start day before today, and never went live — UI label only (DB status unchanged). */
function isScheduleExpired(event: ProfileEvent): boolean {
  if (event.status !== "DRAFT" && event.status !== "SCHEDULED") {
    return false;
  }
  if (eventHadLiveBroadcast(event)) {
    return false;
  }
  return eventStartDayLocalMs(event.startTime) < startOfTodayLocalMs();
}

/** Past calendar start + went live but lifecycle row not yet COMPLETED — show Completed in list. */
function isCompletedRunListing(event: ProfileEvent): boolean {
  if (event.status === "COMPLETED") {
    return true;
  }
  if (event.status !== "DRAFT" && event.status !== "SCHEDULED") {
    return false;
  }
  if (eventStartDayLocalMs(event.startTime) >= startOfTodayLocalMs()) {
    return false;
  }
  return eventHadLiveBroadcast(event);
}

/** Soonest start first — best for planning upcoming work. */
function sortUpcomingChronological(events: ProfileEvent[]): ProfileEvent[] {
  return [...events].sort((a, b) => startMs(a) - startMs(b));
}

/** Most recent start first — easier to find something you just wrapped for analytics. */
function sortPastRecentFirst(events: ProfileEvent[]): ProfileEvent[] {
  return [...events].sort((a, b) => startMs(b) - startMs(a));
}

type EventsListFilter = "upcoming" | "past" | "all";

export function CreatorEventsPage() {
  const { currentEntity } = useEntityContext();
  const [listFilter, setListFilter] = useState<EventsListFilter>("upcoming");

  const { data: myEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", "my-events", "studio-list"],
    queryFn: () => eventsService.getMyEvents(),
  });

  const events = useMemo(
    () =>
      (myEventsData?.events ?? []).map((row: MyEventRow) => ({
        id: row.id,
        name: row.name,
        startTime: toIsoStartTime(row.startTime as string | Date),
        status: row.status as ProfileEvent["status"],
        phase: parsePhase(row.phase),
        lastLaunchedBy: row.lastLaunchedBy ?? null,
        entity:
          currentEntity && row.entityId === currentEntity.id
            ? { id: currentEntity.id, name: currentEntity.name }
            : { id: row.entityId, name: "My Event" },
      })),
    [myEventsData?.events, currentEntity],
  );

  const { liveNow, scheduledUpcoming, staleScheduled, pastEvents } = useMemo(() => {
    const live: ProfileEvent[] = [];
    const upcoming: ProfileEvent[] = [];
    const stale: ProfileEvent[] = [];
    const past: ProfileEvent[] = [];
    const today0 = startOfTodayLocalMs();

    for (const e of events) {
      if (e.status === "COMPLETED" || e.status === "CANCELLED") {
        past.push(e);
        continue;
      }
      if (e.status === "LIVE") {
        live.push(e);
        continue;
      }
      if (e.status === "DRAFT" || e.status === "SCHEDULED") {
        if (eventStartDayLocalMs(e.startTime) >= today0) {
          upcoming.push(e);
        } else {
          stale.push(e);
        }
        continue;
      }
      // Any other non-terminal status: keep visible but out of “future dated” bucket
      stale.push(e);
    }

    return {
      liveNow: sortUpcomingChronological(live),
      scheduledUpcoming: sortUpcomingChronological(upcoming),
      staleScheduled: sortPastRecentFirst(stale),
      pastEvents: sortPastRecentFirst(past),
    };
  }, [events]);

  const activeWorkCount = liveNow.length + scheduledUpcoming.length + staleScheduled.length;

  const isLoading = eventsLoading;
  const showUpcoming = listFilter === "upcoming" || listFilter === "all";
  const showPast = listFilter === "past" || listFilter === "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
            My Events
          </h1>
          <p className="text-[#9A9A9A] font-body">Manage and schedule your events</p>
        </div>

        <Link
          to="/studio/events/create"
          className="px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Event
        </Link>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CD000E] mx-auto mb-4" />
          <p className="text-[#9A9A9A] font-body">Loading events...</p>
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="text-center py-12 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
          <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight">
            No Events Yet
          </h3>
          <p className="text-[#9A9A9A] font-body mb-6">Create your first event to get started</p>
          <Link
            to="/studio/events/create"
            className="inline-block px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50"
          >
            Create Event
          </Link>
        </div>
      )}

      {!isLoading && events.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-800 bg-[#0B0B0B]/80 px-4 py-3">
            <div className="flex items-center gap-2 text-[#9A9A9A] text-sm font-body min-w-0">
              <ListFilter className="w-4 h-4 text-[#CD000E] shrink-0" aria-hidden />
              <span className="min-w-0">
                {listFilter === "upcoming" &&
                  "Live + drafts/scheduled on today or a future day (soonest first). Older start dates are grouped below."}
                {listFilter === "past" && "Completed or cancelled only — newest first. Open an event for details."}
                {listFilter === "all" && "All sections: live & future-dated, then past-dated drafts, then completed."}
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400 font-body uppercase tracking-wider shrink-0">
              <span className="sr-only">Event list</span>
              <select
                value={listFilter}
                onChange={e => setListFilter(e.target.value as EventsListFilter)}
                className="min-w-[12rem] bg-black/60 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 font-body normal-case tracking-normal focus:outline-none focus:ring-2 focus:ring-[#CD000E]/40"
                aria-label="Choose which events to show"
              >
                <option value="upcoming">Upcoming &amp; active</option>
                <option value="past">Archived (completed)</option>
                <option value="all">All events</option>
              </select>
            </label>
          </div>

          {listFilter === "upcoming" && activeWorkCount === 0 && (
            <p className="text-sm text-[#9A9A9A] font-body border border-gray-800 rounded-lg px-4 py-3">
              No live or open events. Try{" "}
              <strong className="text-white/90">Archived (completed)</strong> for finished shows, or{" "}
              <strong className="text-white/90">All events</strong> to see everything.
            </p>
          )}
          {listFilter === "past" && pastEvents.length === 0 && (
            <p className="text-sm text-[#9A9A9A] font-body border border-gray-800 rounded-lg px-4 py-3">
              No archived (completed/cancelled) events yet. Switch to{" "}
              <strong className="text-white/90">Upcoming &amp; active</strong> for current work.
            </p>
          )}

          <div className="space-y-10">
            {showUpcoming && activeWorkCount > 0 && (
              <section className="space-y-8">
                <h2 className="text-lg font-heading font-semibold text-white uppercase tracking-wide border-b border-gray-800 pb-2">
                  Upcoming &amp; active
                </h2>

                {liveNow.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-heading uppercase tracking-widest text-[#CD000E]">Live now</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {liveNow.map(event => (
                        <StudioEventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                )}

                {scheduledUpcoming.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-heading uppercase tracking-widest text-gray-400">
                      Scheduled from today forward
                    </h3>
                    <p className="text-xs text-gray-600 font-body -mt-1">Earliest start date first.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {scheduledUpcoming.map(event => (
                        <StudioEventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                )}

                {staleScheduled.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-heading uppercase tracking-widest text-amber-500/90">
                      Past start date — open rows
                    </h3>
                    <p className="text-xs text-gray-600 font-body -mt-1 max-w-2xl">
                      <strong className="text-amber-200/80">Expired</strong> if the show never went live. If it did go live, cards show{" "}
                      <strong className="text-gray-400">Completed</strong> even when the row is still draft/scheduled until you finalize in the app.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {staleScheduled.map(event => (
                        <StudioEventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {showPast && pastEvents.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-gray-800 pb-2">
                  <div>
                    <h2 className="text-lg font-heading font-semibold text-[#9A9A9A] uppercase tracking-wide">
                      Archived — completed &amp; cancelled
                    </h2>
                    <p className="text-xs text-gray-500 font-body mt-1">
                      Newest first. Open an event for history; aggregate metrics in studio analytics.
                    </p>
                  </div>
                  <Link
                    to="/studio/analytics"
                    className="text-xs font-heading uppercase tracking-wider text-[#CD000E] hover:text-[#F49600] shrink-0"
                  >
                    Studio analytics →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvents.map(event => (
                    <StudioEventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StudioEventCard({ event }: { event: ProfileEvent }) {
  const scheduleExpired = isScheduleExpired(event);
  const completedListing = isCompletedRunListing(event);

  return (
    <Link
      to={`/studio/events/${event.id}`}
      className="block p-4 border border-gray-800 rounded-lg hover:border-[#CD000E]/50 transition-all duration-300 hover:bg-gray-800/30 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-heading font-semibold text-white mb-1 uppercase tracking-tight group-hover:text-[#CD000E] transition-colors line-clamp-1">
            {event.name}
          </h3>
          <p className="text-sm text-[#9A9A9A] font-body mb-3 line-clamp-2">
            {event.entity?.name ?? "My Event"}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-[#9A9A9A] font-body">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(event.startTime).toLocaleDateString()}</span>
            </div>
            {event.phase && (
              <span
                className={`
                    px-2 py-1 rounded text-xs font-heading font-semibold uppercase tracking-wider
                    ${
                      event.phase === "PRE_LIVE"
                        ? "bg-blue-900/30 text-blue-300 border border-blue-800/50"
                        : event.phase === "LIVE"
                          ? "bg-[#CD000E]/30 text-[#CD000E] border border-[#CD000E]/50"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                    }
                  `}
              >
                {String(event.phase).replace("_", " ")}
              </span>
            )}
            <span
              className={`
                  px-2 py-1 rounded text-xs font-heading font-semibold uppercase tracking-wider
                  ${
                    completedListing
                      ? "bg-gray-800 text-gray-300 border border-gray-600"
                      : scheduleExpired
                        ? "bg-amber-950/60 text-amber-100 border border-amber-700/50"
                        : event.status === "LIVE"
                          ? "bg-green-900/30 text-green-300 border border-green-800/50"
                          : event.status === "COMPLETED"
                            ? "bg-gray-800 text-gray-400 border border-gray-700"
                            : event.status === "SCHEDULED"
                              ? "bg-blue-900/30 text-blue-300 border border-blue-800/50"
                              : "bg-yellow-900/30 text-yellow-300 border border-yellow-800/50"
                  }
                `}
            >
              {completedListing ? "Completed" : scheduleExpired ? "Expired" : event.status}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Eye className="w-5 h-5 text-[#9A9A9A] group-hover:text-[#CD000E] transition-colors" />
        </div>
      </div>
    </Link>
  );
}
