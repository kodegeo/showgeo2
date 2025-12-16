import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, LayoutDashboard, Calendar, ShoppingBag, BarChart3, Settings } from "lucide-react";

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  section?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    path: "/creator/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    section: "main",
  },
  {
    label: "Events",
    path: "/creator/events",
    icon: <Calendar className="w-5 h-5" />,
    section: "main",
  },
  {
    label: "Store",
    path: "/creator/store",
    icon: <ShoppingBag className="w-5 h-5" />,
    section: "main",
  },
  {
    label: "Analytics",
    path: "/creator/analytics",
    icon: <BarChart3 className="w-5 h-5" />,
    section: "main",
  },
  {
    label: "Settings",
    path: "/creator/settings",
    icon: <Settings className="w-5 h-5" />,
    section: "main",
  },
];

export function CreatorSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#0B0B0B] border border-gray-800 rounded-lg text-white hover:bg-gray-800 transition-colors shadow-lg"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-[#0B0B0B] border-r border-gray-800
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full pt-16 lg:pt-8">
          {/* Logo/Brand */}
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-xl font-heading font-bold text-white uppercase tracking-tighter">
              Creator Dashboard
            </h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {sidebarItems.map((item) => {
              const isActive =
                location.pathname === item.path || location.pathname.startsWith(item.path + "/");
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${
                      isActive
                        ? "bg-[#CD000E] text-white font-semibold shadow-lg shadow-[#CD000E]/20"
                        : "text-[#9A9A9A] hover:text-white hover:bg-gray-800/50"
                    }
                  `}
                >
                  <span className={isActive ? "text-white" : "text-[#CD000E]"}>{item.icon}</span>
                  <span className="font-body text-sm uppercase tracking-wider">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-800">
            <p className="text-xs text-[#9A9A9A] font-body">
              Showgeo 2.0 Creator
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
