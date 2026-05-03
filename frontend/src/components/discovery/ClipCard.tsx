import { Link } from "react-router-dom";
import { Eye, Film } from "lucide-react";

export interface ClipCardProps {
  id: string;
  videoUrl: string | null;
  creatorName: string;
  eventName: string;
  views: number;
  /** Optional: use dark theme styling */
  dark?: boolean;
}

export function ClipCard({
  id,
  videoUrl,
  creatorName,
  eventName,
  views,
  dark = false,
}: ClipCardProps) {
  const cardClass = dark
    ? "group shrink-0 w-56 min-h-[200px] block rounded-lg overflow-hidden border border-gray-800 bg-[#0B0B0B]/90 hover:border-gray-600 transition-all snap-start"
    : "group shrink-0 w-56 min-h-[200px] block rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#CD000E]/50 transition-all snap-start";

  const textPrimary = dark ? "text-white" : "text-gray-900 dark:text-white";
  const textSecondary = dark ? "text-white/60" : "text-gray-500 dark:text-gray-400";
  const textMuted = dark ? "text-white/50" : "text-gray-400 dark:text-gray-500";

  return (
    <Link to={`/clips/${id}`} className={cardClass}>
      <div className="aspect-video bg-gray-900 dark:bg-gray-700 relative min-h-[140px]">
        {videoUrl ? (
          <video
            src={videoUrl}
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
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-white/40">
            <Film className="w-10 h-10" />
          </div>
        )}
      </div>
      <div className="p-3 min-h-[60px]">
        <p className={`text-sm font-medium truncate ${textPrimary}`}>{creatorName}</p>
        <p className={`text-xs truncate ${textSecondary}`}>{eventName}</p>
        <p className={`text-xs mt-0.5 flex items-center gap-1 ${textMuted}`}>
          <Eye className="w-3.5 h-3.5 shrink-0" />
          {views} views
        </p>
      </div>
    </Link>
  );
}
