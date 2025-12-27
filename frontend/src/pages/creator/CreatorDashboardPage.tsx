import { useNavigate } from "react-router-dom";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useEvents } from "@/hooks/useEvents";
import { useStores } from "@/hooks/useStore";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { CreatorDashboardSkeleton } from "@/components/creator/CreatorDashboardSkeleton";
import { MetricWidget } from "@/components/creator/MetricWidget";
import { useCreatorMetrics, useTimeRangeFilter } from "@/hooks/creator/useCreatorMetrics";
import {
  Calendar,
  ShoppingBag,
  TrendingUp,
  Eye,
  Users,
  DollarSign,
  MessageSquare,
  Radio,
  FileText,
  Heart,
  Share2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, formatNumber, formatPercentage } from "@/services/creator/mockMetrics";
import type { ProfileEvent } from "../../../../packages/shared/types/event.types";

export function CreatorDashboardPage() {
  const navigate = useNavigate();
  const { currentEntity, isLoading: entityLoading } = useEntityContext();
  const { timeRange, setTimeRange, filterType, setFilterType } = useTimeRangeFilter();
  const { data: metrics, isLoading: metricsLoading } = useCreatorMetrics(timeRange);
  const { data: eventsData, isLoading: eventsLoading } = useEvents({
    entityId: currentEntity?.id,
    limit: 5,
  });
  const { data: storesData } = useStores({
    entityId: currentEntity?.id,
    limit: 1,
  });

  if (entityLoading || !currentEntity) {
    return (
      <CreatorDashboardLayout>
        <CreatorDashboardSkeleton />
      </CreatorDashboardLayout>
    );
  }

  const events: ProfileEvent[] = eventsData?.data ?? [];
  const store = storesData?.data?.[0];

  return (
    <CreatorDashboardLayout
      onEditClick={() => navigate("/creator/settings")}
      onShareClick={() => {
        // TODO: Implement share functionality
        if (navigator.share) {
          navigator.share({
            title: currentEntity.name,
            url: window.location.href,
          });
        }
      }}
    >
      <div className="space-y-8">
        {/* Filter Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Free/Paid Toggle */}
            <div className="flex items-center gap-2 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg p-1">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-colors ${
                  filterType === "all"
                    ? "bg-[#CD000E] text-white"
                    : "bg-transparent text-[#9A9A9A] hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("free")}
                className={`px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-colors ${
                  filterType === "free"
                    ? "bg-[#CD000E] text-white"
                    : "bg-transparent text-[#9A9A9A] hover:text-white"
                }`}
              >
                Free
              </button>
              <button
                onClick={() => setFilterType("paid")}
                className={`px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-colors ${
                  filterType === "paid"
                    ? "bg-[#CD000E] text-white"
                    : "bg-transparent text-[#9A9A9A] hover:text-white"
                }`}
              >
                Paid
              </button>
            </div>

            {/* Time Range Dropdown */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg text-white font-body text-sm focus:outline-none focus:border-[#CD000E] transition-colors"
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {/* Overview Stats - Primary Metrics */}
        {metricsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 animate-pulse"
              >
                <div className="w-12 h-12 bg-gray-800 rounded-lg mb-4" />
                <div className="w-20 h-8 bg-gray-800 rounded mb-2" />
                <div className="w-32 h-4 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricWidget
              title="Total Events"
              value={metrics.overview.totalEvents}
              subtitle={`${metrics.events.upcoming} upcoming, ${metrics.events.live} live`}
              icon={Calendar}
              iconColor="#CD000E"
              onClick={() => navigate("/creator/events")}
            />
            <MetricWidget
              title="Total Revenue"
              value={formatCurrency(metrics.overview.totalRevenue)}
              subtitle="From events and store"
              icon={DollarSign}
              iconColor="#F49600"
              onClick={() => navigate("/creator/analytics")}
            />
            <MetricWidget
              title="Average Viewers"
              value={formatNumber(metrics.overview.averageViewers)}
              subtitle="Per event"
              icon={Eye}
              iconColor="#1FB5FC"
              onClick={() => navigate("/creator/analytics")}
            />
            <MetricWidget
              title="Active Followers"
              value={formatNumber(metrics.overview.activeFollowers)}
              subtitle="Total followers"
              icon={Users}
              iconColor="#CD000E"
              onClick={() => navigate("/creator/analytics")}
            />
          </div>
        ) : null}

        {/* Secondary Metrics Row */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricWidget
              title="Store Sales"
              value={formatCurrency(metrics.overview.storeSales)}
              subtitle={`${metrics.store.totalOrders} orders`}
              icon={ShoppingBag}
              iconColor="#F49600"
              onClick={() => navigate("/creator/store")}
            />
            <MetricWidget
              title="Total Streams"
              value={metrics.overview.totalStreams}
              subtitle={`${formatNumber(metrics.streaming.totalWatchTime)}h watch time`}
              icon={Radio}
              iconColor="#1FB5FC"
            />
            <MetricWidget
              title="Total Posts"
              value={metrics.overview.totalPosts}
              subtitle={`${formatNumber(metrics.engagement.likes)} likes`}
              icon={FileText}
              iconColor="#CD000E"
            />
            <MetricWidget
              title="Engagement Score"
              value={metrics.overview.engagementScore}
              subtitle={formatPercentage(metrics.engagement.engagementRate)}
              icon={TrendingUp}
              iconColor="#F49600"
              onClick={() => navigate("/creator/analytics")}
            />
          </div>
        )}

        {/* My Events Section */}
        <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-heading font-semibold text-white uppercase tracking-tight">
              My Events
            </h2>
            <Link
              to="/creator/events"
              className="text-sm text-[#CD000E] hover:text-[#860005] font-body font-semibold uppercase tracking-wider transition-colors"
            >
              View All →
            </Link>
          </div>

          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 border border-gray-800 rounded-lg animate-pulse"
                >
                  <div className="w-3/4 h-5 bg-gray-800 rounded mb-2" />
                  <div className="w-full h-4 bg-gray-800 rounded mb-3" />
                  <div className="flex gap-2">
                    <div className="w-20 h-4 bg-gray-800 rounded" />
                    <div className="w-24 h-4 bg-gray-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#CD000E]/10 rounded-full flex items-center justify-center">
                <Calendar className="w-10 h-10 text-[#CD000E]" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight">
                No Events Yet
              </h3>
              <p className="text-[#9A9A9A] font-body mb-6 max-w-md mx-auto">
                Create your first event to start engaging with your audience
              </p>
              <Link
                to="/creator/events/new"
                className="inline-block px-8 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 text-sm shadow-lg hover:shadow-[#CD000E]/50 transform hover:scale-105"
              >
                Create Your First Event
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 5).map((event) => (
                <Link
                  key={event.id}
                  to={`/creator/events/${event.id}`}
                  className="block p-4 border border-gray-800 rounded-lg hover:border-[#CD000E]/50 transition-all duration-300 hover:bg-gray-800/30 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-heading font-semibold text-white mb-1 uppercase tracking-tight group-hover:text-[#CD000E] transition-colors line-clamp-1">
                        {event.name}
                      </h3>
                      <p className="text-sm text-[#9A9A9A] font-body mb-3 line-clamp-2">
                        {event.description || "No description"}
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
                                event.phase === "PRE_LIVE_PHASE"
                                  ? "bg-blue-900/30 text-blue-300 border border-blue-800/50"
                                  : event.phase === "LIVE"
                                  ? "bg-[#CD000E]/30 text-[#CD000E] border border-[#CD000E]/50"
                                  : "bg-gray-800 text-gray-400 border border-gray-700"
                              }
                            `}
                          >
                            {event.phase.replace("_", " ")}
                          </span>
                        )}
                        <span
                          className={`
                            px-2 py-1 rounded text-xs font-heading font-semibold uppercase tracking-wider
                            ${
                              event.status === "LIVE"
                                ? "bg-green-900/30 text-green-300 border border-green-800/50"
                                : event.status === "COMPLETED"
                                ? "bg-gray-800 text-gray-400 border border-gray-700"
                                : event.status === "SCHEDULED"
                                ? "bg-blue-900/30 text-blue-300 border border-blue-800/50"
                                : "bg-yellow-900/30 text-yellow-300 border border-yellow-800/50"
                            }
                          `}
                        >
                          {event.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Eye className="w-5 h-5 text-[#9A9A9A] group-hover:text-[#CD000E] transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Store Section */}
        {store && (
          <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-semibold text-white uppercase tracking-tight">
                My Store
              </h2>
              <Link
                to="/creator/store"
                className="text-sm text-[#CD000E] hover:text-[#860005] font-body font-semibold uppercase tracking-wider transition-colors"
              >
                Manage Store →
              </Link>
            </div>
            <div className="p-4 border border-gray-800 rounded-lg">
              <h3 className="text-lg font-heading font-semibold text-white mb-2 uppercase tracking-tight">
                {store.name}
              </h3>
              <p className="text-sm text-[#9A9A9A] font-body mb-4">{store.description}</p>
              <div className="flex items-center gap-4 text-sm text-[#9A9A9A] font-body">
                <span className="capitalize">Status: {store.status}</span>
                <span className="capitalize">Visibility: {store.visibility}</span>
              </div>
            </div>
          </div>
        )}

        {/* Engagement Metrics */}
        {metrics && (
          <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-semibold text-white uppercase tracking-tight">
                Engagement Metrics
              </h2>
              <Link
                to="/creator/analytics"
                className="text-sm text-[#CD000E] hover:text-[#860005] font-body font-semibold uppercase tracking-wider transition-colors"
              >
                View Full Analytics →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-gray-800 rounded-lg text-center">
                <Heart className="w-6 h-6 text-[#CD000E] mx-auto mb-2" />
                <div className="text-2xl font-heading font-bold text-white mb-1">
                  {formatNumber(metrics.engagement.likes)}
                </div>
                <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">Likes</div>
              </div>
              <div className="p-4 border border-gray-800 rounded-lg text-center">
                <MessageSquare className="w-6 h-6 text-[#1FB5FC] mx-auto mb-2" />
                <div className="text-2xl font-heading font-bold text-white mb-1">
                  {formatNumber(metrics.engagement.comments)}
                </div>
                <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">Comments</div>
              </div>
              <div className="p-4 border border-gray-800 rounded-lg text-center">
                <Share2 className="w-6 h-6 text-[#F49600] mx-auto mb-2" />
                <div className="text-2xl font-heading font-bold text-white mb-1">
                  {formatNumber(metrics.engagement.shares)}
                </div>
                <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">Shares</div>
              </div>
              <div className="p-4 border border-gray-800 rounded-lg text-center">
                <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-heading font-bold text-white mb-1">
                  {formatPercentage(metrics.engagement.engagementRate)}
                </div>
                <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">
                  Engagement Rate
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
}

