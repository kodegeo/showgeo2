import { NavLink } from "react-router-dom";
import { 
  User, 
  Settings as SettingsIcon, 
  Sparkles, 
  Lock, 
  Bell, 
  CreditCard 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { EntityStatus } from "../../../../packages/shared/types";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: string;
}

export function SettingsSidebar() {
  const { user } = useAuth();
  const userId = user?.id;
  
  const [creatorStatus, setCreatorStatus] = useState<EntityStatus | "NONE">("NONE");

  // Fetch creator entity status from API
  useEffect(() => {
    if (!userId) {
      setCreatorStatus("NONE");
      return;
    }

    async function fetchEntityStatus() {
      try {
        const res = await api.get(`/users/${userId}/entities`);
        const entity = res.data?.[0] || null;
        setCreatorStatus(entity?.status ?? "NONE");
      } catch (error) {
        console.error("Failed to load creator entity status", error);
        setCreatorStatus("NONE");
      }
    }

    fetchEntityStatus();
  }, [userId]);

  const mainItems: SidebarItem[] = [
    {
      label: "Profile",
      path: "/settings/profile",
      icon: <User className="w-5 h-5" />,
    },
    {
      label: "Account",
      path: "/settings/account",
      icon: <SettingsIcon className="w-5 h-5" />,
    },
    {
      label: "Become a Creator",
      path: "/settings/creator",
      icon: <Sparkles className="w-5 h-5" />,
      badge: creatorStatus === EntityStatus.PENDING ? "Pending Review" : undefined,
    },
  ];

  const comingSoonItems: SidebarItem[] = [
    {
      label: "Security",
      path: "/settings/security",
      icon: <Lock className="w-5 h-5" />,
      disabled: true,
    },
    {
      label: "Notifications",
      path: "/settings/notifications",
      icon: <Bell className="w-5 h-5" />,
      disabled: true,
    },
    {
      label: "Billing",
      path: "/settings/billing",
      icon: <CreditCard className="w-5 h-5" />,
      disabled: true,
    },
  ];

  const renderItem = (item: SidebarItem) => {
    const baseClasses = "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-body";
    const activeClasses = "bg-[#CD000E]/20 text-[#CD000E] border-l-2 border-[#CD000E]";
    const inactiveClasses = "text-[#9A9A9A] hover:text-white hover:bg-gray-800/50";
    const disabledClasses = "text-gray-600 cursor-not-allowed opacity-50";

    if (item.disabled) {
      return (
        <div className={`${baseClasses} ${disabledClasses}`}>
          {item.icon}
          <span className="text-sm font-medium">{item.label}</span>
          <span className="ml-auto text-xs text-gray-500">Coming Soon</span>
        </div>
      );
    }

    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
        }
      >
        {item.icon}
        <span className="text-sm font-medium flex-1">{item.label}</span>
        {item.badge && (
          <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="h-full bg-[#0B0B0B] border-r border-gray-800">
      <div className="p-6">
        <h2 className="text-xl font-heading font-bold text-white mb-6 uppercase tracking-tighter">
          Settings
        </h2>

        <nav className="space-y-2">
          {mainItems.map((item) => (
            <div key={item.path}>{renderItem(item)}</div>
          ))}
        </nav>

        <div className="mt-8 pt-8 border-t border-gray-800">
          <p className="text-xs text-gray-500 font-body uppercase tracking-wider mb-4 px-4">
            Coming Soon
          </p>
          <nav className="space-y-2">
            {comingSoonItems.map((item) => (
              <div key={item.path}>{renderItem(item)}</div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}





