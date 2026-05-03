/**
 * Crowd energy visualizations – snapshots from GET /events/:eventId/energy.
 * Realtime service writes crowd_energy_snapshots; this displays aggregated energy.
 */
import { useEventEnergy } from "../hooks";

type CrowdEnergyVizProps = {
  eventId: string;
  className?: string;
  maxBars?: number;
};

export function CrowdEnergyViz({ eventId, className = "", maxBars = 10 }: CrowdEnergyVizProps) {
  const { data, isLoading, error } = useEventEnergy(eventId);

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-white/80 mb-3">Crowd energy</h3>
        <div className="flex items-end gap-1 h-24">
          {[40, 65, 50, 80, 60].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-white/20 rounded-t animate-pulse"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-white/80 mb-2">Crowd energy</h3>
        <p className="text-red-400/80 text-sm">Unable to load energy data.</p>
      </div>
    );
  }

  const snapshots = (data?.snapshots ?? []).slice(0, maxBars).reverse();
  const latest = data?.latestEnergyScore;

  return (
    <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white/80 mb-2">Crowd energy</h3>
      {latest != null && (
        <p className="text-white/70 text-sm mb-3">
          Current: <span className="font-medium text-white">{Number(latest).toFixed(1)}</span>
        </p>
      )}
      {snapshots.length === 0 ? (
        <p className="text-white/50 text-sm">
          No snapshots yet. Energy is recorded during the stream.
        </p>
      ) : (
        <div className="flex items-end gap-1 h-20">
          {snapshots.map((s, i) => {
            const score = s.energyScore != null ? Math.min(100, Number(s.energyScore) * 10) : 20;
            return (
              <div
                key={s.id ?? i}
                className="flex-1 bg-white/30 rounded-t min-w-[4px] transition-all"
                style={{ height: `${score}%` }}
                title={s.createdAt ? `Score: ${s.energyScore} at ${s.createdAt}` : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
