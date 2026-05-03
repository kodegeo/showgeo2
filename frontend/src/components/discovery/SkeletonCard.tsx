import { useId } from "react";

export type SkeletonCardVariant = "event" | "clip" | "creator";

export interface SkeletonCardProps {
  variant: SkeletonCardVariant;
  /** Number of skeleton cards to show (default 4) */
  count?: number;
}

function SkeletonEvent() {
  return (
    <div
      className="shrink-0 w-72 min-h-[200px] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700/60 animate-pulse snap-start"
      aria-hidden
    >
      <div className="aspect-video bg-gray-300 dark:bg-gray-600" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
      </div>
    </div>
  );
}

function SkeletonClip() {
  return (
    <div
      className="shrink-0 w-56 min-h-[200px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700/60 animate-pulse snap-start"
      aria-hidden
    >
      <div className="aspect-video bg-gray-300 dark:bg-gray-600 min-h-[140px]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
      </div>
    </div>
  );
}

function SkeletonCreator() {
  return (
    <div
      className="shrink-0 w-32 min-h-[200px] flex flex-col items-center p-4 rounded-lg bg-gray-200 dark:bg-gray-700/60 animate-pulse snap-start"
      aria-hidden
    >
      <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-600" />
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16 mt-3" />
    </div>
  );
}

export function SkeletonCard({ variant, count = 4 }: SkeletonCardProps) {
  const id = useId();
  const C =
    variant === "event" ? SkeletonEvent : variant === "clip" ? SkeletonClip : SkeletonCreator;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <C key={`${id}-${i}`} />
      ))}
    </>
  );
}

export interface SkeletonRowProps {
  variant: SkeletonCardVariant;
  count?: number;
}

const SCROLL_ROW_CLASS =
  "flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent min-h-[200px] touch-pan-x";

/** Horizontal scroll row of skeleton cards for loading/placeholder state */
export function SkeletonRow({ variant, count = 4 }: SkeletonRowProps) {
  return (
    <div className={SCROLL_ROW_CLASS}>
      <SkeletonCard variant={variant} count={count} />
    </div>
  );
}
