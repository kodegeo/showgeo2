import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { clipsService } from "@/services/clips.service";
import { Share2, Eye, Calendar } from "lucide-react";
import { useState } from "react";
import { ShareClipModal } from "@/components/clips/ShareClipModal";

export function ClipPage() {
  const { clipId } = useParams<{ clipId: string }>();
  const [shareOpen, setShareOpen] = useState(false);

  const {
    data: clip,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clip", clipId],
    queryFn: () => clipsService.getClip(clipId!),
    enabled: !!clipId,
  });

  if (!clipId) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p>Missing clip ID.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p>Loading clip…</p>
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p>Clip not found.</p>
        <Link to="/" className="ml-2 text-red-400 hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  const event = clip.events;
  const entity = event?.entities_events_entityIdToentities;
  const creatorName = entity?.name ?? "Creator";
  const creatorSlug = entity?.slug ?? "";
  const eventName = event?.name ?? "Event";
  const thumbnail = clip.thumbnail_url || event?.thumbnail;
  const views = clip.views ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{clip.title || "Highlight"}</h1>

        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-6">
          {clip.video_url ? (
            <video
              src={clip.video_url}
              controls
              className="w-full h-full object-contain"
              poster={thumbnail ?? undefined}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50">
              {thumbnail ? (
                <img src={thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>No video</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-white/70 mb-4">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {views} view{views !== 1 ? "s" : ""}
          </span>
          {creatorSlug && (
            <Link to={`/creators/${creatorSlug}`} className="text-white hover:underline">
              {creatorName}
            </Link>
          )}
          <span>{eventName}</span>
        </div>

        {clip.description && (
          <p className="text-white/80 mb-6 whitespace-pre-wrap">{clip.description}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          {event?.id && (
            <Link
              to={`/events/${event.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10"
            >
              <Calendar className="w-4 h-4" />
              View event
            </Link>
          )}
        </div>
      </div>

      <ShareClipModal clipId={clip.id} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
