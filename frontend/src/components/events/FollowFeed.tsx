import { useQuery } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { eventsService } from "@/services/events.service";
import type { EventWithEntity } from "@/types/event.types";
import { EventCard } from "./EventCard";

export function FollowFeed() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["events", "followed"],
    queryFn: () => eventsService.getFollowed(),
    enabled: !!isAuthenticated,
  });

  const events = data?.data ?? [];
  const hasEvents = events.length > 0;

  if (authLoading || !isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="py-12 lg:py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-[#CD000E]" aria-hidden />
            From Creators You Follow
          </h2>
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-[#CD000E]" aria-hidden />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 lg:py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-[#CD000E]" aria-hidden />
            From Creators You Follow
          </h2>
          <p className="text-gray-600 dark:text-gray-400 font-body">
            Unable to load events from followed creators. Please try again later.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 lg:py-16 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-2">
          <UserPlus className="w-7 h-7 text-[#CD000E]" aria-hidden />
          From Creators You Follow
        </h2>

        {!hasEvents ? (
          <p className="text-gray-600 dark:text-gray-400 font-body">
            No upcoming or live events from creators you follow. Follow creators to see their events
            here.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: EventWithEntity) => {
              const entityName =
                event.entities_events_entityIdToentities?.name ??
                (event as EventWithEntity & { entity?: { name: string } }).entity?.name ??
                "Creator";
              const isLive = (event as EventWithEntity & { phase?: string }).phase === "LIVE";
              return (
                <li key={event.id}>
                  <EventCard
                    eventId={event.id}
                    eventName={event.name}
                    entityName={entityName}
                    startTime={event.startTime}
                    thumbnail={event.thumbnail}
                    isLive={isLive}
                    location={event.location ?? undefined}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
