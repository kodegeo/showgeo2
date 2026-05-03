import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { clipsService } from "@/services/clips.service";
import { ShareClipModal } from "@/components/clips/ShareClipModal";
import {
  Share2,
  Eye,
  Calendar,
  User,
  Loader2,
  Twitter,
  Facebook,
  Linkedin,
  Link2,
} from "lucide-react";

export function ClipDetailPage() {
  const { id: clipId } = useParams<{ id: string }>();
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
      <div className="min-h-screen bg-[#0B0B0B] text-white flex items-center justify-center">
        <p className="text-white/70">Missing clip ID.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#CD000E]" aria-hidden />
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-white/70">Clip not found.</p>
        <Link to="/" className="text-[#CD000E] hover:text-[#860005]">
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
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-heading font-bold text-white uppercase tracking-tight mb-6">
          {clip.title || "Clip"}
        </h1>

        {/* Video player */}
        <div className="aspect-video bg-[#0B0B0B] border border-gray-800 rounded-lg overflow-hidden mb-6">
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
                <span>No video available</span>
              )}
            </div>
          )}
        </div>

        {/* Event name & creator */}
        <div className="flex flex-wrap items-center gap-4 text-white/80 mb-6">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#CD000E]" />
            {eventName}
          </span>
          {creatorSlug ? (
            <Link
              to={`/creators/${creatorSlug}`}
              className="flex items-center gap-2 text-white hover:text-[#CD000E] transition-colors"
            >
              <User className="w-4 h-4" />
              {creatorName}
            </Link>
          ) : (
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {creatorName}
            </span>
          )}
          <span className="flex items-center gap-1 text-white/60">
            <Eye className="w-4 h-4" />
            {views} view{views !== 1 ? "s" : ""}
          </span>
        </div>

        {clip.description && (
          <p className="text-white/70 mb-6 whitespace-pre-wrap">{clip.description}</p>
        )}

        {/* Share buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-white/50 uppercase tracking-wider mr-2">Share</span>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#CD000E] hover:bg-[#860005] text-white font-semibold transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            type="button"
            onClick={() => {
              clipsService.getShareMetadata(clipId).then(meta => {
                if (meta?.clipUrl) {
                  navigator.clipboard.writeText(meta.clipUrl);
                }
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-white/90 hover:bg-white/5 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Copy link
          </button>
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              clipsService.getShareMetadata(clipId).then(meta => {
                if (meta?.shareLinks?.twitter) {
                  window.open(meta.shareLinks.twitter, "_blank", "noopener,noreferrer");
                }
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-white/90 hover:bg-white/5 transition-colors"
          >
            <Twitter className="w-4 h-4" />X
          </a>
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              clipsService.getShareMetadata(clipId).then(meta => {
                if (meta?.shareLinks?.facebook) {
                  window.open(meta.shareLinks.facebook, "_blank", "noopener,noreferrer");
                }
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-white/90 hover:bg-white/5 transition-colors"
          >
            <Facebook className="w-4 h-4" />
            Facebook
          </a>
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              clipsService.getShareMetadata(clipId).then(meta => {
                if (meta?.shareLinks?.linkedin) {
                  window.open(meta.shareLinks.linkedin, "_blank", "noopener,noreferrer");
                }
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-white/90 hover:bg-white/5 transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </a>
        </div>

        {event?.id && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            <Link
              to={`/events/${event.id}`}
              className="inline-flex items-center gap-2 text-[#CD000E] hover:text-[#860005] font-medium"
            >
              <Calendar className="w-4 h-4" />
              View event
            </Link>
          </div>
        )}
      </div>

      <ShareClipModal clipId={clip.id} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
