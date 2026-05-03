import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { useEvent } from "@/hooks/useEvents";
import { Ticket, DollarSign, Users, Eye, Loader2, ArrowLeft } from "lucide-react";

export function EventAnalyticsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: event, isLoading: eventLoading } = useEvent(eventId!);
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error,
  } = useQuery({
    queryKey: ["analytics", "event", eventId],
    queryFn: () => analyticsService.getEventAnalytics(eventId!),
    enabled: !!eventId,
  });

  const isLoading = eventLoading || analyticsLoading;

  if (!eventId) {
    return (
      <div className="p-6 text-red-400">
        <h2 className="text-lg font-semibold mb-2">Invalid Event ID</h2>
        <Link to="/studio/events" className="text-sm text-[#CD000E] hover:text-[#860005]">
          ← Back to events
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#CD000E]" aria-hidden />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6 text-red-400">
        <h2 className="text-lg font-semibold mb-2">Event not found</h2>
        <p className="text-sm text-white/60 mb-4">
          {error instanceof Error ? error.message : "Unable to load event or analytics."}
        </p>
        <Link to="/studio/events" className="text-sm text-[#CD000E] hover:text-[#860005]">
          ← Back to events
        </Link>
      </div>
    );
  }

  const metrics = analytics ?? {
    ticketSales: 0,
    revenue: 0,
    registrations: 0,
    viewers: 0,
  };

  const cards = [
    {
      label: "Tickets sold",
      value: metrics.ticketSales.toLocaleString(),
      icon: Ticket,
    },
    {
      label: "Revenue",
      value: `$${metrics.revenue.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: DollarSign,
    },
    {
      label: "Registrations",
      value: metrics.registrations.toLocaleString(),
      icon: Users,
    },
    {
      label: "Peak viewers",
      value: metrics.viewers.toLocaleString(),
      icon: Eye,
    },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <Link
          to={`/studio/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back
        </Link>
      </div>

      <h1 className="text-2xl font-heading font-bold text-white mb-2">Event analytics</h1>
      <p className="text-white/60 text-sm mb-8">{event.name}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <Icon className="w-4 h-4" aria-hidden />
              {label}
            </div>
            <p className="text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
