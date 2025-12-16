import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { EntityContextSwitch } from "@/components/EntityContextSwitch";

const NavActions: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Cart Icon */}
      <Link to="/cart" className="text-white hover:text-[#CD000E] transition">
        <ShoppingCart size={22} />
      </Link>

      {isAuthenticated ? (
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
            className="hidden md:inline bg-gradient-to-r from-[#CD000E] to-[#F49600] text-white px-4 py-2 rounded-md font-semibold shadow hover:scale-105 transition-transform"
          >
            Sign Up
          </Link>
        </>
      )}
    </div>
  );
};

export default NavActions;
