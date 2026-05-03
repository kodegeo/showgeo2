import { useParams, useNavigate } from "react-router-dom";
import { useEvent, useUpdateEvent } from "@/hooks/useEvents";
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
    ticketRequired: true,
    pricing: "FREE" as "FREE" | "PAID",
    ticketPrice: "",
    registrationAccess: "INVITE_ONLY" as "OPEN" | "INVITE_ONLY",
    streamingAccessLevel: "" as "" | "LOCAL" | "REGIONAL" | "NATIONAL" | "INTERNATIONAL",
    geoRegions: "",
    replayEnabled: false,
    replayVideoUrl: "",
    liveIntroduction: {
      enabled: false,
      videoUrl: "",
    },
  });

  useEffect(() => {
    if (event) {
      const ticketTypesFromEvent = event.ticketTypes as { price?: number }[] | undefined;
      const firstPrice =
        Array.isArray(ticketTypesFromEvent) && ticketTypesFromEvent.length > 0
          ? Number(ticketTypesFromEvent[0]?.price ?? 0)
          : 0;
      setForm({
        name: event.name,
        description: event.description ?? "",
        startTime: event.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : "",
        location: event.location ?? "",
        ticketRequired: event.ticketRequired ?? true,
        pricing: firstPrice > 0 ? "PAID" : "FREE",
        ticketPrice: firstPrice > 0 ? String(firstPrice) : "",
        registrationAccess: (event as any).registrationAccess === "OPEN" ? "OPEN" : "INVITE_ONLY",
        streamingAccessLevel: (event as any).streamingAccessLevel ?? "",
        geoRegions: Array.isArray((event as any).geoRegions)
          ? (event as any).geoRegions.join(", ")
          : "",
        replayEnabled: !!(event as any).videoUrl,
        replayVideoUrl: (event as any).videoUrl ?? "",
        liveIntroduction: (event.liveIntroduction as { enabled?: boolean; videoUrl?: string }) || {
          enabled: false,
          videoUrl: "",
        },
      });
    }
  }, [event]);

  if (isLoading || !event) {
    return <div className="p-6 text-white/60">Loading…</div>;
  }

  async function save() {
    if (!event) return;

    const ticketTypes =
      form.pricing === "PAID" && form.ticketPrice
        ? [
            {
              type: "PAID" as const,
              price: Number(form.ticketPrice),
              currency: "USD",
              availability: 999,
            },
          ]
        : form.pricing === "FREE"
        ? [{ type: "FREE" as const, price: 0, currency: "USD", availability: 999 }]
        : undefined;

    const geoRegionsArray = form.geoRegions
      ? form.geoRegions
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
      : undefined;

    await updateEvent.mutateAsync({
      id: event.id,
      data: {
        name: form.name,
        description: form.description || undefined,
        startTime: new Date(form.startTime).toISOString(),
        location: form.location || undefined,
        ticketRequired: form.ticketRequired,
        registrationAccess: form.registrationAccess,
        ticketTypes,
        streamingAccessLevel: form.streamingAccessLevel || undefined,
        geoRegions: geoRegionsArray,
        ...(form.replayEnabled && form.replayVideoUrl ? { videoUrl: form.replayVideoUrl } : {}),
        liveIntroduction: form.liveIntroduction.enabled
          ? { enabled: form.liveIntroduction.enabled, videoUrl: form.liveIntroduction.videoUrl }
          : { enabled: false },
      },
    });

    navigate(`/studio/events/${event.id}`);
  }

  const isPreLive = event?.phase === EventPhase.PRE_LIVE;
  return (
    <div className="max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-white">Edit Event</h1>

      <input
        className="w-full p-2 bg-black/40 border border-white/10"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
      />

      <textarea
        className="w-full p-2 bg-black/40 border border-white/10"
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
      />

      <input
        type="datetime-local"
        className="w-full p-2 bg-black/40 border border-white/10"
        value={form.startTime}
        onChange={e => setForm({ ...form, startTime: e.target.value })}
      />

      <input
        className="w-full p-2 bg-black/40 border border-white/10"
        value={form.location}
        onChange={e => setForm({ ...form, location: e.target.value })}
      />

      {/* Access & ticketing */}
      <div className="pt-4 border-t border-white/10 space-y-4">
        <h2 className="text-lg font-semibold text-white">Access & ticketing</h2>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="ticketRequired"
            checked={form.ticketRequired}
            onChange={e => setForm({ ...form, ticketRequired: e.target.checked })}
            className="w-4 h-4 rounded border-white/20 bg-black/40 text-[#CD000E]"
          />
          <label htmlFor="ticketRequired" className="text-white">
            Ticket required to attend
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Pricing</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="pricing"
                checked={form.pricing === "FREE"}
                onChange={() => setForm({ ...form, pricing: "FREE", ticketPrice: "" })}
                className="text-[#CD000E]"
              />
              FREE
            </label>
            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="pricing"
                checked={form.pricing === "PAID"}
                onChange={() => setForm({ ...form, pricing: "PAID" })}
                className="text-[#CD000E]"
              />
              PAID
            </label>
          </div>
          {form.pricing === "PAID" && (
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Price (USD)"
              value={form.ticketPrice}
              onChange={e => setForm({ ...form, ticketPrice: e.target.value })}
              className="mt-2 w-full p-2 bg-black/40 border border-white/10 rounded text-white"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Registration access
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="registrationAccess"
                checked={form.registrationAccess === "OPEN"}
                onChange={() => setForm({ ...form, registrationAccess: "OPEN" })}
                className="text-[#CD000E]"
              />
              OPEN (anyone can register)
            </label>
            <label className="flex items-center gap-2 text-white">
              <input
                type="radio"
                name="registrationAccess"
                checked={form.registrationAccess === "INVITE_ONLY"}
                onChange={() => setForm({ ...form, registrationAccess: "INVITE_ONLY" })}
                className="text-[#CD000E]"
              />
              INVITE ONLY
            </label>
          </div>
        </div>
      </div>

      {/* Geofencing - placeholder */}
      <div className="pt-4 border-t border-white/10 space-y-4">
        <h2 className="text-lg font-semibold text-white">Geofencing</h2>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Streaming access level
          </label>
          <select
            value={form.streamingAccessLevel}
            onChange={e =>
              setForm({
                ...form,
                streamingAccessLevel: e.target.value as typeof form.streamingAccessLevel,
              })
            }
            className="w-full p-2 bg-black/40 border border-white/10 rounded text-white"
          >
            <option value="">No restriction</option>
            <option value="LOCAL">Local (city)</option>
            <option value="REGIONAL">Regional (state)</option>
            <option value="NATIONAL">National (country)</option>
            <option value="INTERNATIONAL">International</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Allowed regions (comma-separated)
          </label>
          <input
            type="text"
            placeholder="e.g. Denver, CO, USA"
            value={form.geoRegions}
            onChange={e => setForm({ ...form, geoRegions: e.target.value })}
            className="w-full p-2 bg-black/40 border border-white/10 rounded text-white"
          />
        </div>
      </div>

      {/* Replay (post-event) - videoUrl */}
      <div className="pt-4 border-t border-white/10 space-y-4">
        <h2 className="text-lg font-semibold text-white">Replay</h2>
        <p className="text-sm text-white/60">Optional replay video URL for after the event ends.</p>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="replayEnabled"
            checked={form.replayEnabled}
            onChange={e => setForm({ ...form, replayEnabled: e.target.checked })}
            className="w-4 h-4 rounded border-white/20 bg-black/40 text-[#CD000E]"
          />
          <label htmlFor="replayEnabled" className="text-white">
            Enable replay
          </label>
        </div>
        {form.replayEnabled && (
          <input
            type="url"
            placeholder="Replay video URL"
            value={form.replayVideoUrl}
            onChange={e => setForm({ ...form, replayVideoUrl: e.target.value })}
            className="w-full p-2 bg-black/40 border border-white/10 rounded text-white"
          />
        )}
      </div>

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
              onChange={e =>
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
              <label className="block text-sm font-medium text-white mb-2">MP4 Video URL *</label>
              <input
                type="url"
                required={form.liveIntroduction.enabled}
                value={form.liveIntroduction.videoUrl}
                onChange={e =>
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
        <button onClick={save} className="px-4 py-2 bg-[#CD000E] text-white rounded">
          Save Changes
        </button>

        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white/10 text-white rounded">
          Cancel
        </button>
      </div>
    </div>
  );
}
