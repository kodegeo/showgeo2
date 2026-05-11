import { Link, useLocation } from "react-router-dom";
import { SIDEBAR } from "./sidebar-tokens";

type SidebarHashLinkProps = {
  to: string;
  hash: string;
  icon: React.ReactNode;
  label: string;
  onNavigate?: () => void;
};

export function SidebarHashLink({ to, hash, icon, label, onNavigate }: SidebarHashLinkProps) {
  const location = useLocation();
  const href = `${to}${hash.startsWith("#") ? hash : `#${hash}`}`;
  const isActive = location.pathname === to && location.hash === (hash.startsWith("#") ? hash : `#${hash}`);

  return (
    <Link
      to={href}
      onClick={onNavigate}
      className={[
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-body uppercase tracking-wider transition-colors duration-200",
        isActive
          ? `${SIDEBAR.activeBg} ${SIDEBAR.activeText} font-semibold shadow-lg shadow-[#E10600]/25`
          : `${SIDEBAR.inactiveText} ${SIDEBAR.hoverBg} hover:text-white`,
      ].join(" ")}
    >
      <span className={`shrink-0 [&>svg]:w-5 [&>svg]:h-5 ${isActive ? "text-white" : "text-[#9CA3AF]"}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
