import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { streamingService, type StreamingSession } from "@/services";
import { EventCard } from "./EventCard";
import { DiscoverySection, SkeletonRow } from "@/components/discovery";

/** Session with event + entity populated (GET /streaming/active returns this shape) */
type ActiveSession = StreamingSession & {
  event?: { id: string; name: string; thumbnail?: string | null } | null;
  entity?: { id: string; name: string; slug?: string; thumbnail?: string | null } | null;
};

const CONTAINER_CLASS = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";
const SCROLL_ROW_CLASS =
  "flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1 snap-x snap-mandatory min-h-[200px] touch-pan-x";

export function LiveNowSection() {
  const {
    data: sessions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["streaming", "active"],
    queryFn: async (): Promise<ActiveSession[]> => {
      const list = await streamingService.getActiveSessions();
      return list as ActiveSession[];
    },
  });

  const list = sessions ?? [];
  const hasSessions = list.length > 0;
  const showPlaceholder = isLoading || error || !hasSessions;

  return (
    <section className="py-10 lg:py-14 bg-gray-50 dark:bg-gray-800/50">
      <div className={CONTAINER_CLASS}>
        <DiscoverySection
          title="Live Now"
          icon={<Radio className="w-6 h-6 text-[#CD000E]" aria-hidden />}
          isEmpty={showPlaceholder}
          emptyMessage={
            !isLoading && !error && !hasSessions
              ? "Live streams coming soon. Check back or browse upcoming events."
              : undefined
          }
          emptySkeleton={<SkeletonRow variant="event" count={4} />}
        >
          {list.map(session => (
            <div key={session.id} className="shrink-0 w-72 snap-start">
              <EventCard
                eventId={session.eventId}
                eventName={session.event?.name ?? "Live Event"}
                entityName={session.entity?.name ?? "Creator"}
                startTime={undefined}
                thumbnail={session.event?.thumbnail ?? null}
                isLive={true}
                viewerCount={typeof session.viewers === "number" ? session.viewers : undefined}
              />
            </div>
          ))}
        </DiscoverySection>
      </div>
    </section>
  );
}
