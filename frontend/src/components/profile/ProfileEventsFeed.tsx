import { useProfileEvents } from "@/hooks/useProfileEvents";
import { ProfileEventCard } from "@/components/profile/ProfileEventCard";

export function ProfileEventsFeed({ entityId }: { entityId?: string }) {
  const { items, isLoading, error } = useProfileEvents(entityId);

  if (isLoading) {
    return <div className="text-white/60">Loading events…</div>;
  }

  if (error) {
    return <div className="text-red-400">Failed to load events</div>;
  }

  if (!items.length) {
    return <div className="text-white/40">No events yet</div>;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Events</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((event) => (
          <ProfileEventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
