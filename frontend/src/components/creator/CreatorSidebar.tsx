import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  UsersRound,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  UserRound,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useUserEntities } from "@/hooks/useUsers";
import {
  AppSidebar,
  SidebarNavItem,
  SidebarUtilitySection,
  SIDEBAR,
} from "@/components/shared/sidebar";

const navButtonClass = [
  "flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-body uppercase tracking-wider transition-colors",
  SIDEBAR.inactiveText,
  SIDEBAR.hoverBg,
  "hover:text-white text-left",
].join(" ");

export function CreatorSidebar() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { currentEntityId, switchToEntity } = useEntityContext();

  const userId = user?.id ?? null;
  const { data: entitiesData } = useUserEntities(userId);

  const entityOptions = useMemo(() => {
    const list = [...(entitiesData?.owned ?? []), ...(entitiesData?.managed ?? [])];
    const seen = new Set<string>();
    return list.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [entitiesData]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("[CreatorSidebar] Log out failed:", error);
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const brand = (
    <Link
      to="/studio/overview"
      className="block w-full py-0.5 text-inherit no-underline hover:opacity-90 transition-opacity"
      aria-label="Showgeo Studio — back to overview"
    >
      <div className="flex flex-col justify-center gap-0.5 leading-none py-0.5">
        <span className="font-heading text-[0.65rem] md:text-xs font-semibold uppercase tracking-[0.22em] text-[#CD000E]">
          Showgeo
        </span>
        <span className="font-heading text-2xl md:text-3xl lg:text-[2rem] font-bold text-white uppercase tracking-tighter block">
          Studio
        </span>
      </div>
    </Link>
  );

  const nav = (
    <>
      <SidebarNavItem to="/studio/overview" icon={<LayoutDashboard />} label="Overview" />
      <SidebarNavItem to="/studio/events" icon={<Calendar />} label="Events" />
      <SidebarNavItem to="/studio/community" icon={<UsersRound />} label="Community" />
      <SidebarNavItem to="/studio/store" icon={<ShoppingBag />} label="Store" />
      <SidebarNavItem to="/studio/analytics" icon={<BarChart3 />} label="Analytics" />
      <SidebarNavItem to="/studio/settings" icon={<Settings />} label="Settings" />
    </>
  );

  const utilities = (
    <SidebarUtilitySection>
      <NavLink
        to="/profile"
        className={({ isActive }) =>
          [
            "flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-body uppercase tracking-wider transition-colors",
            isActive
              ? `${SIDEBAR.activeBg} ${SIDEBAR.activeText} font-semibold shadow-lg shadow-[#E10600]/25`
              : `${SIDEBAR.inactiveText} ${SIDEBAR.hoverBg} hover:text-white`,
          ].join(" ")
        }
      >
        <UserRound className="w-5 h-5 shrink-0 text-[#9CA3AF]" />
        <span>Back to Profile</span>
      </NavLink>

      {entityOptions.length > 1 ? (
        <div className="px-2 py-1">
          <label className="flex items-center gap-1 text-[10px] font-body uppercase tracking-wider text-[#9CA3AF] mb-1 px-2">
            <ChevronDown className="w-3 h-3" />
            Switch entity
          </label>
          <select
            value={currentEntityId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              if (id) void switchToEntity(id);
            }}
            className="w-full rounded-lg border border-gray-800 bg-neutral-950 px-3 py-2 text-xs text-white font-body outline-none focus:border-[#E10600]/60"
          >
            {entityOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        className={`${navButtonClass} disabled:opacity-50 disabled:pointer-events-none`}
      >
        <LogOut className="w-5 h-5 shrink-0 text-[#9CA3AF]" />
        <span>{isLoggingOut ? "Signing out…" : "Log Out"}</span>
      </button>
    </SidebarUtilitySection>
  );

  return (
    <AppSidebar
      brand={brand}
      nav={nav}
      utilities={utilities}
      mobileMenuButtonClassName="top-20 left-4 md:top-24"
      contentTopPadding="pt-24 lg:pt-8"
    />
  );
}
