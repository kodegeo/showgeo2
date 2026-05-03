import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Image,
  LayoutDashboard,
  Ticket,
  Radio,
  Lock,
  Video,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useEvent, useUpdateEvent } from "@/hooks/useEvents";
import { eventsService } from "@/services/events.service";
import { assetsService } from "@/services/assets.service";
import type { UpdateEventRequest } from "@/services/events.service";
import { EventStatus } from "@/types/eventPhase";
import { EventTicketTypesSection } from "@/components/events/EventTicketTypesSection";
import { toast } from "sonner";

/** Final 5-step event creation flow: Media → Overview → Tickets → Streaming → Access. Clips/Analytics are in dashboard later. */
const TABS = [
  { id: "media", label: "Media", icon: Image, required: true },
  { id: "overview", label: "Overview", icon: LayoutDashboard, required: true },
  { id: "tickets", label: "Tickets", icon: Ticket, required: true },
  { id: "streaming", label: "Streaming", icon: Radio, required: true },
  { id: "access", label: "Access", icon: Lock, required: true },
] as const;

type TabId = (typeof TABS)[number]["id"];

function getTabIndex(tabId: TabId): number {
  const i = TABS.findIndex(t => t.id === tabId);
  return i >= 0 ? i : 0;
}

function getTabIdByIndex(index: number): TabId {
  const clamped = Math.max(0, Math.min(index, TABS.length - 1));
  return TABS[clamped].id;
}

