import { Link } from "react-router-dom";

type CompactAccountIndicatorProps = {
  avatarUrl?: string | null;
  displayName: string;
  /** Fallback letter when no avatar */
  initial: string;
  to?: string;
};

const defaultAvatar = "/assets/defaults/profile-picture.png";

export function CompactAccountIndicator({
  avatarUrl,
  displayName,
  initial,
  to = "/profile",
}: CompactAccountIndicatorProps) {
  const src = avatarUrl || defaultAvatar;

  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg border border-transparent hover:border-gray-800 hover:bg-neutral-900/80 transition-colors min-w-0"
    >
      <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden border border-gray-800 bg-neutral-900">
        {avatarUrl ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              if (el.src.endsWith(defaultAvatar)) return;
              el.src = defaultAvatar;
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#E10600] to-[#860005] text-white text-xs font-heading font-bold">
            {initial.toUpperCase()}
          </div>
        )}
      </div>
      <span className="truncate text-sm font-body font-medium text-white tracking-tight">
        {displayName}
      </span>
    </Link>
  );
}
