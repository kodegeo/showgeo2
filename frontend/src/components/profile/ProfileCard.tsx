import { Link } from "react-router-dom";
import { Calendar, Users, Play } from "lucide-react";

interface ProfileCardProps {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  category?: string;
  date?: string;
  viewers?: number;
  type: "event" | "creator" | "stream";
  to?: string;
}

export function ProfileCard({
  title,
  subtitle,
  thumbnail,
  category,
  date,
  viewers,
  to,
}: ProfileCardProps) {
  const defaultThumbnail = "/assets/images/default-event-thumbnail.png";
  const cardContent = (
    <div className="group w-64 flex-shrink-0 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden hover:border-[#CD000E]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#CD000E]/10 transform hover:scale-105 cursor-pointer">
      {/* Thumbnail */}
      <div className="relative w-full h-40 bg-gradient-to-br from-[#CD000E]/90 to-[#860005]/90 overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              if ((e.target as HTMLImageElement).src !== defaultThumbnail) {
                (e.target as HTMLImageElement).src = defaultThumbnail;
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-transparent to-transparent" />
        {category && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-[#0B0B0B]/80 backdrop-blur-sm rounded text-xs font-heading font-semibold text-white uppercase tracking-wider">
            {category}
          </div>
        )}
        {viewers !== undefined && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-[#0B0B0B]/80 backdrop-blur-sm rounded text-xs text-white font-body">
            <Users className="w-3 h-3" />
            <span>{viewers.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-heading font-semibold text-white mb-1 uppercase tracking-tight line-clamp-1 group-hover:text-[#CD000E] transition-colors">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-[#9A9A9A] font-body mb-2 line-clamp-2">{subtitle}</p>
        )}
        {date && (
          <div className="flex items-center gap-1.5 text-xs text-[#9A9A9A] font-body">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(date).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{cardContent}</Link>;
  }

  return cardContent;
}

