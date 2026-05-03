/**
 * Creator feedback signals – placeholder for aggregated creator-facing metrics.
 * Backend: creator_feedback_signals (energy_score, reaction_rate, chat_rate, viewer_count).
 * Realtime/event-engine writes; this can show a summary when the API is exposed.
 */
type CreatorFeedbackSignalsUIProps = {
  eventId: string;
  className?: string;
};

export function CreatorFeedbackSignalsUI({
  eventId,
  className = "",
}: CreatorFeedbackSignalsUIProps) {
  return (
    <div className={`rounded-lg border border-white/10 bg-black/40 p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white/80 mb-2">Creator feedback</h3>
      <p className="text-white/50 text-sm">
        Aggregated signals (energy, reaction rate, chat rate) for this event are written by the
        engagement engine. Connect a dedicated endpoint to display here.
      </p>
    </div>
  );
}
