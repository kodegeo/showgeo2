import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { toursService } from "@/services/tours.service";
import { EventCard } from "@/components/events/EventCard";

export function TourPage() {
  const { slug } = useParams<{ slug: string }>();

  const {
    data: tour,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tour", "slug", slug],
    queryFn: () => toursService.getBySlug(slug!, true),
    enabled: !!slug,
  });

  if (!slug) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 pt-20">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-600 dark:text-gray-400">
          Invalid tour.
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 pt-20 md:pt-24">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-12 flex justify-center items-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#CD000E]" aria-hidden />
        </main>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 pt-20 md:pt-24">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Tour not found or unable to load.</p>
          <Link to="/events" className="mt-4 inline-block text-[#CD000E] hover:underline">
            Browse events
          </Link>
        </main>
      </div>
    );
  }

  const events = tour.events ?? [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-20 md:pt-24">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tour.bannerImage && (
          <div className="aspect-[21/9] rounded-xl overflow-hidden mb-6 bg-gray-200 dark:bg-gray-800">
            <img src={tour.bannerImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 dark:text-white mb-4">
          {tour.name}
        </h1>

        {tour.description && (
          <p className="text-gray-600 dark:text-gray-400 font-body leading-relaxed mb-8 whitespace-pre-wrap">
            {tour.description}
          </p>
        )}

        <section>
          <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-white mb-4">
            Events
          </h2>
          {events.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No events on this tour yet.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {events.map(event => (
                <li key={event.id}>
                  <EventCard
                    eventId={event.id}
                    eventName={event.name}
                    entityName={tour.name}
                    startTime={event.startTime}
                    thumbnail={event.thumbnail}
                    isLive={event.phase === "LIVE"}
                    location={event.location ?? undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
