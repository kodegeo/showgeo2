// frontend/src/layouts/StudioLayout.tsx – studio workspace layout (path prefix /studio)

import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, Menu, X, ExternalLink, Radio, Users, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/services/api";

type MailboxItemLike = {
  id: string;
  readAt?: string | null;
  isRead?: boolean;
};

export function StudioLayout() {
  const navigate = useNavigate();
  const { ownedEntity } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadLoading, setUnreadLoading] = useState<boolean>(false);

  async function refreshUnreadCount() {
    try {
      setUnreadLoading(true);
      const res = await apiClient.get("/registrations/mailbox");
      const items: MailboxItemLike[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      const count = items.reduce((acc, item) => {
        const isUnread = (item.readAt == null) || (item.isRead === false);
        return acc + (isUnread ? 1 : 0);
      }, 0);
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    } finally {
      setUnreadLoading(false);
    }
  }

  useMemo(() => {
    void refreshUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const creatorName = ownedEntity?.name ?? "Creator";
  const creatorSlug = ownedEntity?.slug ?? "";
  const creatorAvatar = ownedEntity?.thumbnail ?? "";
  const followersCount = (ownedEntity as any)?._count?.follows ?? 0;
  const revenueTotal = 0;

  const publicPageHref = creatorSlug ? `/creators/${creatorSlug}` : "/studio/dashboard";

  function closeMobile() {
    setMobileOpen(false);
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5",
    ].join(" ");

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <header className="sticky top-0 z-40 h-14 border-b border-white/10 bg-[#0B0B0B]/80 backdrop-blur flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-white/5"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
              {creatorAvatar ? (
                <img src={creatorAvatar} alt={creatorName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold">
                  {creatorName?.charAt(0)?.toUpperCase() ?? "C"}
                </span>
              )}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{creatorName}</div>
              <div className="text-[11px] text-white/60">@{creatorSlug || "creator"}</div>
            </div>
            <div className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-white/80">
              <Users className="h-3.5 w-3.5" />
              <span>{followersCount}</span>
              <span className="text-white/50">followers</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <DollarSign className="h-4 w-4 text-white/70" />
            <div className="leading-tight">
              <div className="text-[11px] text-white/60">Revenue</div>
              <div className="text-sm font-semibold">${revenueTotal.toLocaleString()}</div>
            </div>
          </div>

          <button
            onClick={() => navigate(publicPageHref)}
            className="hidden md:inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View Public Page
          </button>

          <button
            onClick={() => navigate("/studio/events")}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600/90 px-3 py-2 text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            <Radio className="h-4 w-4" />
            Go Live
          </button>

          <button
            onClick={() => navigate("/profile/mailbox")}
            className="relative inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10 transition-colors"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {!unreadLoading && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-[11px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:block w-64 border-r border-white/10 p-4">
          <nav className="space-y-1">
            <NavLink to="/studio/dashboard" className={navClass}>Dashboard</NavLink>
            <NavLink to="/studio/events" className={navClass}>Events</NavLink>
            <NavLink to="/studio/store" className={navClass}>Store</NavLink>
            <NavLink to="/studio/analytics" className={navClass}>Analytics</NavLink>
            <NavLink to="/studio/settings" className={navClass}>Settings</NavLink>
          </nav>
          <div className="mt-6 space-y-2">
            <button
              onClick={() => navigate(publicPageHref)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View Public Page
            </button>
          </div>
        </aside>

        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={closeMobile}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-0 h-full w-72 bg-[#0B0B0B] border-r border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold">Creator Menu</div>
                <button
                  className="inline-flex items-center justify-center rounded-md p-2 hover:bg-white/5"
                  onClick={closeMobile}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1">
                <NavLink to="/studio/dashboard" className={navClass} onClick={closeMobile}>Dashboard</NavLink>
                <NavLink to="/studio/events" className={navClass} onClick={closeMobile}>Events</NavLink>
                <NavLink to="/studio/store" className={navClass} onClick={closeMobile}>Store</NavLink>
                <NavLink to="/studio/analytics" className={navClass} onClick={closeMobile}>Analytics</NavLink>
                <NavLink to="/studio/settings" className={navClass} onClick={closeMobile}>Settings</NavLink>
              </nav>
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    closeMobile();
                    navigate(publicPageHref);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Public Page
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
