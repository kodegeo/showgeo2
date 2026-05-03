import { useNavigate } from "react-router-dom";
import { useEvents } from "@/hooks/useEvents";
import { useFollowers } from "@/hooks/useFollow";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useStoreByEntity } from "@/hooks/useStore";
import { Users, Activity as ActivityIcon } from "lucide-react";

export function CreatorCommunityPage() {
  const navigate = useNavigate();
  const { currentEntity } = useEntityContext();
  const entityId = currentEntity?.id ?? "";

  const { data: eventsData, isLoading: eventsLoading } = useEvents(
    { entityId: entityId || undefined, limit: 10 },
    { enabled: !!entityId },
  );

  const { data: followersData } = useFollowers(entityId, 1, 1);
  const { data: storeData } = useStoreByEntity(entityId);

  const followerCount = followersData?.meta?.total ?? 0;
  const eventsTotal = eventsData?.meta?.total ?? eventsData?.data?.length ?? 0;
  const hasStore = Boolean(storeData);

  if (!currentEntity) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-gray-800 bg-[#0B0B0B]">
        <div className="text-center">
          <p className="mb-4 font-body text-[#9A9A9A]">No creator profile found.</p>
          <button
            type="button"
            onClick={() => navigate("/studio/overview")}
            className="rounded-lg bg-[#CD000E] px-6 py-2 font-heading font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#860005]"
          >
            Back to Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-white">
      <header>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-tighter text-white md:text-4xl">
          Community
        </h1>
        <p className="mt-2 max-w-2xl font-body text-sm text-[#9A9A9A]">
          Audience activity and engagement for {currentEntity.name}.
        </p>
      </header>

      <section className="rounded-lg border border-gray-800 bg-[#0B0B0B]/80 p-6">
        <div className="mb-4 flex items-center gap-2">
          <ActivityIcon className="h-5 w-5 text-[#CD000E]" />
          <h2 className="font-heading text-xl font-bold uppercase tracking-tighter text-white">
            Activity
          </h2>
        </div>
        <p className="font-body text-sm leading-relaxed text-[#9A9A9A]">
          Recent audience actions, engagement spikes, and community moments will appear here. This
          section is a placeholder while analytics and realtime feeds are connected.
        </p>
      </section>

      <section className="rounded-lg border border-gray-800 bg-[#0B0B0B]/80 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#CD000E]" />
          <h2 className="font-heading text-xl font-bold uppercase tracking-tighter text-white">
            Audience
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-800 bg-black/40 p-4 text-center">
            <p className="font-heading text-2xl font-bold text-white">{followerCount.toLocaleString()}</p>
            <p className="mt-1 font-body text-xs uppercase tracking-wider text-[#9A9A9A]">Followers</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-black/40 p-4 text-center">
            <p className="font-heading text-2xl font-bold text-white">
              {eventsLoading ? "—" : eventsTotal.toLocaleString()}
            </p>
            <p className="mt-1 font-body text-xs uppercase tracking-wider text-[#9A9A9A]">Events</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-black/40 p-4 text-center">
            <p className="font-heading text-2xl font-bold text-white">{hasStore ? "Yes" : "—"}</p>
            <p className="mt-1 font-body text-xs uppercase tracking-wider text-[#9A9A9A]">Store</p>
          </div>
        </div>
        <p className="mt-4 font-body text-xs text-[#9A9A9A]">
          Totals come from list APIs where available. Deeper engagement metrics can replace this
          section later.
        </p>
      </section>
    </div>
  );
}
