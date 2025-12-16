import React from "react";
import { Link } from "react-router-dom";
import NavLinks from "@/components/Navigation/NavLinks";
import { useAuth } from "@/hooks/useAuth";

interface NavMobileMenuProps {
  isOpen: boolean;
  closeMenu: () => void;
}

const NavMobileMenu: React.FC<NavMobileMenuProps> = ({ isOpen, closeMenu }) => {
  const { isAuthenticated, logout } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-[#0B0B0B] border-t border-gray-800">
      <div className="flex flex-col space-y-3 px-6 py-4 text-white">
        {/* Navigation links */}
        <NavLinks isAuthenticated={isAuthenticated} onNavigate={closeMenu} />

        <hr className="border-gray-700" />

        {/* Auth Actions */}
        {isAuthenticated ? (
          <button
            onClick={() => {
              logout();
              closeMenu();
            }}
            className="text-left text-[#F49600] font-medium hover:text-[#CD000E] transition"
          >
            Logout
          </button>
        ) : (
          <>
            <Link
              to="/login"
              onClick={closeMenu}
              className="hover:text-[#CD000E] transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={closeMenu}
              className="hover:text-[#CD000E] transition"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default NavMobileMenu;
