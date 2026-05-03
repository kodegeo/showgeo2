import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { API } from "@/services/apiRoutes";
import { useEntityContext } from "@/hooks/useEntityContext";
import { assetsService } from "@/services/assets.service";
import { eventsService } from "@/services/events.service";
import { EventQuickSetup } from "@/components/events/EventQuickSetup";
import { EventConfiguration } from "@/components/events/EventConfiguration";
import { EventGoLive } from "@/components/events/EventGoLive";
import { EventSummaryCard } from "@/components/events/EventSummaryCard";
import { defaultEventWizardState, type EventWizardState } from "@/types/events";
import { ChevronRight, Circle } from "lucide-react";

const STEPS = [
  { id: 1, label: "Quick Setup" },
  { id: 2, label: "Configure Event" },
  { id: 3, label: "Go Live Preparation" },
];

function extractErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message ?? err?.message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }
  if (Array.isArray(message) && message.length > 0) {
    return message.map(m => (typeof m === "string" ? m : JSON.stringify(m))).join(", ");
  }
  if (message && typeof message === "object") {
    const nestedMessage = (message as { message?: unknown }).message;
    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage;
    }
    if (Array.isArray(nestedMessage) && nestedMessage.length > 0) {
      return nestedMessage.map(m => (typeof m === "string" ? m : JSON.stringify(m))).join(", ");
    }
  }

  return fallback;
}

export function CreateEventWizardPage() {
  const navigate = useNavigate();
  const { currentEntity } = useEntityContext();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<EventWizardState>(defaultEventWizardState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [streamInfo, setStreamInfo] = useState<{
    streamKey: string | null;
    rtmpUrl: string | null;
    status: string | null;
  }>({ streamKey: null, rtmpUrl: null, status: null });

  const updateState = useCallback((patch: Partial<EventWizardState>) => {
    setState(prev => ({ ...prev, ...patch }));
    setStepError(null);
  }, []);

  const handleStep1Submit = useCallback(async () => {
    if (!currentEntity?.id) {
      toast.error("No entity selected. Please select an entity first.");
      return;
    }
    setStepError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        entityId: currentEntity.id,
        name: state.name.trim(),
        startTime: state.startTime,
        ...(state.description.trim() ? { description: state.description.trim() } : {}),
      };
      const res = await apiClient.post<{ id: string }>(API.events, payload);
      const eventId = res.data?.id;
      if (!eventId) {
        toast.error("Event could not be created");
        setStepError("Event could not be created");
        return;
      }
      setState(prev => ({ ...prev, eventId }));
      setStep(2);
    } catch (err: any) {
      const msg = extractErrorMessage(err, "Event could not be created");
      toast.error(msg);
      setStepError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentEntity?.id, state.name, state.startTime, state.description, state.ticketPrice]);

  const handleStep2Submit = useCallback(
    async (options?: { thumbnailFile?: File | null }) => {
      if (!state.eventId) {
        toast.error("Event not found. Go back to Step 1.");
        return;
      }
      setStepError(null);
      setIsSubmitting(true);
      try {
        let thumbnailUrl: string | null = state.thumbnailUrl;
        if (options?.thumbnailFile) {
          const asset = await assetsService.uploadEventThumbnail(
            options.thumbnailFile,
            state.eventId,
          );
          thumbnailUrl = asset?.url ?? null;
          if (thumbnailUrl) updateState({ thumbnailUrl });
        }
        await eventsService.update(state.eventId, {
          ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
          ...(state.geoRestricted ? { geoRestricted: true } : {}),
        });
        setStep(3);
      } catch (err: any) {
        const msg = extractErrorMessage(err, "Configuration could not be saved");
        toast.error(msg);
        setStepError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [state.eventId, state.thumbnailUrl, state.ticketPrice, state.geoRestricted, updateState],
  );

  const handlePrepareStreaming = useCallback(async () => {
    if (!state.eventId) return;
    setStepError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post(API.streamingSession(state.eventId), {
        accessLevel: state.streamingAccessLevel || "PUBLIC",
      });
      const stream = await eventsService.getStream(state.eventId);
      setStreamInfo({
        streamKey: stream.streamKey ?? null,
        rtmpUrl: stream.rtmpUrl ?? null,
        status: stream.status ?? null,
      });
      updateState({
        streamKey: stream.streamKey ?? null,
        streamingStatus: stream.status ?? null,
      });
    } catch (err: any) {
      const msg = extractErrorMessage(err, "Streaming session could not be created");
      toast.error(msg);
      setStepError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [state.eventId, state.streamingAccessLevel, updateState]);

  const handleCancel = useCallback(() => {
    navigate("/studio/events");
  }, [navigate]);

  const handleFinish = useCallback(() => {
    if (state.eventId) {
      navigate(`/studio/events/${state.eventId}`);
    } else {
      navigate("/studio/events");
    }
  }, [navigate, state.eventId]);

  if (!currentEntity) {
    return (
      <div className="text-center py-12 text-white/60">
        No entity found. Select an entity or create one to continue.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-white uppercase tracking-tighter">
          Create Event
        </h1>
        <p className="text-[#9A9A9A] font-body mt-1">
          Follow the steps to create and prepare your event.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 ${
                step >= s.id ? "text-[#CD000E]" : "text-white/40"
              }`}
            >
              <Circle
                className={`w-5 h-5 ${step === s.id ? "fill-[#CD000E]" : "fill-transparent"}`}
              />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-white/30" />}
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          {step === 1 && (
            <EventQuickSetup
              state={state}
              onUpdate={updateState}
              onSubmit={handleStep1Submit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              error={stepError}
            />
          )}
          {step === 2 && (
            <EventConfiguration
              state={state}
              onUpdate={updateState}
              onSubmit={handleStep2Submit}
              onBack={() => setStep(1)}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              error={stepError}
            />
          )}
          {step === 3 && (
            <EventGoLive
              state={state}
              onPrepareStreaming={handlePrepareStreaming}
              onCancel={handleCancel}
              onFinish={handleFinish}
              isPreparing={isSubmitting}
              error={stepError}
              streamKey={streamInfo.streamKey ?? state.streamKey}
              streamingStatus={streamInfo.status ?? state.streamingStatus}
              rtmpUrl={streamInfo.rtmpUrl}
            />
          )}
        </div>
        <div className="lg:w-72 shrink-0">
          <EventSummaryCard state={state} />
        </div>
      </div>
    </div>
  );
}
