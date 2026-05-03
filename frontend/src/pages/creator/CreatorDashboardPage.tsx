import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import {
  eventsService,
  type MyEventDashboardItem,
  type MyEventClipItem,
} from "@/services/events.service";
import {
  Calendar,
  Ticket,
  DollarSign,
  Lock,
  TrendingUp,
  Film,
  Loader2,
  LayoutDashboard,
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function EventDashboardCard({ event }: { event: MyEventDashboardItem }) {
  return (
    <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-heading font-semibold text-white truncate">{event.name}</h3>
          <p className="text-sm text-white/70 mt-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 shrink-0" />
            {formatDate(event.startTime)}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-white/50 block">Tickets Sold</span>
            <span className="text-white font-medium">{event.ticketsSold}</span>
          </div>
          <div>
            <span className="text-white/50 block">Gross Revenue</span>
            <span className="text-white font-medium">{formatCurrency(event.grossRevenue)}</span>
          </div>
          <div>
            <span className="text-white/50 block">Escrow Held</span>
            <span className="text-white font-medium">{formatCurrency(event.escrowHeld)}</span>
          </div>
          <div>
            <span className="text-white/50 block">Est. Payout</span>
            <span className="text-white font-medium">{formatCurrency(event.estimatedPayout)}</span>
          </div>
        </div>
        <Link
          to={`/studio/events/${event.id}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white text-sm font-semibold uppercase tracking-wider rounded-lg transition-colors shrink-0"
        >
          <LayoutDashboard className="w-4 h-4" />
          View Event Dashboard
        </Link>
      </div>
    </div>
  );
}

function RecentClipsList({ clips }: { clips: MyEventClipItem[] }) {
  if (clips.length === 0) {
    return (
      <p className="text-sm text-white/50 py-4">
        No clips yet. Create clips from your event streams.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {clips.map(clip => (
        <li key={clip.id}>
          <Link
            to={`/events/${clip.eventId}`}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-white/5 transition-colors"
          >
            {clip.thumbnailUrl ? (
              <img
                src={clip.thumbnailUrl}
                alt={clip.title ?? "Clip"}
                className="w-16 h-10 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-10 rounded bg-gray-800 flex items-center justify-center">
                <Film className="w-5 h-5 text-white/40" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-white font-medium block truncate">
                {clip.title ?? "Untitled clip"}
              </span>
              <span className="text-xs text-white/50">
                {clip.event?.name ?? "Event"} · {clip.views} views
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CreatorDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["events", "my-events"],
    queryFn: () => eventsService.getMyEvents(),
  });

  if (isLoading) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 animate-spin text-[#CD000E]" aria-hidden />
        </div>
      </CreatorDashboardLayout>
    );
  }

  if (error) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-red-400">
          <h2 className="text-lg font-semibold mb-2">Could not load dashboard</h2>
          <p className="text-sm text-white/70 mb-4">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Link to="/studio/overview" className="text-sm text-[#CD000E] hover:text-[#860005]">
            ← Back to Studio
          </Link>
        </div>
      </CreatorDashboardLayout>
    );
  }

  const events = data?.events ?? [];
  const recentClips = data?.recentClips ?? [];

  const totals = events.reduce(
    (acc, e) => ({
      ticketsSold: acc.ticketsSold + e.ticketsSold,
      grossRevenue: acc.grossRevenue + e.grossRevenue,
      escrowHeld: acc.escrowHeld + e.escrowHeld,
      estimatedPayout: acc.estimatedPayout + e.estimatedPayout,
    }),
    { ticketsSold: 0, grossRevenue: 0, escrowHeld: 0, estimatedPayout: 0 },
  );

  return (
    <CreatorDashboardLayout>
      <div className="p-6 space-y-8">
        <header>
          <h1 className="text-2xl font-heading font-bold text-white uppercase tracking-tight">
            Dashboard
          </h1>
          <p className="text-white/60 mt-1">Overview of your events, revenue, and clips.</p>
        </header>

        {/* Summary stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#CD000E]/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#CD000E]" />
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Upcoming Events</p>
                <p className="text-xl font-heading font-semibold text-white">{events.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#CD000E]/20 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-[#CD000E]" />
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Tickets Sold</p>
                <p className="text-xl font-heading font-semibold text-white">
                  {totals.ticketsSold}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F49600]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#F49600]" />
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Gross Revenue</p>
                <p className="text-xl font-heading font-semibold text-white">
                  {formatCurrency(totals.grossRevenue)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1FB5FC]/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#1FB5FC]" />
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Escrow Held</p>
                <p className="text-xl font-heading font-semibold text-white">
                  {formatCurrency(totals.escrowHeld)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#22c55e]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Estimated Payout</p>
                <p className="text-xl font-heading font-semibold text-white">
                  {formatCurrency(totals.estimatedPayout)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Events / Event cards */}
        <section className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-semibold text-white uppercase tracking-tight">
              My Events
            </h2>
            <Link
              to="/studio/events"
              className="text-sm text-[#CD000E] hover:text-[#860005] font-body font-semibold uppercase tracking-wider transition-colors"
            >
              Manage events →
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="text-white/50 py-6">
              No events yet. Create an event from Studio to see it here.
            </p>
          ) : (
            <div className="space-y-4">
              {events.map(event => (
                <EventDashboardCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Recent Clips */}
        <section className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-heading font-semibold text-white uppercase tracking-tight flex items-center gap-2">
              <Film className="w-5 h-5 text-[#CD000E]" />
              Recent Clips
            </h2>
          </div>
          <RecentClipsList clips={recentClips} />
        </section>
      </div>
    </CreatorDashboardLayout>
  );
}
