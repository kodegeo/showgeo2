import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { eventsService, type EventRevenueResponse } from "@/services/events.service";
import { useEvent } from "@/hooks/useEvents";
import {
  Ticket,
  DollarSign,
  Lock,
  TrendingUp,
  Loader2,
  ArrowLeft,
  Users,
  PieChart,
} from "lucide-react";

const CHART_COLORS = ["#CD000E", "#F49600", "#1FB5FC", "#22c55e", "#a855f7", "#ec4899"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function RevenueBreakdownChart({
  collaborators,
}: {
  collaborators: EventRevenueResponse["collaborators"];
}) {
  if (collaborators.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-gray-800 bg-[#0B0B0B]/50 text-white/50">
        No revenue splits to display.
      </div>
    );
  }

  const total = collaborators.reduce((s, c) => s + c.sharePercent, 0) || 100;
  let acc = 0;
  const conicParts = collaborators
    .map((_, i) => {
      const pct = (collaborators[i].sharePercent / total) * 100;
      const start = acc;
      acc += pct;
      return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${acc}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div
        className="w-40 h-40 rounded-full border-4 border-[#0B0B0B] shrink-0"
        style={{
          background: `conic-gradient(${conicParts})`,
        }}
        aria-hidden
      />
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {collaborators.map((c, i) => (
          <li key={`${c.name}-${c.role}`} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-white">{c.name}</span>
            <span className="text-white/50">({c.sharePercent}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CreatorRevenuePage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: event, isLoading: eventLoading } = useEvent(eventId!);
  const {
    data: revenue,
    isLoading: revenueLoading,
    error,
  } = useQuery({
    queryKey: ["events", eventId, "revenue"],
    queryFn: () => eventsService.getEventRevenue(eventId!),
    enabled: !!eventId,
  });

  const isLoading = eventLoading || revenueLoading;

  if (!eventId) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-red-400">
          <h2 className="text-lg font-semibold mb-2">Invalid Event ID</h2>
          <Link
            to="/creator/dashboard"
            className="text-sm text-[#CD000E] hover:text-[#860005] flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
        </div>
      </CreatorDashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 animate-spin text-[#CD000E]" aria-hidden />
        </div>
      </CreatorDashboardLayout>
    );
  }

  if (error || !revenue) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-red-400">
          <h2 className="text-lg font-semibold mb-2">Could not load revenue data</h2>
          <p className="text-sm text-white/70 mb-4">
            {error instanceof Error ? error.message : "You may not have access to this event."}
          </p>
          <Link
            to="/creator/dashboard"
            className="text-sm text-[#CD000E] hover:text-[#860005] flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
        </div>
      </CreatorDashboardLayout>
    );
  }

  return (
    <CreatorDashboardLayout>
      <div className="p-6 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              to="/creator/dashboard"
              className="text-sm text-[#CD000E] hover:text-[#860005] flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <h1 className="text-2xl font-heading font-bold text-white uppercase tracking-tight">
              Event Revenue
            </h1>
            {event && <p className="text-white/60 mt-1">{event.name}</p>}
          </div>
          <Link to={`/studio/events/${eventId}`} className="text-sm text-white/70 hover:text-white">
            View event in Studio →
          </Link>
        </header>

        {/* Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#CD000E]/20 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-[#CD000E]" />
              </div>
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wider">Tickets Sold</p>
                <p className="text-xl font-heading font-semibold text-white">
                  {revenue.ticketsSold}
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
                  {formatCurrency(revenue.grossRevenue)}
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
                  {formatCurrency(revenue.escrowHeld)}
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
                  {formatCurrency(revenue.estimatedPayout)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Revenue breakdown chart */}
        <section className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-heading font-semibold text-white uppercase tracking-tight flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-[#CD000E]" />
            Revenue breakdown
          </h2>
          <RevenueBreakdownChart collaborators={revenue.collaborators} />
        </section>

        {/* Collaborators table */}
        <section className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-heading font-semibold text-white uppercase tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#CD000E]" />
              Collaborators
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-3 text-xs font-heading font-semibold text-white/70 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-xs font-heading font-semibold text-white/70 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-xs font-heading font-semibold text-white/70 uppercase tracking-wider">
                    Share %
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenue.collaborators.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-white/50 text-sm">
                      No collaborators or revenue splits configured.
                    </td>
                  </tr>
                ) : (
                  revenue.collaborators.map((c, i) => (
                    <tr
                      key={`${c.name}-${c.role}-${i}`}
                      className="border-b border-gray-800/80 hover:bg-white/5"
                    >
                      <td className="px-6 py-4 text-white font-medium">{c.name}</td>
                      <td className="px-6 py-4 text-white/80">{c.role}</td>
                      <td className="px-6 py-4 text-white/80">{c.sharePercent}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </CreatorDashboardLayout>
  );
}
