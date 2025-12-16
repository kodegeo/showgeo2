import { Calendar, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import type { ProfileEvent } from "../../../../packages/shared/types/event.views";

interface EventCardProps {
  event: ProfileEvent;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      to={`/creator/events/${event.id}`}
      className="block bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors"
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight line-clamp-2">
          {event.name}
        </h3>

        {event.entity?.name && (
          <p className="text-sm text-[#9A9A9A] font-body">
            {event.entity.name}
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-[#9A9A9A] font-body">
          <Calendar className="w-4 h-4" />
          <span>{new Date(event.startTime).toLocaleDateString()}</span>
        </div>

        {/* Status */}
        <span
          className={`
            inline-block px-2 py-1 rounded text-xs font-heading font-semibold uppercase tracking-wider
            ${
              event.status === "LIVE"
                ? "bg-green-900/30 text-green-300"
                : event.status === "COMPLETED"
                ? "bg-gray-800 text-gray-400"
                : event.status === "SCHEDULED"
                ? "bg-blue-900/30 text-blue-300"
                : "bg-yellow-900/30 text-yellow-300"
            }
          `}
        >
          {event.status}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <span className="text-sm text-[#CD000E] hover:text-[#860005] font-body font-semibold uppercase tracking-wider transition-colors flex items-center gap-2">
          <Eye className="w-4 h-4" />
          View Details
        </span>
      </div>
    </Link>
  );
}
