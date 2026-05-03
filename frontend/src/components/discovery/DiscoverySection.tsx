import { type ReactNode } from "react";

const SCROLL_CONTAINER_CLASS =
  "flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-600 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent min-h-[200px] touch-pan-x [scrollbar-width:thin]";

export interface DiscoverySectionProps {
  title: string;
  /** Optional icon (React node) shown before title */
  icon?: ReactNode;
  children: ReactNode;
  /** Optional placeholder when empty (e.g. "Upcoming events coming soon") */
  emptyMessage?: ReactNode;
  /** If true, render emptyMessage and optional skeleton instead of children */
  isEmpty?: boolean;
  /** When isEmpty, optional skeleton row to show */
  emptySkeleton?: ReactNode;
  /** Section wrapper class (e.g. for bg) */
  className?: string;
  /** Use dark theme (dark bg text) */
  dark?: boolean;
}

export function DiscoverySection({
  title,
  icon,
  children,
  emptyMessage,
  isEmpty,
  emptySkeleton,
  className = "",
  dark = false,
}: DiscoverySectionProps) {
  const headingClass = dark
    ? "text-lg font-heading font-semibold text-white/90 uppercase tracking-tight mb-4 flex items-center gap-2"
    : "text-xl md:text-2xl font-heading font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-tight flex items-center gap-2";

  return (
    <section className={className}>
      <h2 className={headingClass}>
        {icon}
        {title}
      </h2>
      {isEmpty ? (
        <div className="space-y-2">
          {emptyMessage && (
            <p
              className={
                dark
                  ? "text-white/60 text-sm mb-3"
                  : "text-gray-600 dark:text-gray-400 font-body text-sm mb-3"
              }
            >
              {emptyMessage}
            </p>
          )}
          {emptySkeleton}
        </div>
      ) : (
        <div className={SCROLL_CONTAINER_CLASS}>{children}</div>
      )}
    </section>
  );
}
