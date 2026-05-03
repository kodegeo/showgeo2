import { Link } from "react-router-dom";
import { User } from "lucide-react";

export interface CreatorCardProps {
  id: string;
  name: string;
  slug: string;
  thumbnail?: string | null;
  /** Optional: use dark theme styling */
  dark?: boolean;
}

export function CreatorCard({ name, slug, thumbnail, dark = false }: CreatorCardProps) {
  const cardClass = dark
    ? "group shrink-0 flex flex-col items-center w-32 min-h-[200px] rounded-lg p-4 border border-gray-800 bg-[#0B0B0B]/90 hover:border-gray-600 transition-all snap-start"
    : "group shrink-0 flex flex-col items-center w-32 min-h-[200px] rounded-xl p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#CD000E]/50 transition-all snap-start";

  const textClass = dark
    ? "text-white text-sm font-medium truncate w-full text-center mt-2"
    : "text-gray-900 dark:text-white text-sm font-medium truncate w-full text-center mt-2";

  return (
    <Link to={`/creators/${slug}`} className={cardClass}>
      <div className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className="w-8 h-8 text-gray-500 dark:text-white/40" />
        )}
      </div>
      <p className={textClass}>{name}</p>
    </Link>
  );
}
