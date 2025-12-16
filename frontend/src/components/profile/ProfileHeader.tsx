import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bell, ShoppingCart, ChevronDown, User, Settings, LogOut } from "lucide-react";

export function ProfileHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 md:h-20 bg-[#0B0B0B]/95 backdrop-blur border-b border-gray-800 z-50">
      <div className="h-full flex items-center">
        {/* Logo - Aligned with profile sidebar (left-0, w-64 sidebar) */}
        <div className="hidden lg:block w-64 flex-shrink-0 px-4">
          <Link to="/" className="flex items-center h-full">
            <img
              src="/assets/branding/logo-red.svg"
              alt="Showgeo"
              className="h-14 md:h-20 w-auto"
              style={{ minWidth: "220px" }}
            />
          </Link>
        </div>
        
        {/* Mobile/Tablet Logo - Left aligned */}
        <div className="lg:hidden flex-shrink-0 px-4">
          <Link to="/" className="flex items-center h-full">
            <img
              src="/assets/branding/logo-red.svg"
              alt="Showgeo"
              className="h-14 md:h-20 w-auto"
              style={{ minWidth: "180px" }}
            />
          </Link>
        </div>

        {/* Center Actions - Notifications and Shopping Cart */}
        <div className="flex-1 flex items-center justify-center gap-4">
          {/* Notifications */}
          <button
            className="relative p-2 text-[#9A9A9A] hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-300"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#CD000E] rounded-full" />
          </button>

          {/* Shopping Cart */}
          <Link
            to="/cart"
            className="relative p-2 text-[#9A9A9A] hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-300"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#F49600] rounded-full" />
          </Link>
        </div>

        {/* Right Side - User Dropdown */}
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 text-[#9A9A9A] hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-300"
              aria-label="User menu"
            >
            {user?.profile?.avatarUrl ? (
              <img
                src={user.profile.avatarUrl}
                className="w-8 h-8 rounded-full object-cover"
                alt="avatar"
              />
            ) : (
              <User className="w-5 h-5" />
            )}

              <span className="hidden sm:block font-body text-sm">
                {user?.profile?.firstName || user?.email?.split("@")[0] || "User"}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0B0B0B] border border-gray-800 rounded-lg shadow-xl py-2 z-50">
                <Link
                  to="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-white hover:bg-gray-800/50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="font-body text-sm">Profile</span>
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-white hover:bg-gray-800/50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-body text-sm">Settings</span>
                </Link>
                <div className="my-2 border-t border-gray-800" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-gray-800/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-body text-sm">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

