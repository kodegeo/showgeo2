import { useEffect } from "react";
import { Users, Building2, Clock, FileText, UserX } from "lucide-react";
import { useAdminUsers, useAdminEntities, useAdminReports } from "@/hooks/useAdmin";

/**
 * AdminDashboardPage - SHOWGEO ADMIN dashboard
 * 
 * This is a platform-level admin area for managing the entire Showgeo platform.
 * No entity context required.
 * 
 * Read-only dashboard displaying platform metrics and recent activity.
 */
export function AdminDashboardPage() {
  const { data: usersData, isLoading: usersLoading } = useAdminUsers();
  const { data: entitiesData, isLoading: entitiesLoading } = useAdminEntities();

  // ✅ SINGLE SOURCE OF TRUTH
  const reportsQuery = useAdminReports("OPEN");
  const {
    data: reports,
    isLoading: reportsLoading,
  } = reportsQuery;

  useEffect(() => {
    reportsQuery.refetch();
  }, []);

  const totalUsers = usersData?.data?.length || 0;
  const disabledUsers =
    usersData?.data?.filter(
      (user: any) => user.profile?.preferences?.isDisabled === true
    ).length || 0;

  const totalCreators =
    entitiesData?.data?.filter((e: any) => e.status === "APPROVED").length || 0;

  const pendingCreators =
    entitiesData?.data?.filter((e: any) => e.status === "PENDING").length || 0;

  const openReports = reports?.length || 0;

  const isLoading = usersLoading || entitiesLoading;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-white/60">Platform administration and oversight</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <MetricCard
          title="Total Users"
          value={isLoading ? "..." : totalUsers.toLocaleString()}
          icon={Users}
          iconColor="#1FB5FC"
          isLoading={isLoading}
        />

        {/* Total Creators */}
        <MetricCard
          title="Total Creators"
          value={isLoading ? "..." : totalCreators.toLocaleString()}
          icon={Building2}
          iconColor="#CD000E"
          subtitle="Approved entities"
          isLoading={isLoading}
        />

        {/* Pending Creators */}
        <MetricCard
          title="Pending Creators"
          value={isLoading ? "..." : pendingCreators.toLocaleString()}
          icon={Clock}
          iconColor="#F49600"
          subtitle="Awaiting approval"
          isLoading={isLoading}
        />

        {/* Open Reports */}
        <MetricCard
          title="Open Reports"
          value={isLoading ? "..." : openReports.toLocaleString()}
          icon={FileText}
          iconColor="#9A9A9A"
          subtitle="Requires attention"
          isLoading={isLoading}
        />

        {/* Disabled Users */}
        <MetricCard
          title="Disabled Users"
          value={isLoading ? "..." : disabledUsers.toLocaleString()}
          icon={UserX}
          iconColor="#EF4444"
          subtitle="Account disabled"
          isLoading={isLoading}
        />
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Admin Actions */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Admin Actions</h2>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-white/60 text-sm">Loading recent actions...</div>
            ) : (
              <div className="text-white/60 text-sm">
                <p className="mb-2">Recent admin actions will appear here.</p>
                <p className="text-white/40 text-xs">
                  This section will display a log of recent administrative actions such as user suspensions, entity approvals, and enforcement actions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Reports</h2>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-white/60 text-sm">Loading recent reports...</div>
            ) : openReports > 0 ? (
              <div className="text-white/60 text-sm">
                <p className="mb-2">{openReports} open report{openReports !== 1 ? "s" : ""} requiring attention.</p>
                <p className="text-white/40 text-xs">
                  View and manage reports in the{" "}
                  <a href="/admin/users" className="text-blue-400 hover:text-blue-300 underline">
                    User Management
                  </a>{" "}
                  section.
                </p>
              </div>
            ) : (
              <div className="text-white/60 text-sm">
                <p className="mb-2">No open reports at this time.</p>
                <p className="text-white/40 text-xs">
                  All reports have been resolved or dismissed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MetricCard - Reusable metric card component for admin dashboard
 */
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor?: string;
  subtitle?: string;
  isLoading?: boolean;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = "#CD000E",
  subtitle,
  isLoading,
}: MetricCardProps) {
  return (
    <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${iconColor}10` }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold text-white mb-1">
          {isLoading ? (
            <span className="inline-block w-16 h-8 bg-gray-800 rounded animate-pulse" />
          ) : (
            value
          )}
        </div>
        <h3 className="text-sm font-semibold text-white/90 uppercase tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-white/60 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

