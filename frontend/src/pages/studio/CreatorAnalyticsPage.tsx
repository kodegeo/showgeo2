import { useEntityContext } from "@/hooks/useEntityContext";
import { useEntityAnalytics } from "@/hooks/useAnalytics";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { TrendingUp, Eye, DollarSign, Users, Calendar } from "lucide-react";

export function CreatorAnalyticsPage() {
  const { currentEntity } = useEntityContext();
  const { data: analytics, isLoading } = useEntityAnalytics(currentEntity?.id || "");

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
            Analytics
          </h1>
          <p className="text-[#9A9A9A] font-body">
            Track your performance and engagement
          </p>
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
                  ${analytics?.storeSales?.toLocaleString() || 0}
                </div>
                <div className="text-sm font-heading font-semibold text-white uppercase tracking-tight mb-1">
                  Store Sales
                </div>
                <div className="text-xs text-[#9A9A9A] font-body">USD</div>
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

            {/* Engagement Metrics */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-heading font-semibold text-white mb-6 uppercase tracking-tight">
                Engagement Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border border-gray-800 rounded-lg">
                  <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-2">
                    Engagement Rate
                  </div>
                  <div className="text-3xl font-heading font-bold text-white">
                    {analytics?.engagementScore || 0}
                  </div>
                </div>
                <div className="p-4 border border-gray-800 rounded-lg">
                  <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-2">
                    Average Viewers
                  </div>
                  <div className="text-3xl font-heading font-bold text-white">
                    {analytics?.averageViewers?.toLocaleString() || 0}
                  </div>
                </div>
                <div className="p-4 border border-gray-800 rounded-lg">
                  <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-2">
                    Notifications Sent
                  </div>
                  <div className="text-3xl font-heading font-bold text-white">
                    {analytics?.notificationsSent?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </div>
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
    </CreatorDashboardLayout>
  );
}

