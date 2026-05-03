/**
 * Fan leaderboard – rankings by engagement for an event.
 * Uses GET /events/:eventId/rankings (realtime service writes fan_rankings).
 */
import { useEventRankings } from "../hooks";

type FanLeaderboardProps = {
  eventId: string;
  className?: string;
  maxItems?: number;
};

export function FanLeaderboard({ eventId, className = "", maxItems = 20 }: FanLeaderboardProps) {
  const { data, isLoading, error } = useEventRankings(eventId);

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-white/80 mb-3">Leaderboard</h3>
        <ul className="space-y-2">
          {[1, 2, 3].map(i => (
            <li key={i} className="h-8 bg-white/5 rounded animate-pulse" />
          ))}
        </ul>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-white/80 mb-2">Leaderboard</h3>
        <p className="text-red-400/80 text-sm">Unable to load rankings.</p>
      </div>
    );
  }

  const rankings = (data?.rankings ?? []).slice(0, maxItems);

  return (
    <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white/80 mb-3">Leaderboard</h3>
      {rankings.length === 0 ? (
        <p className="text-white/50 text-sm">
          No rankings yet. Engagement is recorded during the event.
        </p>
      ) : (
        <ul className="space-y-2">
          {rankings.map((r, i) => (
            <li key={r.userId} className="flex items-center justify-between text-sm">
              <span className="text-white/70">
                #{r.rank}{" "}
                <span className="text-white/50 font-mono text-xs">{r.userId.slice(0, 8)}…</span>
              </span>
              {r.engagementScore != null && (
                <span className="text-white/60">{Number(r.engagementScore).toFixed(0)} pts</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
