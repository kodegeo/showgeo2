/**
 * Highlight moments – GET /events/:eventId/highlights.
 * Realtime service writes highlight_moments; this lists clip-worthy moments.
 */
import { useEventHighlights } from "../hooks";

type HighlightMomentsListProps = {
  eventId: string;
  className?: string;
  maxItems?: number;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function HighlightMomentsList({
  eventId,
  className = "",
  maxItems = 20,
}: HighlightMomentsListProps) {
  const { data, isLoading, error } = useEventHighlights(eventId);

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-white/80 mb-3">Highlight moments</h3>
        <ul className="space-y-2">
          {[1, 2, 3].map(i => (
            <li key={i} className="h-12 bg-white/5 rounded animate-pulse" />
          ))}
        </ul>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-white/80 mb-2">Highlight moments</h3>
        <p className="text-red-400/80 text-sm">Unable to load highlights.</p>
      </div>
    );
  }

  const highlights = (data?.highlights ?? []).slice(0, maxItems);

  return (
    <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white/80 mb-3">Highlight moments</h3>
      {highlights.length === 0 ? (
        <p className="text-white/50 text-sm">
          No highlights yet. Moments are detected during the stream.
        </p>
      ) : (
        <ul className="space-y-2">
          {highlights.map((h, i) => (
            <li
              key={h.id ?? i}
              className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0"
            >
              <span className="text-white/70">
                {h.startTime != null ? formatTime(h.startTime) : "—"} –{" "}
                {h.duration != null ? `${h.duration}s` : "—"}
              </span>
              {h.energyScore != null && (
                <span className="text-white/50 text-xs">
                  Energy {Number(h.energyScore).toFixed(1)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
