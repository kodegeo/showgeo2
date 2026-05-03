import { Link } from "react-router-dom";
import type { ManageTab } from "./types";
import { MANAGE_TABS } from "./types";

const LABELS: Record<ManageTab, string> = {
  overview: "Overview",
  audience: "Audience",
  tickets: "Tickets",
  messaging: "Messaging",
  settings: "Settings",
};

export interface EventManageTabsProps {
  eventId: string;
  activeTab: ManageTab;
}

export function EventManageTabs({ eventId, activeTab }: EventManageTabsProps) {
  const base = `/studio/events/${eventId}/manage`;

  return (
    <nav className="flex gap-1 border-b border-white/10 -mx-1 px-1 overflow-x-auto scrollbar-thin">
      {MANAGE_TABS.map(tab => {
        const isActive = activeTab === tab;
        const to = tab === "overview" ? base : `${base}?tab=${tab}`;
        return (
          <Link
            key={tab}
            to={to}
            replace
            className={`shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? "border-[#CD000E] text-white"
                : "border-transparent text-white/55 hover:text-white"
            }`}
          >
            {LABELS[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
