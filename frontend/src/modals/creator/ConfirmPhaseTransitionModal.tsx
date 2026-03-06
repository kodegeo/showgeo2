import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useUpdateEvent } from "@/hooks/useEvents";
import { useToast } from "@/hooks/creator/useToast";
import { EventPhase } from "@/types/eventPhase";

export function ConfirmPhaseTransitionModal() {
  const { currentModal, closeModal, modalData } = useModalContext();
  const updateEvent = useUpdateEvent();
  const { toast } = useToast();

  const { eventId, currentPhase, nextPhase, eventName } = modalData || {};

  const isOpen = currentModal === "confirmPhaseTransition";
  const isTransitioning = updateEvent.isPending;

  const getPhaseLabel = (phase: EventPhase) => {
    return phase.replace(/_/g, " ");
  };

  const getTransitionMessage = (from: EventPhase, to: EventPhase) => {
    if (from === "PRE_LIVE" && to === "LIVE") {
      return "This will make your event live and visible to all attendees. Viewers will be able to join the stream.";
    }
    if (from === "LIVE" && to === "POST_LIVE") {
      return "This will end the live event and transition to post-event phase. Post-event activities will become available.";
    }
    return "This will change the event phase. Make sure you're ready for this transition.";
  };

  const handleConfirm = async () => {
    if (!eventId || !nextPhase) {
      return;
    }

    try {
      await updateEvent.mutateAsync({
        id: eventId,
        data: { phase: nextPhase },
      });

      toast({
        type: "success",
        title: "Phase transition successful",
        description: `Event phase changed to ${getPhaseLabel(nextPhase)}.`,
      });

      closeModal();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to transition phase. Please try again.";
      toast({
        type: "error",
        title: "Phase transition failed",
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  if (!isOpen || !currentPhase || !nextPhase) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Confirm Phase Transition"
      description={`Advance event from ${getPhaseLabel(currentPhase)} to ${getPhaseLabel(nextPhase)}?`}
      size="md"
    >
      <div className="space-y-4">
        {/* Warning Message */}
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400">
            {getTransitionMessage(currentPhase, nextPhase)}
          </p>
        </div>

        {/* Event Info */}
        {eventName && (
          <div className="text-sm text-white/60">
            <span className="text-white/40">Event:</span> {eventName}
          </div>
        )}

        {/* Phase Info */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-white/40">Current:</span>{" "}
            <span className="text-white font-medium">
              {getPhaseLabel(currentPhase)}
            </span>
          </div>
          <span className="text-white/40">→</span>
          <div>
            <span className="text-white/40">Next:</span>{" "}
            <span className="text-white font-medium">
              {getPhaseLabel(nextPhase)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={closeModal}
            disabled={isTransitioning}
            className="px-6 py-2 border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isTransitioning}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTransitioning ? "Transitioning..." : "Confirm Transition"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

