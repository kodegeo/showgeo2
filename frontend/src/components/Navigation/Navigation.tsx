import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserEntities } from "@/hooks/useUsers";
import { EntityContextSwitch } from "../EntityContextSwitch";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { isCreator } from "@/utils/creator";
import { supabase } from "@/lib/supabase";

console.log("⚡ Navigation component mounted");
console.log("ENV:", import.meta.env);



export default function Navigation() {
  const { isAuthenticated, logout, user, isLoading: authLoading } = useAuth();
  // Only fetch entities if user is authenticated and has an ID
  const { data: entitiesData } = useUserEntities(user?.id || "");
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  // Don't block navigation render while auth is loading
  const hasEntities = entitiesData && (entitiesData.owned?.length > 0 || entitiesData.managed?.length > 0);
  const userIsCreator = !authLoading && isCreator(user, hasEntities);
  const showAuthenticated = !authLoading && isAuthenticated;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // ⬇️ PUT THE HOOK INSIDE THE COMPONENT
  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("type=recovery")) {
      window.location.href = `/reset-password${hash}`;
    }

  }, []);
  
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#0B0B0B]/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex justify-between items-center h-24 md:h-28 lg:h-32">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/assets/branding/logo-red.svg"
              alt="Showgeo"
              className="h-24 md:h-32 lg:h-40 w-auto"
              style={{ minWidth: "300px" }}
            />
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link to="/events" className="text-white hover:text-[#CD000E] transition-colors">Events</Link>
            <Link to="/entities" className="text-white hover:text-[#CD000E] transition-colors">Creators</Link>
            {showAuthenticated && (
              <Link to="/dashboard" className="text-white hover:text-[#CD000E] transition-colors">Dashboard</Link>
            )}
            {showAuthenticated && userIsCreator && (
              <Link to="/creator/dashboard" className="text-white hover:text-[#CD000E] transition-colors">Creator Dashboard</Link>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <Link to="/cart" className="text-white hover:text-[#CD000E] transition">
              <ShoppingCart size={22} />
            </Link>

            {showAuthenticated ? (
              <>
                <EntityContextSwitch />
                <button
                  onClick={handleLogout}
                  className="hidden md:inline px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white rounded-md font-medium transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden md:inline text-white hover:text-[#CD000E] transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden md:inline bg-[#CD000E] hover:bg-[#860005] text-white px-4 py-2 rounded-md font-semibold shadow-lg hover:shadow-[#CD000E]/50 hover:scale-105 transition-all uppercase tracking-wider"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-white hover:text-[#CD000E]"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[#0B0B0B] border-t border-gray-800">
          <div className="flex flex-col space-y-3 px-6 py-4 text-white">
            <Link to="/events" onClick={() => setIsOpen(false)}>Events</Link>
            <Link to="/entities" onClick={() => setIsOpen(false)}>Creators</Link>
            {showAuthenticated && <Link to="/dashboard" onClick={() => setIsOpen(false)}>Dashboard</Link>}
            {showAuthenticated && userIsCreator && (
              <Link to="/creator/dashboard" onClick={() => setIsOpen(false)}>Creator Dashboard</Link>
            )}
            <hr className="border-gray-700" />
            {showAuthenticated ? (
              <button onClick={handleLogout} className="text-left text-[#F49600] font-medium">Logout</button>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)}>Sign In</Link>
                <Link to="/register" onClick={() => setIsOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
