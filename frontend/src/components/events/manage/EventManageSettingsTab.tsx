import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Event } from "@/types/event.types";
import { eventsService } from "@/services/events.service";
import type { UpdateEventRequest } from "@/services/events.service";

export interface EventManageSettingsTabProps {
  eventId: string;
  event: Event;
}

type AccessLevel = "public" | "ticket_required" | "invite_only";

function buildForm(event: Event) {
  const ev = event as unknown as Record<string, unknown>;
  const branding = (ev.customBranding as Record<string, unknown>) ?? {};
  const ra = ev.registrationAccess as string | undefined;
  const tr = Boolean(ev.ticketRequired);
  let accessLevel: AccessLevel = "public";
  if (ra === "INVITE_ONLY") accessLevel = "invite_only";
  else if (tr) accessLevel = "ticket_required";

  return {
    name: event.name ?? "",
    description: (event.description as string) ?? "",
    category: (branding.category as string) ?? "",
    startTime: event.startTime ? event.startTime.slice(0, 16) : "",
    endTime: event.endTime ? event.endTime.slice(0, 16) : "",
    location: (event.location as string) ?? "",
    visibility: ((ev.visibility as string) ??
      (branding.visibility as string) ??
      "public") as string,
    accessLevel,
    geoRestricted: Boolean(event.geoRestricted),
    allowedCountries: Array.isArray(event.geoRegions)
      ? (event.geoRegions as string[]).join(", ")
      : "",
    promoVideoUrl: (event.videoUrl as string) ?? "",
  };
}

export function EventManageSettingsTab({ eventId, event }: EventManageSettingsTabProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => buildForm(event));

  useEffect(() => {
    setForm(buildForm(event));
  }, [event.id, event.updatedAt]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateEventRequest) => eventsService.update(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("Settings saved");
    },
    onError: (err: Error) => toast.error(err.message ?? "Save failed"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ev = event as unknown as Record<string, unknown>;
    const branding = {
      ...((ev.customBranding as Record<string, unknown>) ?? {}),
      category: form.category || undefined,
      visibility: form.visibility,
    };

    const payload: UpdateEventRequest = {
      name: form.name,
      description: form.description || undefined,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
      endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      location: form.location || undefined,
      videoUrl: form.promoVideoUrl.trim() || undefined,
      geoRestricted: form.geoRestricted,
      geoRegions: form.allowedCountries.trim()
        ? form.allowedCountries
            .split(/[\s,]+/)
            .map(c => c.trim().toUpperCase())
            .filter(Boolean)
        : undefined,
      registrationAccess: form.accessLevel === "invite_only" ? "INVITE_ONLY" : "OPEN",
      ticketRequired: form.accessLevel === "ticket_required",
      customBranding: branding,
    };

    updateMutation.mutate(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 max-w-2xl rounded-xl border border-white/10 bg-white/[0.03] p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Basics</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="e.g. Music, Sports"
              className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Start</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">End</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Promo video</h2>
        <p className="text-sm text-white/50 mb-2">YouTube, Vimeo, or direct MP4 URL.</p>
        <input
          type="url"
          value={form.promoVideoUrl}
          onChange={e => setForm(p => ({ ...p, promoVideoUrl: e.target.value }))}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder:text-white/30"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Visibility & access</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Listing visibility
            </label>
            <select
              value={form.visibility}
              onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Access level</label>
            <select
              value={form.accessLevel}
              onChange={e => setForm(p => ({ ...p, accessLevel: e.target.value as AccessLevel }))}
              className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
            >
              <option value="public">Open registration</option>
              <option value="ticket_required">Ticket required</option>
              <option value="invite_only">Invite only</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="geoRestricted"
              checked={form.geoRestricted}
              onChange={e => setForm(p => ({ ...p, geoRestricted: e.target.checked }))}
              className="rounded border-gray-600 text-[#CD000E] focus:ring-[#CD000E]"
            />
            <label htmlFor="geoRestricted" className="text-white/80 text-sm">
              Geo-restricted
            </label>
          </div>
          {form.geoRestricted && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Allowed countries (ISO codes, comma-separated)
              </label>
              <input
                type="text"
                value={form.allowedCountries}
                onChange={e => setForm(p => ({ ...p, allowedCountries: e.target.value }))}
                placeholder="e.g. US, CA, GB"
                className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder:text-white/30"
              />
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={updateMutation.isPending}
        className="px-6 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] disabled:opacity-50 font-medium"
      >
        {updateMutation.isPending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
