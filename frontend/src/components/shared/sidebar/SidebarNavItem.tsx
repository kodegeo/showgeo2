import { NavLink, type NavLinkProps } from "react-router-dom";
import { SIDEBAR } from "./sidebar-tokens";

type SidebarNavItemProps = Omit<NavLinkProps, "className"> & {
  icon: React.ReactNode;
  label: string;
  className?: string;
};

export function SidebarNavItem({ icon, label, className, ...navLinkProps }: SidebarNavItemProps) {
  return (
    <NavLink
      {...navLinkProps}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-body uppercase tracking-wider transition-colors duration-200",
          isActive
            ? `${SIDEBAR.activeBg} ${SIDEBAR.activeText} font-semibold shadow-lg shadow-[#E10600]/25`
            : `${SIDEBAR.inactiveText} ${SIDEBAR.hoverBg} hover:text-white`,
          className ?? "",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`shrink-0 [&>svg]:w-5 [&>svg]:h-5 ${isActive ? "text-white" : "text-[#9CA3AF]"}`}
          >
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}
