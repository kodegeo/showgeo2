import { useEntityContext } from "@/hooks/useEntityContext";
import { useEvents } from "@/hooks/useEvents";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { EventCard } from "@/components/events/EventCard";
import { Calendar, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export function CreatorEventsPage() {
  const { currentEntity } = useEntityContext();

  const { data: eventsData, isLoading } = useEvents({
    entityId: currentEntity?.id,
  });

  const events = eventsData?.data ?? [];

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
              My Events
            </h1>
            <p className="text-[#9A9A9A] font-body">
              Manage and schedule your events
            </p>
          </div>

          <Link
            to="/creator/events/new"
            className="px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CD000E] mx-auto mb-4" />
            <p className="text-[#9A9A9A] font-body">Loading events...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && events.length === 0 && (
          <div className="text-center py-12 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
            <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight">
              No Events Yet
            </h3>
            <p className="text-[#9A9A9A] font-body mb-6">
              Create your first event to get started
            </p>
            <Link
              to="/creator/events/new"
              className="inline-block px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50"
            >
              Create Event
            </Link>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
}
