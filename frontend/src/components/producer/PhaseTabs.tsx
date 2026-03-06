import { EventPhase } from "@/types/eventPhase";

/**
 * Phase Tabs Component
 * 
 * Navigation tabs for switching between event phases
 * - Pre-Event
 * - Live Event
 * - Post-Event
 * 
 * TODO Phase 5C:
 * - Disable tabs for phases that don't match current event phase
 * - Add visual indicators for active/inactive phases
 */

interface PhaseTabsProps {
  activePhase: EventPhase | "MODERATION";
  onPhaseChange: (phase: EventPhase | "MODERATION") => void;
  currentEventPhase: EventPhase;
}

export function PhaseTabs({
  activePhase,
  onPhaseChange,
  currentEventPhase,
}: PhaseTabsProps) {
  const phases: { value: EventPhase | "MODERATION"; label: string }[] = [
    { value: EventPhase.PRE_LIVE, label: "Pre-Event" },
    { value: EventPhase.LIVE, label: "Live Event" },
    { value: EventPhase.POST_LIVE, label: "Post-Event" },
    { value: "MODERATION", label: "Moderation" },
  ];

  const isPhaseAvailable = (phase: EventPhase) => {
    // In Phase 5B, allow all phases for UI testing
    // TODO Phase 5C: Restrict to phases that match event lifecycle
    return true;
  };

  return (
    <div className="border-b border-white/10 mb-6">
      <nav className="flex gap-1">
        {phases.map((phase) => {
          const isActive = activePhase === phase.value;
          const isAvailable = isPhaseAvailable(phase.value);
          const isCurrentPhase = currentEventPhase === phase.value;

          return (
            <button
              key={phase.value}
              onClick={() => isAvailable && onPhaseChange(phase.value)}
              disabled={!isAvailable}
              className={`
                px-6 py-3 text-sm font-medium transition-colors
                ${
                  isActive
                    ? "border-b-2 border-blue-500 text-white"
                    : "text-white/60 hover:text-white/80"
                }
                ${!isAvailable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${isCurrentPhase ? "bg-white/5" : ""}
              `}
              title={
                !isAvailable
                  ? "This phase is not available yet"
                  : isCurrentPhase
                  ? "Current event phase"
                  : undefined
              }
            >
              {phase.label}
              {isCurrentPhase && (
                <span className="ml-2 text-xs text-blue-400">(Current)</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