export function EventStudioPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("media");
  const [isPublishing, setIsPublishing] = useState(false);
  const { data: event, isLoading, error } = useEvent(eventId!);

  const currentStep = useMemo(() => getTabIndex(activeTab) + 1, [activeTab]);
  const totalSteps = TABS.length;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const goToStep = (direction: "prev" | "next") => {
    const idx = getTabIndex(activeTab);
    const nextIdx =
      direction === "next" ? Math.min(idx + 1, TABS.length - 1) : Math.max(idx - 1, 0);
    setActiveTab(getTabIdByIndex(nextIdx));
  };

  if (!eventId) {
    return (
      <div className="p-6 text-red-400">
        <h2 className="text-lg font-semibold mb-2">Invalid Event ID</h2>
        <Link to="/studio/events" className="text-sm text-[#CD000E] hover:text-[#860005]">
          ← Back to events
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6 text-white/60">Loading event…</div>;
  }

  if (error || !event) {
    return (
      <div className="p-6 text-red-400">
        <h2 className="text-lg font-semibold mb-2">Event Not Found</h2>
        <Link to="/studio/events" className="text-sm text-[#CD000E] hover:text-[#860005]">
          ← Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">{event.name}</h1>
          <p className="text-sm text-white/60 mt-1">Event Studio — control center</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/studio/events/${eventId}/live`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] text-sm font-medium"
          >
            <Video className="w-4 h-4" />
            Go Live
          </Link>
          <Link
            to={`/studio/events/${eventId}/dashboard`}
            className="px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 text-sm"
          >
            Full dashboard
          </Link>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm text-white/60">
          Step {currentStep} of {totalSteps}
        </p>
        <div className="flex gap-1 flex-1 max-w-xs">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                getTabIndex(activeTab) >= i ? "bg-[#CD000E]" : "bg-white/20"
              }`}
              title={`${tab.label} (${i + 1}/${totalSteps})`}
              aria-label={`Go to step ${i + 1}: ${tab.label}`}
            />
          ))}
        </div>
      </div>

      <nav className="flex gap-1 border-b border-gray-800 mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === id
                ? "border-[#CD000E] text-white"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="min-h-[320px]">
        {activeTab === "media" && (
          <MediaTab
            eventId={eventId}
            event={event as unknown as Record<string, unknown>}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ["event", eventId] })}
          />
        )}
        {activeTab === "overview" && (
          <OverviewTab
            eventId={eventId}
            event={event as unknown as Record<string, unknown>}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ["event", eventId] })}
          />
        )}
        {activeTab === "tickets" && (
          <EventTicketTypesSection
            eventId={eventId}
            event={event as unknown as Record<string, unknown>}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ["event", eventId] })}
            showLinkToAccessPage
          />
        )}
        {activeTab === "streaming" && <StreamingTab />}
        {activeTab === "access" && (
          <AccessTab
            eventId={eventId}
            event={event as unknown as Record<string, unknown>}
            onUpdated={() => queryClient.invalidateQueries({ queryKey: ["event", eventId] })}
          />
        )}
      </div>

      {/* Pagination: Previous / Next; Publish on last step (no streaming) */}
      <div className="mt-8 pt-6 border-t border-gray-800 flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => goToStep("prev")}
          disabled={isFirstStep}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!isLastStep ? (
            <button
              type="button"
              onClick={() => goToStep("next")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] text-sm font-medium"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isPublishing}
                onClick={async () => {
                  try {
                    console.log("Publishing event:", eventId);
                    setIsPublishing(true);
                    // "PUBLISHED" (UI concept) maps to "SCHEDULED" (backend state)
                    const updated = await eventsService.update(eventId!, {
                      status: EventStatus.SCHEDULED,
                    });
                    console.log("Updated event:", updated);
                    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
                    toast.success("Event published.");
                    navigate(`/studio/events/${eventId}`);
                  } catch (err) {
                    console.error("[EventStudio] Publish failed:", err);
                    toast.error(err instanceof Error ? err.message : "Publish failed");
                  } finally {
                    setIsPublishing(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] disabled:opacity-50 text-sm font-medium"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isPublishing ? "Publishing…" : "Publish Event"}
              </button>
              <Link
                to={`/studio/events/${eventId}/manage?tab=audience`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-white/5 text-sm font-medium"
              >
                Manage event
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaTab({
  eventId,
  event,
  onUpdated,
}: {
  eventId: string;
  event: Record<string, unknown>;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const updateEvent = useUpdateEvent();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    (event.thumbnail as string) ?? null,
  );
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    ((event.customBranding as Record<string, unknown>)?.bannerUrl as string) ?? null,
  );
  const [promoVideoUrl, setPromoVideoUrl] = useState((event.videoUrl as string) ?? "");
  const [uploading, setUploading] = useState<"thumbnail" | "banner" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep Media tab in sync with event from API (e.g. after refetch or when event already has media)
  useEffect(() => {
    if (event.thumbnail != null) setThumbnailUrl((event.thumbnail as string) || null);
    const branding = event.customBranding as Record<string, unknown> | undefined;
    if (branding?.bannerUrl != null) setBannerUrl((branding.bannerUrl as string) || null);
    if (event.videoUrl != null) setPromoVideoUrl((event.videoUrl as string) || "");
  }, [event.thumbnail, event.videoUrl, event.customBranding]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading("thumbnail");
    try {
      const res = await assetsService.uploadEventThumbnail(file, eventId);
      setThumbnailUrl(res.url);
      updateEvent.mutate(
        { id: eventId, data: { thumbnail: res.url } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            onUpdated();
            toast.success("Thumbnail saved");
          },
          onError: (err: Error) => toast.error(err.message ?? "Save failed"),
        },
      );
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Upload failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading("banner");
    try {
      const res = await assetsService.uploadEventBanner(file, eventId);
      setBannerUrl(res.url);
      const existing = (event.customBranding as Record<string, unknown>) ?? {};
      updateEvent.mutate(
        { id: eventId, data: { customBranding: { ...existing, bannerUrl: res.url } } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event", eventId] });
            onUpdated();
            toast.success("Banner saved");
          },
          onError: (err: Error) => toast.error(err.message ?? "Save failed"),
        },
      );
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Upload failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const handleSavePromoUrl = () => {
    setError(null);
    updateEvent.mutate(
      { id: eventId, data: { videoUrl: promoVideoUrl.trim() || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["event", eventId] });
          onUpdated();
          toast.success("Promo video URL saved");
        },
        onError: (err: Error) => {
          toast.error(err.message ?? "Save failed");
          setError(err.message ?? "Save failed");
        },
      },
    );
  };

  const hasAnyMedia = thumbnailUrl || bannerUrl || promoVideoUrl.trim();

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-white/70">
        Upload thumbnail and banner via the asset service. Promo video is URL only (YouTube, Vimeo,
        or direct MP4).
      </p>

      {/* Preview panel: how media will look online */}
      {hasAnyMedia && (
        <div className="rounded-lg border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
            Preview — how it will look online
          </p>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            {/* Thumbnail preview (16:9 card) */}
            <div className="flex-shrink-0">
              <p className="text-xs text-white/40 mb-1">Thumbnail</p>
              <div
                className="w-40 aspect-video rounded-lg overflow-hidden border border-white/10 bg-white/5"
                title="Thumbnail preview"
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                    No image
                  </div>
                )}
              </div>
            </div>
            {/* Banner preview (wide strip) */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 mb-1">Banner</p>
              <div
                className="w-full max-w-xs h-16 rounded-lg overflow-hidden border border-white/10 bg-white/5"
                title="Banner preview"
              >
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                    No image
                  </div>
                )}
              </div>
            </div>
            {/* Promo video preview */}
            <div className="flex-shrink-0">
              <p className="text-xs text-white/40 mb-1">Promo video</p>
              <div className="w-40 aspect-video rounded-lg overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                {promoVideoUrl.trim() ? (
                  isDirectVideoUrl(promoVideoUrl) ? (
                    <video
                      src={promoVideoUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : getVideoThumbnailUrl(promoVideoUrl) ? (
                    <a
                      href={promoVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-full block"
                    >
                      <PromoThumbnailImage
                        src={getVideoThumbnailUrl(promoVideoUrl)!}
                        alt="Promo video thumbnail"
                      />
                    </a>
                  ) : (
                    <a
                      href={promoVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 hover:text-white text-xs px-2 text-center"
                    >
                      Video link
                    </a>
                  )
                ) : (
                  <span className="text-white/30 text-xs">No URL</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Thumbnail (16:9, 1280×720 recommended)
        </label>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="media-thumbnail"
          onChange={handleThumbnailUpload}
          disabled={!!uploading}
        />
        <label
          htmlFor="media-thumbnail"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white cursor-pointer hover:bg-white/5 disabled:opacity-50"
        >
          {uploading === "thumbnail" ? "Uploading…" : "Choose file"}
        </label>
        {thumbnailUrl && (
          <p className="mt-2 text-xs text-white/50 truncate">Saved: {thumbnailUrl}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Banner (1920×1080 recommended)
        </label>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="media-banner"
          onChange={handleBannerUpload}
          disabled={!!uploading}
        />
        <label
          htmlFor="media-banner"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white cursor-pointer hover:bg-white/5 disabled:opacity-50"
        >
          {uploading === "banner" ? "Uploading…" : "Choose file"}
        </label>
        {bannerUrl && <p className="mt-2 text-xs text-white/50 truncate">Saved: {bannerUrl}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Promo video (URL only — YouTube, Vimeo, or direct MP4)
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={promoVideoUrl}
            onChange={e => setPromoVideoUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-white/30"
          />
          <button
            type="button"
            onClick={handleSavePromoUrl}
            disabled={updateEvent.isPending}
            className="px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function isDirectVideoUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\.(mp4|webm|ogg)(\?|$)/i.test(path) || path.includes("/video/");
  } catch {
    return false;
  }
}

/** Returns a thumbnail URL for known hosts (YouTube, Vimeo) from URL metadata; null if unknown. */
function getVideoThumbnailUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    // YouTube: watch?v=, shorts/, youtu.be/
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
      let id: string | null = null;
      if (host === "youtu.be" && u.pathname.length > 1) {
        id = u.pathname.slice(1).split("/")[0];
      } else if (u.pathname === "/shorts" && u.searchParams.has("v")) {
        id = u.searchParams.get("v");
      } else if (u.pathname.startsWith("/shorts/")) {
        id = u.pathname.replace("/shorts/", "").split("/")[0];
      } else {
        id = u.searchParams.get("v");
      }
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    // Vimeo: id is numeric segment in path (e.g. /123456789 or /channels/.../123)
    if (host === "vimeo.com") {
      const match = u.pathname.match(/\/(\d+)(?:\/|$)/);
      if (match) return `https://vumbnail.com/${match[1]}.jpg`;
    }
    return null;
  } catch {
    return null;
  }
}

/** Shows video thumbnail with fallback to "Video link" on load error. */
function PromoThumbnailImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error)
    return (
      <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">
        Video link
      </div>
    );
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

function OverviewTab({
  eventId,
  event,
  onUpdated,
}: {
  eventId: string;
  event: Record<string, unknown>;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: (event.name as string) ?? "",
    description: (event.description as string) ?? "",
    category: ((event.customBranding as Record<string, unknown>)?.category as string) ?? "",
    startTime: (event.startTime as string)?.slice(0, 16) ?? "",
    endTime: (event.endTime as string)?.slice(0, 16) ?? "",
    location: (event.location as string) ?? "",
    visibility: (event.visibility as string) ?? "public",
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateEventRequest) => eventsService.update(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      onUpdated();
      toast.success("Event updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Update failed"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateEventRequest = {
      name: form.name,
      description: form.description || undefined,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
      endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      location: form.location || undefined,
    };
    const branding = form.category
      ? { ...((event.customBranding as Record<string, unknown>) ?? {}), category: form.category }
      : undefined;
    if (branding) (payload as Record<string, unknown>).customBranding = branding;
    updateMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
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
          rows={3}
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Start Time</label>
          <input
            type="datetime-local"
            value={form.startTime}
            onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
            className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">End Time</label>
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
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">Visibility</label>
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
      <button
        type="submit"
        disabled={updateMutation.isPending}
        className="px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] disabled:opacity-50"
      >
        {updateMutation.isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

/** No streaming API calls during event creation — broadcast starts from the event dashboard (Go Live). */
function StreamingTab() {
  return (
    <div className="space-y-4 max-w-xl">
      <p className="text-sm text-white/70">
        Streaming is configured when you start a broadcast from the event dashboard. Finish
        publishing first, then open <strong className="text-white">Full dashboard</strong> and use{" "}
        <strong className="text-white">Go Live</strong> in the Broadcast section when you are ready.
      </p>
      <p className="text-xs text-white/50">
        RTMP URL and stream key are not loaded here so this step stays free of streaming endpoints
        during setup.
      </p>
    </div>
  );
}

function AccessTab({
  eventId,
  event,
  onUpdated,
}: {
  eventId: string;
  event: Record<string, unknown>;
  onUpdated: () => void;
}) {
  const branding = (event.customBranding as Record<string, unknown>) ?? {};
  const [visibility, setVisibility] = useState(
    (event.visibility as string) ?? (branding.visibility as string) ?? "public",
  );
  const [accessLevel, setAccessLevel] = useState<"public" | "ticket_required" | "invite_only">(
    () => {
      const ra = event.registrationAccess as string | undefined;
      const tr = Boolean(event.ticketRequired);
      if (ra === "INVITE_ONLY") return "invite_only";
      if (tr) return "ticket_required";
      return "public";
    },
  );
  const [geoRestricted, setGeoRestricted] = useState(Boolean(event.geoRestricted));
  const [allowedCountries, setAllowedCountries] = useState<string>(
    Array.isArray(event.geoRegions) ? (event.geoRegions as string[]).join(", ") : "",
  );
  const updateMutation = useMutation({
    mutationFn: (data: UpdateEventRequest) => eventsService.update(eventId, data),
    onSuccess: () => {
      onUpdated();
      toast.success("Access settings updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Update failed"),
  });

  const handleSave = () => {
    const payload: UpdateEventRequest = {
      geoRestricted,
      geoRegions: allowedCountries.trim()
        ? allowedCountries
            .split(/[\s,]+/)
            .map(c => c.trim().toUpperCase())
            .filter(Boolean)
        : undefined,
      registrationAccess: accessLevel === "invite_only" ? "INVITE_ONLY" : "OPEN",
      ticketRequired: accessLevel === "ticket_required",
      customBranding: { ...branding, visibility },
    };
    updateMutation.mutate(payload);
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Visibility</label>
        <select
          value={visibility}
          onChange={e => setVisibility(e.target.value)}
          className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
        >
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">Access level</label>
        <select
          value={accessLevel}
          onChange={e =>
            setAccessLevel(e.target.value as "public" | "ticket_required" | "invite_only")
          }
          className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white"
        >
          <option value="public">Public</option>
          <option value="ticket_required">Ticket required</option>
          <option value="invite_only">Invite only</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="geoRestricted"
          checked={geoRestricted}
          onChange={e => setGeoRestricted(e.target.checked)}
          className="rounded border-gray-600 text-[#CD000E] focus:ring-[#CD000E]"
        />
        <label htmlFor="geoRestricted" className="text-white/80">
          Geo-restricted
        </label>
      </div>
      {geoRestricted && (
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Allowed countries (ISO codes, comma-separated)
          </label>
          <input
            type="text"
            value={allowedCountries}
            onChange={e => setAllowedCountries(e.target.value)}
            placeholder="e.g. US, CA, GB"
            className="w-full px-3 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-white/30"
          />
        </div>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="px-4 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] disabled:opacity-50"
      >
        Save access settings
      </button>
    </div>
  );
}
