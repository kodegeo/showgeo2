import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserEntities } from "@/hooks/useUsers";
import { isCreator } from "@/utils/creator";

interface NavLinksProps {
  isAuthenticated: boolean;
  onNavigate?: () => void; // optional callback for closing mobile menu
}

const links = [
  { name: "Events", path: "/events" },
  { name: "Creators", path: "/creators" },
  { name: "About", path: "/about" },
];

const authLinks = [
  { name: "Profile", path: "/profile" },
  { name: "My Tickets", path: "/tickets" },
];

const NavLinks: React.FC<NavLinksProps> = ({ isAuthenticated, onNavigate }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { data: entitiesData } = useUserEntities(user?.id || "");
  
  const hasEntities = entitiesData && (entitiesData.owned?.length > 0 || entitiesData.managed?.length > 0);
  const userIsCreator = isCreator(user, hasEntities);

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-[#F49600]" // gold accent for active route
      : "text-white hover:text-[#CD000E]";

  return (
    <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0 font-medium text-sm">
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          onClick={onNavigate}
          className={`${isActive(link.path)} transition-colors`}
        >
          {link.name}
        </Link>
      ))}

      {isAuthenticated &&
        !userIsCreator &&
        authLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            onClick={onNavigate}
            className={`${isActive(link.path)} transition-colors`}
          >
            {link.name}
          </Link>
        ))}
      {isAuthenticated && userIsCreator && (
        <>
          <Link
            to="/studio/profile"
            onClick={onNavigate}
            className={`${isActive("/studio/profile")} transition-colors`}
          >
            Profile
          </Link>
          <Link
            to="/studio/overview"
            onClick={onNavigate}
            className={`${isActive("/studio/overview")} transition-colors`}
          >
            Overview
          </Link>
          <Link
            to="/tickets"
            onClick={onNavigate}
            className={`${isActive("/tickets")} transition-colors`}
          >
            My Tickets
          </Link>
        </>
      )}
    </div>
  );
};

export default NavLinks;
