/**
 * Fan signals UI – placeholder for realtime fan signals (e.g. intensity, session time).
 * Backend: fan_signals; realtime service writes, this can show aggregated or live signals.
 */
import { useEventFans } from "../hooks";

type FanSignalsUIProps = {
  eventId: string;
  className?: string;
};

export function FanSignalsUI({ eventId, className = "" }: FanSignalsUIProps) {
  const { data, isLoading, error } = useEventFans(eventId);

  if (isLoading) {
    return (
      <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-white/80 mb-2">Fan signals</h3>
        <p className="text-white/50 text-sm">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
        <h3 className="text-sm font-medium text-white/80 mb-2">Fan signals</h3>
        <p className="text-red-400/80 text-sm">Unable to load signals.</p>
      </div>
    );
  }

  const total = data?.total ?? 0;
  return (
    <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white/80 mb-2">Fan signals</h3>
      <p className="text-white/70 text-sm">
        {total} fan{total !== 1 ? "s" : ""} present. Realtime signals are written by the event
        engine.
      </p>
    </div>
  );
}
