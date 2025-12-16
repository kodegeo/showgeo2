// components/profile/ProfileEventCard.tsx
import { Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { ProfileEvent } from "../../../../packages/shared/types/event.views";

interface Props {
  event: ProfileEvent;
}

export function ProfileEventCard({ event }: Props) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="block rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition"
    >
      <div className="aspect-video bg-black/40">
        {event.thumbnail ? (
          <img
            src={event.thumbnail}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            No Image
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-white truncate">
          {event.name}
        </h3>

        <div className="text-xs text-white/50">
          Status: {event.status}
        </div>

        <div className="flex flex-col gap-1 text-sm text-white/50">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            {new Date(event.startTime).toLocaleString()}
          </div>

          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              {event.location}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
