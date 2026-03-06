import { useParams, useNavigate } from "react-router-dom";
import { useEvent, useUpdateEvent } from "@/hooks/useEvents";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { useState, useEffect } from "react";
import { EventPhase } from "@/types/eventPhase";

export function CreatorEventEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(id!);
  const updateEvent = useUpdateEvent();

  const [form, setForm] = useState({
    name: "",
    description: "",
    startTime: "",
    location: "",
    liveIntroduction: {
      enabled: false,
      videoUrl: "",
    },
  });

  useEffect(() => {
    if (event) {
      setForm({
        name: event.name,
        description: event.description ?? "",
        startTime: event.startTime
        ? new Date(event.startTime).toISOString().slice(0, 16)
        : "",
        location: event.location ?? "",
        liveIntroduction: (event.liveIntroduction as { enabled?: boolean; videoUrl?: string }) || {
          enabled: false,
          videoUrl: "",
        },
      });
    }
  }, [event]);

  if (isLoading || !event) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-white/60">Loading…</div>
      </CreatorDashboardLayout>
    );
  }

  async function save() {
    if (!event) return;
  
    await updateEvent.mutateAsync({
      id: event.id,
      data: {
        name: form.name,
        description: form.description || undefined,
        startTime: new Date(form.startTime).toISOString(),
        location: form.location || undefined,
        liveIntroduction: form.liveIntroduction.enabled
          ? {
              enabled: form.liveIntroduction.enabled,
              videoUrl: form.liveIntroduction.videoUrl,
            }
          : { enabled: false },
      },
    });
  
    navigate(`/creator/events/${event.id}`);
  }

  const isPreLive = event?.phase === EventPhase.PRE_LIVE;
  return (
    <CreatorDashboardLayout>
      <div className="max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-white">Edit Event</h1>

        <input
          className="w-full p-2 bg-black/40 border border-white/10"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <textarea
          className="w-full p-2 bg-black/40 border border-white/10"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <input
          type="datetime-local"
          className="w-full p-2 bg-black/40 border border-white/10"
          value={form.startTime}
          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
        />

        <input
          className="w-full p-2 bg-black/40 border border-white/10"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />

        {/* Live Introduction Section - Only visible in PRE_LIVE */}
        {isPreLive && (
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Live Introduction</h2>
              <p className="text-sm text-white/60 mb-4">
                This video will play for viewers before you appear live.
              </p>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="liveIntroductionEnabled"
                checked={form.liveIntroduction.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    liveIntroduction: {
                      ...form.liveIntroduction,
                      enabled: e.target.checked,
                      videoUrl: e.target.checked ? form.liveIntroduction.videoUrl : "",
                    },
                  })
                }
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-[#CD000E] focus:ring-[#CD000E]"
              />
              <label htmlFor="liveIntroductionEnabled" className="text-white font-medium">
                Use Live Introduction
              </label>
            </div>

            {/* Video URL Input - Only shown when enabled */}
            {form.liveIntroduction.enabled && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  MP4 Video URL *
                </label>
                <input
                  type="url"
                  required={form.liveIntroduction.enabled}
                  value={form.liveIntroduction.videoUrl}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      liveIntroduction: {
                        ...form.liveIntroduction,
                        videoUrl: e.target.value,
                      },
                    })
                  }
                  placeholder="https://example.com/intro-video.mp4"
                  className="w-full p-2 bg-black/40 border border-white/10 rounded text-white placeholder-white/40 focus:border-[#CD000E] focus:outline-none"
                />
                <p className="text-xs text-white/50 mt-1">
                  Enter an external MP4 video URL. This video will play before the live stream starts.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={save}
            className="px-4 py-2 bg-[#CD000E] text-white rounded"
          >
            Save Changes
          </button>

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white/10 text-white rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </CreatorDashboardLayout>
  );
}
