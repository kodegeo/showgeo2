import { useState, type MouseEvent, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { SIDEBAR } from "./sidebar-tokens";

export type AppSidebarProps = {
  brand: ReactNode;
  compactAccount?: ReactNode;
  /** Primary + optional secondary navigation */
  nav: ReactNode;
  /** Bottom-pinned utilities (log out, studio, etc.) */
  utilities: ReactNode;
  /** Fixed mobile menu button position (Tailwind classes) */
  mobileMenuButtonClassName?: string;
  /** Top padding inside scroll column (clear global header / safe area) */
  contentTopPadding?: string;
};

export function AppSidebar({
  brand,
  compactAccount,
  nav,
  utilities,
  mobileMenuButtonClassName = "top-4 left-4",
  contentTopPadding = "pt-16 lg:pt-8",
}: AppSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeOnInteractive = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest("a,button");
    if (el) setIsOpen(false);
  };

  const shell = (
    <div className={`flex flex-col h-full min-h-0 ${contentTopPadding} ${SIDEBAR.bg} ${SIDEBAR.border}`}>
      <div className="flex-shrink-0 border-b border-gray-800/90 px-4 py-5 md:px-5 md:py-6 min-h-[4.5rem] md:min-h-[5.5rem] flex items-center">
        {brand}
      </div>
      {compactAccount ? (
        <div className="flex-shrink-0 border-b border-gray-800/90 py-1" onClick={closeOnInteractive}>
          {compactAccount}
        </div>
      ) : null}
      <nav
        className="flex-1 min-h-0 flex flex-col overflow-y-auto px-2 pt-4 pb-2 space-y-1"
        onClick={closeOnInteractive}
      >
        {nav}
      </nav>
      <div className="flex-shrink-0" onClick={closeOnInteractive}>
        {utilities}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`lg:hidden fixed ${mobileMenuButtonClassName} z-50 p-2 bg-black border border-gray-800 rounded-lg text-white hover:bg-neutral-900 transition-colors shadow-lg`}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside
        className={[
          SIDEBAR.width,
          "fixed lg:static inset-y-0 left-0 z-40 flex flex-col min-h-screen lg:min-h-0",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex flex-col h-full min-h-0 bg-black">{shell}</div>
      </aside>

      {isOpen ? (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          aria-hidden
          onClick={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
