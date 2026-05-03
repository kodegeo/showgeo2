import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation/Navigation";
import { Footer } from "@/components/Footer";
import { clipsService } from "@/services/clips.service";
import { eventsService } from "@/services/events.service";
import { entitiesService } from "@/services/entities.service";
import {
  DiscoverySection,
  EventCard,
  ClipCard,
  CreatorCard,
  SkeletonRow,
} from "@/components/discovery";
import type { ProfileEvent } from "@/types/event.types";

const CONTAINER_CLASS = "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8";
const SECTION_CLASS = "py-10 lg:py-14";

export function DiscoverPage() {
  const { data: clips = [], isLoading: clipsLoading } = useQuery({
    queryKey: ["clips", "trending"],
    queryFn: () => clipsService.getTrendingClips(),
  });
  const clipsList = Array.isArray(clips) ? clips : [];

  const { data: popularData } = useQuery({
    queryKey: ["entities", "popular"],
    queryFn: () => entitiesService.getPopular(),
  });
  const creators = popularData?.data ?? [];

  const { data: upcomingData, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: () => eventsService.getUpcoming(),
  });
  const events: ProfileEvent[] = upcomingData?.data ?? [];

  const showClipsPlaceholder = clipsLoading || clipsList.length === 0;
  const showCreatorsPlaceholder = creators.length === 0;
  const showEventsPlaceholder = eventsLoading || events.length === 0;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white pt-20 md:pt-24">
      <Navigation />
      <div className={CONTAINER_CLASS}>
        <header className="pt-8 pb-6">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white uppercase tracking-tight">
            Discover
          </h1>
          <p className="text-white/60 mt-1">
            Trending clips, popular creators, and upcoming events.
          </p>
        </header>

        {/* Vertical discovery feed: sections stack vertically, each section scrolls horizontally */}
        <section className={`${SECTION_CLASS} border-b border-gray-800/50`}>
          <DiscoverySection
            title="Trending Clips"
            isEmpty={showClipsPlaceholder}
            emptyMessage="Trending clips coming soon."
            emptySkeleton={<SkeletonRow variant="clip" count={4} />}
            dark
          >
            {clipsList.map(clip => (
              <ClipCard
                key={clip.id}
                id={clip.id}
                videoUrl={clip.videoUrl}
                creatorName={clip.creatorName}
                eventName={clip.eventName}
                views={clip.views}
                dark
              />
            ))}
          </DiscoverySection>
        </section>

        <section className={`${SECTION_CLASS} border-b border-gray-800/50`}>
          <DiscoverySection
            title="Popular Creators"
            isEmpty={showCreatorsPlaceholder}
            emptyMessage="Popular creators coming soon."
            emptySkeleton={<SkeletonRow variant="creator" count={6} />}
            dark
          >
            {creators.map(
              (c: { id: string; name: string; slug: string; thumbnail?: string | null }) => (
                <CreatorCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  slug={c.slug}
                  thumbnail={c.thumbnail}
                  dark
                />
              ),
            )}
          </DiscoverySection>
        </section>

        <section className={SECTION_CLASS}>
          <DiscoverySection
            title="Upcoming Events"
            isEmpty={showEventsPlaceholder}
            emptyMessage="Upcoming events coming soon."
            emptySkeleton={<SkeletonRow variant="event" count={4} />}
            dark
          >
            {events.map(ev => (
              <div key={ev.id} className="shrink-0 w-72 snap-start min-h-[200px]">
                <EventCard
                  eventId={ev.id}
                  eventName={ev.name}
                  entityName={ev.entity?.name ?? "Creator"}
                  startTime={ev.startTime}
                  thumbnail={ev.thumbnail}
                  isLive={false}
                  viewEventHref={`/events/${ev.id}`}
                />
              </div>
            ))}
          </DiscoverySection>
        </section>
      </div>
      <Footer />
    </div>
  );
}
