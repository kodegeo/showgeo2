import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CodeOfConductModal } from "@/components/streaming/CodeOfConductModal";
import { EventPhase } from "@/types/eventPhase";
import { useTransitionEventPhase } from "@/hooks/useEvents";
import type { ExperienceData, UseEventExperienceJoinResult } from "@/hooks/useEventExperienceJoin";
import { toast } from "sonner";

export interface EventExperienceShellProps {
  /** Result of useEventExperienceJoin. */
  experience: UseEventExperienceJoinResult;
  /** Render the role-specific READY view. */
  renderReady: (data: ExperienceData) => ReactNode;
  /** When true, NOT_LIVE shows a "Set phase to LIVE" button (creator/coordinator only). */
  canControlPhase?: boolean;
  /** ID of the event — needed for phase transitions. */
  eventId: string | undefined;
  /** Where the back button should navigate (defaults to /events). */
  backHref?: string;
}

/**
 * Renders the orchestrator's status branches uniformly across all three viewer roles.
 * Only the READY branch is delegated to the role-specific renderReady prop.
 */
export function EventExperienceShell({
  experience,
  renderReady,
  canControlPhase = false,
  eventId,
  backHref = "/events",
}: EventExperienceShellProps) {
  const { status, data, retry, acceptCodeOfConduct } = experience;
  const transitionPhase = useTransitionEventPhase();
  const navigate = useNavigate();

  // Render the CoC modal alongside whatever else we show — when status is
  // REQUIRES_COC the modal is open; otherwise it's hidden.
  const cocModal = (
    <CodeOfConductModal
      open={status === "REQUIRES_COC"}
      onClose={() => retry()}
      onAccepted={acceptCodeOfConduct}
    />
  );

  if (status === "READY") {
    return (
      <>
        {cocModal}
        {renderReady(data)}
      </>
    );
  }

  const wrapper = (children: ReactNode, accent: "neutral" | "warn" | "error" = "neutral") => {
    const accentBorder =
      accent === "error"
        ? "border-red-800"
        : accent === "warn"
        ? "border-yellow-800"
        : "border-white/10";
    return (
      <>
        {cocModal}
        <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-6">
          <div
            className={`w-full max-w-md rounded-xl border ${accentBorder} bg-black/60 p-6 text-center text-white space-y-4`}
          >
            {children}
          </div>
        </div>
      </>
    );
  };

  if (status === "IDLE" || status === "LOADING_EVENT") {
    return wrapper(
      <>
        <div className="animate-pulse text-white/70 text-sm">Loading event…</div>
      </>,
    );
  }

  if (status === "NOT_LIVE") {
    return wrapper(
      <>
        <h2 className="text-lg font-semibold">Event is not live yet</h2>
        <p className="text-sm text-white/60">
          {canControlPhase
            ? "Move the event to LIVE phase to start streaming."
            : "Check back when the event begins."}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {canControlPhase && eventId && (
            <button
              type="button"
              disabled={transitionPhase.isPending}
              onClick={async () => {
                try {
                  await transitionPhase.mutateAsync({ id: eventId, phase: EventPhase.LIVE });
                  toast.success("Event is now LIVE");
                  retry();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not update phase");
                }
              }}
              className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] disabled:opacity-50 rounded-lg text-sm font-semibold"
            >
              {transitionPhase.isPending ? "Updating…" : "Go Live"}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(backHref)}
            className="px-4 py-2 border border-white/15 hover:bg-white/5 rounded-lg text-sm"
          >
            Back
          </button>
        </div>
      </>,
      "warn",
    );
  }

  if (status === "ACCESS_DENIED") {
    return wrapper(
      <>
        <h2 className="text-lg font-semibold">You don't have access to this stream</h2>
        <p className="text-sm text-white/60">
          {data.errorMessage ?? "Your account does not have permission to view this event."}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {eventId && (
            <button
              type="button"
              onClick={() => navigate(`/events/${eventId}/register`)}
              className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] rounded-lg text-sm font-semibold"
            >
              Get a ticket
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(backHref)}
            className="px-4 py-2 border border-white/15 hover:bg-white/5 rounded-lg text-sm"
          >
            Back
          </button>
        </div>
      </>,
      "error",
    );
  }

  if (status === "CONNECTING_SOCKET") {
    return wrapper(
      <>
        <div className="animate-pulse text-white/70 text-sm">Connecting to event…</div>
        <p className="text-xs text-white/40">Waiting for realtime room (event:joined)</p>
      </>,
    );
  }

  if (status === "REQUESTING_TOKEN") {
    return wrapper(
      <>
        <div className="animate-pulse text-white/70 text-sm">Joining stream…</div>
      </>,
    );
  }

  if (status === "REQUIRES_COC") {
    // Modal is rendered above; show a minimal hint behind it.
    return wrapper(
      <>
        <h2 className="text-base font-semibold">Code of Conduct required</h2>
        <p className="text-sm text-white/60">
          Accept the Code of Conduct to continue joining this stream.
        </p>
      </>,
    );
  }

  // ERROR
  return wrapper(
    <>
      <h2 className="text-lg font-semibold text-red-400">Could not join the stream</h2>
      <p className="text-sm text-white/70">
        {data.errorMessage ?? "Something went wrong while joining the event."}
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={() => retry()}
          className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] rounded-lg text-sm font-semibold"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => navigate(backHref)}
          className="px-4 py-2 border border-white/15 hover:bg-white/5 rounded-lg text-sm"
        >
          Back
        </button>
      </div>
    </>,
    "error",
  );
}
