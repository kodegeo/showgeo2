import { EventPhase } from "@/types/eventPhase";
import { PreEventPanel } from "./panels/PreEventPanel";
import { LiveEventPanel } from "./panels/LiveEventPanel";
import { PostEventPanel } from "./panels/PostEventPanel";
import { ModerationPanel } from "./panels/ModerationPanel";

/**
 * Phase Workspace Component
 * 
 * Container that renders the appropriate phase panel based on active tab
 * 
 * TODO Phase 5C:
 * - Add loading states
 * - Add error handling
 * - Pass real event data and activities
 */

interface PhaseWorkspaceProps {
  eventId: string;
  activePhase: EventPhase | "MODERATION";
  eventPhase: EventPhase;
  userRole: string;
}

export function PhaseWorkspace({
  eventId,
  activePhase,
  eventPhase,
  userRole,
}: PhaseWorkspaceProps) {
  return (
    <div className="mt-6">
      {activePhase === EventPhase.PRE_LIVE && (
        <PreEventPanel
          eventId={eventId}
          eventPhase={eventPhase}
          userRole={userRole}
        />
      )}
      {activePhase === EventPhase.LIVE && (
        <LiveEventPanel
          eventId={eventId}
          eventPhase={eventPhase}
          userRole={userRole}
        />
      )}
      {activePhase === EventPhase.POST_LIVE && (
        <PostEventPanel
          eventId={eventId}
          eventPhase={eventPhase}
          userRole={userRole}
        />
      )}
      {activePhase === "MODERATION" && (
        <ModerationPanel
          eventId={eventId}
          eventPhase={eventPhase}
          userRole={userRole}
        />
      )}
    </div>
  );
}

