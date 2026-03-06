// src/pages/creators/PublicCreatorProfilePage.tsx – single canonical public creator profile

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { entitiesService } from "@/services/entities.service";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, MapPin, Globe, ExternalLink } from "lucide-react";
import { PublicEventCard } from "@/components/events/PublicEventCard";
import type { Entity } from "../../../../packages/shared/types";

export function PublicCreatorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { ownedEntity } = useAuth();

  const {
    data: entity,
    isLoading,
    error,
  } = useQuery<Entity>({
    queryKey: ["entity", "public", slug],
    enabled: !!slug,
    queryFn: () => entitiesService.getBySlug(slug!),
  });

  const {
    data: eventsData,
    isLoading: eventsLoading,
  } = useEvents({
    limit: 20,
  });

  const eventsForEntity = entity
    ? (eventsData?.data ?? []).filter((ev: any) => ev.entityId === entity.id)
    : [];

  if (isLoading || !entity) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-5xl mx-auto py-10 px-4">
          <p className="text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-5xl mx-auto py-10 px-4">
          <p className="text-red-400">Failed to load entity.</p>
        </div>
      </div>
    );
  }

  const socialLinks =
    (entity.socialLinks ?? null) as Record<string, unknown> | null;

  const canEdit = ownedEntity && ownedEntity.id === entity.id;

  return (
    <div className="min-h-screen bg-black">
      <div className="relative w-full">
        <div className="relative h-64 md:h-80 w-full overflow-hidden">
          {entity.bannerImage ? (
            <img
              src={entity.bannerImage}
              alt={`${entity.name} banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-end gap-4 md:gap-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black shadow-2xl overflow-hidden bg-zinc-800 ring-2 ring-white/10">
                  {entity.thumbnail ? (
                    <img
                      src={entity.thumbnail}
                      alt={entity.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl md:text-5xl font-bold text-zinc-500">
                      {entity.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                    {entity.name}
                  </h1>
                  {entity.isVerified && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sky-500 text-xs font-semibold text-white shadow-lg">
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm text-white/90 border border-white/20">
                    {entity.type === "ORGANIZATION" ? "Organization" : "Individual"}
                  </span>
                  {entity.location && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm text-white/90 border border-white/20">
                      <MapPin className="w-3.5 h-3.5" />
                      {entity.location}
                    </span>
                  )}
                </div>

                {Array.isArray(entity.tags) && entity.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {entity.tags.slice(0, 5).map((tag: string) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/80 border border-white/20"
                      >
                        #{tag}
                      </span>
                    ))}
                    {entity.tags.length > 5 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/60 border border-white/20">
                        +{entity.tags.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <section className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-zinc-800/50">
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
            About
          </h2>
          {entity.bio ? (
            <p className="text-gray-300 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
              {entity.bio}
            </p>
          ) : (
            <p className="text-gray-400 text-base md:text-lg leading-relaxed italic">
              This creator hasn&apos;t added a bio yet. Check back soon for updates.
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-zinc-800/50 flex flex-wrap gap-6">
            {entity.website && (
              <a
                href={entity.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span>Website</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {canEdit && (
              <Link
                to="/studio/edit"
                className="inline-flex items-center gap-2 text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                Edit Profile
              </Link>
            )}
          </div>
        </section>

        {socialLinks && Object.keys(socialLinks).length > 0 && (
          <section className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-zinc-800/50">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              Connect
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(socialLinks).map(([key, value]) => {
                if (!value || typeof value !== "string") return null;
                const href = value.trim();
                if (!href) return null;

                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-sm text-blue-400 hover:text-blue-300 border border-zinc-700/50 transition-colors"
                  >
                    <span className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <section className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Events
            </h2>
            {eventsLoading && (
              <span className="text-xs text-gray-400">Loading...</span>
            )}
          </div>

          {eventsForEntity.length === 0 && !eventsLoading && (
            <div className="text-center py-12 md:py-16">
              <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-gray-400 text-base md:text-lg">
                No events scheduled at this time.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Check back soon for upcoming events and live streams.
              </p>
            </div>
          )}

          {eventsForEntity.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {eventsForEntity.map((ev: any) => (
                <PublicEventCard
                  key={ev.id}
                  event={ev}
                  creatorSlug={entity.slug}
                  creatorId={entity.id}
                  creatorName={entity.name}
                  creatorThumbnail={entity.thumbnail}
                />
              ))}
            </div>
          )}
        </section>

        <section className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-zinc-800/50">
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
            Tours & Merch
          </h2>
          <div className="text-center py-8 md:py-12">
            <p className="text-gray-400 text-base md:text-lg mb-2">
              Tours, merchandise, and exclusive content coming soon.
            </p>
            <p className="text-gray-500 text-sm">
              Stay tuned for updates on upcoming tours and store launches.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
