import { Link } from "react-router-dom";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useEntityAnalytics } from "@/hooks/useAnalytics";
import { TrendingUp, Eye, DollarSign, Users, Calendar, Ticket } from "lucide-react";

export function CreatorAnalyticsPage() {
  const { currentEntity } = useEntityContext();
  const { data: analytics, isLoading } = useEntityAnalytics(currentEntity?.id || "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
          Analytics
        </h1>
        <p className="text-[#9A9A9A] font-body">Track your performance and engagement</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CD000E] mx-auto mb-4"></div>
          <p className="text-[#9A9A9A] font-body">Loading analytics...</p>
        </div>
      ) : analytics ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <Eye className="w-8 h-8 text-[#CD000E]" />
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">
                {analytics?.averageViewers?.toLocaleString() || 0}
              </div>
              <div className="text-sm font-heading font-semibold text-white uppercase tracking-tight mb-1">
                Average Viewers
              </div>
              <div className="text-xs text-[#9A9A9A] font-body">Per event</div>
            </div>

            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-[#CD000E]" />
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">
                {analytics?.activeFollowers?.toLocaleString() || 0}
              </div>
              <div className="text-sm font-heading font-semibold text-white uppercase tracking-tight mb-1">
                Active Followers
              </div>
              <div className="text-xs text-[#9A9A9A] font-body">Currently active</div>
            </div>

            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-[#CD000E]" />
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">
                $
                {(analytics?.totalTicketRevenue ?? 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm font-heading font-semibold text-white uppercase tracking-tight mb-1">
                Ticket Revenue
              </div>
              <div className="text-xs text-[#9A9A9A] font-body">From events</div>
            </div>

            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-[#CD000E]" />
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">
                {analytics?.eventsCount?.toLocaleString() || 0}
              </div>
              <div className="text-sm font-heading font-semibold text-white uppercase tracking-tight mb-1">
                Events Count
              </div>
              <div className="text-xs text-[#9A9A9A] font-body">Total events</div>
            </div>
          </div>

          {/* Growth metrics: tickets, registrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
              <Ticket className="w-8 h-8 text-[#CD000E] mb-4" />
              <div className="text-3xl font-heading font-bold text-white mb-1">
                {(analytics as { totalTicketsSold?: number })?.totalTicketsSold?.toLocaleString() ??
                  0}
              </div>
              <div className="text-sm font-heading font-semibold text-white uppercase tracking-tight mb-1">
                Tickets Sold
              </div>
            </div>
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
              <Users className="w-8 h-8 text-[#CD000E] mb-4" />
              <div className="text-3xl font-heading font-bold text-white mb-1">
                {(
                  analytics as { totalRegistrations?: number }
                )?.totalRegistrations?.toLocaleString() ?? 0}
              </div>
              <div className="text-sm font-heading font-semibold text-white uppercase tracking-tight mb-1">
                Registrations
              </div>
            </div>
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
              <DollarSign className="w-8 h-8 text-[#CD000E] mb-4" />
              <div className="text-3xl font-heading font-bold text-white mb-1">
                ${(analytics?.storeSales ?? 0).toLocaleString()}
              </div>
              <div className="text-sm font-heading font-semibold text-white uppercase tracking-tight mb-1">
                Store Sales
              </div>
            </div>
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
              <TrendingUp className="w-8 h-8 text-[#CD000E] mb-4" />
              <div className="text-3xl font-heading font-bold text-white mb-1">
                {analytics?.engagementScore ?? 0}
              </div>
              <div className="text-sm font-heading font-semibold text-white uppercase tracking-tight mb-1">
                Engagement Score
              </div>
            </div>
          </div>

          {/* Top performing events */}
          {(
            analytics as {
              topPerformingEvents?: Array<{
                eventId: string;
                name: string;
                ticketSales: number;
                revenue: number;
              }>;
            }
          )?.topPerformingEvents?.length ? (
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-heading font-semibold text-white mb-4 uppercase tracking-tight">
                Top Performing Events
              </h2>
              <ul className="space-y-3">
                {(
                  analytics as {
                    topPerformingEvents: Array<{
                      eventId: string;
                      name: string;
                      ticketSales: number;
                      revenue: number;
                    }>;
                  }
                ).topPerformingEvents.map(ev => (
                  <li key={ev.eventId}>
                    <Link
                      to={`/studio/events/${ev.eventId}/analytics`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-800 hover:border-[#CD000E]/50 transition-colors"
                    >
                      <span className="font-medium text-white truncate">{ev.name}</span>
                      <span className="text-sm text-[#9A9A9A] shrink-0 ml-2">
                        {ev.ticketSales} tickets · $
                        {ev.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div className="text-center py-12 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
          <TrendingUp className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight">
            No Analytics Yet
          </h3>
          <p className="text-[#9A9A9A] font-body">
            Analytics will appear as you create events and engage with your audience
          </p>
        </div>
      )}
    </div>
  );
}
