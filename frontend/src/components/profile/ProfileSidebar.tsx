import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Mail,
  Search,
  Calendar,
  Compass,
  Radio,
  Ticket,
  Bookmark,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserEntities } from "@/hooks/useUsers";
import { isCreator } from "@/utils/creator";
import {
  AppSidebar,
  SidebarHashLink,
  SidebarNavItem,
  SidebarUtilitySection,
  SIDEBAR,
} from "@/components/shared/sidebar";

export function ProfileSidebar() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: entitiesData } = useUserEntities(user?.id ?? null);

  const hasEntities =
    !!entitiesData &&
    ((entitiesData.owned?.length ?? 0) > 0 || (entitiesData.managed?.length ?? 0) > 0);
  const userIsCreator = isCreator(user, hasEntities);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("[ProfileSidebar] Log out failed:", error);
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const brand = (
    <NavLink to="/" className="block w-full py-0.5 hover:opacity-90 transition-opacity">
      <div className="flex flex-col justify-center gap-0.5 leading-none py-0.5">
        <span className="font-heading text-[0.65rem] md:text-xs font-semibold uppercase tracking-[0.22em] text-[#CD000E]">
          Showgeo
        </span>
        <h2 className="font-heading text-2xl md:text-3xl lg:text-[2rem] font-bold text-white uppercase tracking-tighter">
          Profile
        </h2>
      </div>
    </NavLink>
  );

  const nav = (
    <>
      <SidebarNavItem to="/profile/mailbox" icon={<Mail />} label="Mailbox" />
      <SidebarNavItem to="/creators" icon={<Search />} label="Find Creators" />
      <SidebarNavItem to="/events" icon={<Calendar />} label="Find Events" />
      <SidebarNavItem to="/discover" icon={<Compass />} label="Find Rooms" />
      <SidebarNavItem to="/live" icon={<Radio />} label="Live Now" />
      <SidebarNavItem to="/tickets" icon={<Ticket />} label="My Tickets" />
      <SidebarHashLink to="/profile" hash="saved-events" icon={<Bookmark />} label="Saved Events" />
      <SidebarNavItem to="/settings" icon={<Settings />} label="Settings" />
    </>
  );

  const utilityButtonClass = [
    "flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-body uppercase tracking-wider transition-colors",
    SIDEBAR.inactiveText,
    SIDEBAR.hoverBg,
    "hover:text-white text-left",
  ].join(" ");

  const utilities = (
    <SidebarUtilitySection>
      {userIsCreator ? (
        <NavLink
          to="/studio/overview"
          className={({ isActive }) =>
            [
              utilityButtonClass,
              isActive ? "text-white bg-neutral-900 border border-gray-800" : "",
            ].join(" ")
          }
        >
          <Sparkles className="w-5 h-5 shrink-0 text-[#9CA3AF]" />
          <span>Open Studio</span>
        </NavLink>
      ) : null}
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        className={`${utilityButtonClass} disabled:opacity-50 disabled:pointer-events-none`}
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
