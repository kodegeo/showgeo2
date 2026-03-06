import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, LogOut } from "lucide-react";
import { ToastProvider } from "@/hooks/creator/useToast";
import { ToastContainer } from "@/components/creator/ToastContainer";
import { DialogProvider } from "@/contexts/DialogContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

/**
 * AdminLayout - Layout for SHOWGEO ADMIN area
 * 
 * This is a platform-level admin area, not entity-scoped.
 * No entity context required.
 * 
 * Providers mounted here:
 * - ToastProvider: Enables useToast() in all admin pages
 * - DialogProvider: Enables useDialog() in all admin pages
 * - ErrorBoundary: Catches and displays errors gracefully
 */
export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect even if logout fails
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <DialogProvider>
          <div className="min-h-screen bg-[#0B0B0B] text-white flex">
            {/* Persistent Left Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-[#0F0F0F] flex-shrink-0">
              {/* Section Header */}
              <div className="h-14 border-b border-white/10 flex items-center px-6">
                <h1 className="text-lg font-semibold text-white">ADMIN</h1>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-1">
                <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/admin/users"
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <Users className="w-5 h-5" />
                  <span>User Management</span>
                </NavLink>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top Header */}
              <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0B0B0B]">
                <h2 className="text-sm font-medium text-white/60">
                  {location.pathname === "/admin/dashboard" && "Dashboard"}
                  {location.pathname === "/admin/users" && "User Management"}
                </h2>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                </button>
              </header>

              {/* Page Content */}
              <main className="flex-1 overflow-auto">
                <div className="p-6">
                  <ErrorBoundary>
                    <Outlet />
                  </ErrorBoundary>
                </div>
              </main>
            </div>

            {/* Global toast container for admin routes */}
            <ToastContainer />
          </div>
        </DialogProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

