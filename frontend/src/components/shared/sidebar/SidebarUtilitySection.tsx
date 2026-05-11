import type { ReactNode } from "react";

export function SidebarUtilitySection({ children }: { children: ReactNode }) {
  return (
    <div className="flex-shrink-0 border-t border-gray-800/90 px-3 py-3 space-y-1 bg-black">
      {children}
    </div>
  );
}
