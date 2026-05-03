import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { clipsService, type TrendingClipItem } from "@/services/clips.service";
import { Eye, Film, Loader2 } from "lucide-react";

function ClipCard({ clip }: { clip: TrendingClipItem }) {
  return (
    <Link
      to={`/clips/${clip.id}`}
      className="group block rounded-lg overflow-hidden border border-gray-800 bg-[#0B0B0B]/90 hover:border-gray-600 hover:bg-white/5 transition-all"
    >
      <div className="aspect-video bg-gray-900 relative">
        {clip.videoUrl ? (
          <video
            src={clip.videoUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            onMouseEnter={e => e.currentTarget.play().catch(() => {})}
            onMouseLeave={e => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40">
            <Film className="w-12 h-12" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-white font-medium truncate" title={clip.creatorName}>
          {clip.creatorName}
        </p>
        <p className="text-sm text-white/60 truncate" title={clip.eventName}>
          {clip.eventName}
        </p>
        <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          {clip.views} view{clip.views !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}

export function ClipsFeedPage() {
  const {
    data: clips,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clips", "trending"],
    queryFn: () => clipsService.getTrendingClips(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#CD000E]" aria-hidden />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-white/70">Failed to load trending clips.</p>
        <Link to="/" className="text-[#CD000E] hover:text-[#860005]">
          Go home
        </Link>
      </div>
    );
  }

  const list = Array.isArray(clips) ? clips : [];

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-heading font-bold text-white uppercase tracking-tight mb-6">
          Trending Clips
        </h1>

        {list.length === 0 ? (
          <p className="text-white/50 py-12">No clips yet. Check back later.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {list.map(clip => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
