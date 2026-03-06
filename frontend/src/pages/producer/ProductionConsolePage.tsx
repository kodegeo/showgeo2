import React from "react";
import { useParams } from "react-router-dom";
import { ProductionConsoleLayout } from "@/components/producer/ProductionConsoleLayout";
import { EventHeader } from "@/components/producer/EventHeader";
import { PhaseTabs } from "@/components/producer/PhaseTabs";
import { PhaseWorkspace } from "@/components/producer/PhaseWorkspace";
import { EventPhase } from "@/types/eventPhase";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Production Console Page
 * 
 * Route: /production/events/:eventId/console
 * 
 * Phase 5C.1: READ-ONLY API wiring
 * - Fetches real event data
 * - Fetches real activities data
 * - No mutations or side effects
 * 
 * TODO Phase 5C.2:
 * - Implement activity launch/complete mutations
 * - Add real-time phase updates
 * - Integrate with LiveKit for Live Event panel
 */

export function ProductionConsolePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();

  // Fetch real event data
  const {
    data: event,
    isLoading: eventLoading,
    error: eventError,
  } = useEvent(eventId!);

  // Determine user role (Phase 5C.1 - simplified, will be enhanced in Phase 5C.2)
  const userRole = user?.role || "USER";

  // Track active phase tab (starts with event's current phase)
  const [activePhase, setActivePhase] = React.useState<
    EventPhase | "MODERATION" | null
  >(null);

  // Set initial phase when event loads and sync when event phase changes (Phase 5C.3)
  React.useEffect(() => {
    if (event?.phase) {
      setActivePhase(event.phase);
    }
  }, [event?.phase]);

  // Loading state
  if (eventLoading) {
    return (
      <ProductionConsoleLayout>
        <LoadingScreen message="Loading event..." />
      </ProductionConsoleLayout>
    );
  }

  // Error state
  if (eventError || !event) {
    return (
      <ProductionConsoleLayout>
        <div className="p-6 text-red-400">
          {eventError
            ? "Failed to load event. Please try again."
            : "Event not found."}
        </div>
      </ProductionConsoleLayout>
    );
  }

  // Ensure activePhase is set
  if (!activePhase) {
    return (
      <ProductionConsoleLayout>
        <LoadingScreen message="Initializing..." />
      </ProductionConsoleLayout>
    );
  }

  const handlePhaseChange = (newPhase: EventPhase) => {
    setActivePhase(newPhase);
  };

  return (
    <ProductionConsoleLayout>
      <EventHeader event={event} onPhaseChange={handlePhaseChange} />
      <PhaseTabs
        activePhase={activePhase}
        onPhaseChange={setActivePhase}
        currentEventPhase={event.phase}
      />
      <PhaseWorkspace
        eventId={eventId!}
        activePhase={activePhase}
        eventPhase={event.phase}
        userRole={userRole}
      />
    </ProductionConsoleLayout>
  );
}

