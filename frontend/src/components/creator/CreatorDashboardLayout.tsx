import { ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEntityContext } from "@/hooks/useEntityContext";
import { CreatorSidebar } from "./CreatorSidebar";
import { CreatorProfileBanner } from "./CreatorProfileBanner";
import { CreatorQuickActions } from "./CreatorQuickActions";

interface CreatorDashboardLayoutProps {
  children?: ReactNode;
  onEditClick?: () => void;
  onShareClick?: () => void;
}

export function CreatorDashboardLayout({
  children,
  onEditClick: onEditClickProp,
  onShareClick: onShareClickProp,
}: CreatorDashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentEntity } = useEntityContext();

  const isStudioOverview =
    location.pathname === "/studio/overview" || location.pathname === "/studio/dashboard";
  const onEditClick =
    onEditClickProp ?? (isStudioOverview ? () => navigate("/settings/creator") : undefined);
  const onShareClick =
    onShareClickProp ??
    (isStudioOverview && currentEntity
      ? () => {
          if (navigator.share) {
            void navigator.share({
              title: currentEntity.name,
              url: window.location.href,
            });
          }
        }
      : undefined);

  const content = children ?? <Outlet />;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex">
      {/* Sidebar */}
      <CreatorSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Profile Banner */}
        <CreatorProfileBanner onEditClick={onEditClick} onShareClick={onShareClick} />

        {/* Quick Actions */}
        <CreatorQuickActions />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{content}</div>
        </main>
      </div>
    </div>
  );
}
