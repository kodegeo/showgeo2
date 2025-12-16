// src/pages/PublicEntityPage.tsx

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { entitiesService } from "@/services/entities.service";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import type { Entity } from "../../../../packages/shared/types";

export function PublicEntityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, ownedEntity } = useAuth();

  // 1️⃣ Load entity by slug
  const {
    data: entity,
    isLoading,
    error,
  } = useQuery<Entity>({
    queryKey: ["entity", "public", slug],
    enabled: !!slug,
    queryFn: () => entitiesService.getBySlug(slug!),
  });

  // 2️⃣ Load events (we filter client-side by entityId)
  const {
    data: eventsData,
    isLoading: eventsLoading,
  } = useEvents({
    limit: 20,
  });

  const eventsForEntity = entity
  ? (eventsData?.items ?? []).filter(
      (ev: any) => ev.entityId === entity.id
    )
  : [];

  if (isLoading || !entity) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <p className="text-gray-300">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <p className="text-red-400">Failed to load entity.</p>
      </div>
    );
  }

  const socialLinks =
    (entity.socialLinks ?? null) as Record<string, unknown> | null;

  const canEdit = ownedEntity && ownedEntity.id === entity.id;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Banner */}
      <div className="relative h-48 md:h-64 w-full bg-gradient-to-r from-purple-700 to-indigo-700">
        {entity.bannerImage && (
          <img
            src={entity.bannerImage}
            alt={`${entity.name} banner`}
            className="w-full h-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* Header card */}
      <div className="-mt-16 px-4">
        <div className="bg-zinc-900 rounded-2xl shadow-xl p-4 md:p-6 flex flex-col md:flex-row gap-4">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-zinc-900 overflow-hidden bg-zinc-800">
              {entity.thumbnail ? (
                <img
                  src={entity.thumbnail}
                  alt={entity.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-500">
                  {entity.name?.charAt(0) ?? "?"}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {entity.name}
                </h1>
                {entity.isVerified && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-500 text-xs font-semibold text-white">
                    Verified
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-sm text-gray-400 mb-2">
                <span className="px-2 py-0.5 rounded-full border border-zinc-700">
                  {entity.type === "ORGANIZATION" ? "Organization" : "Individual"}
                </span>
                {entity.location && (
                  <span className="px-2 py-0.5 rounded-full border border-zinc-700">
                    {entity.location}
                  </span>
                )}
              </div>

              {entity.bio && (
                <p className="text-gray-300 text-sm md:text-base">
                  {entity.bio}
                </p>
              )}

              {Array.isArray(entity.tags) && entity.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entity.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-gray-300 border border-zinc-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              {entity.website && (
                <a
                  href={entity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm hover:underline"
                >
                  Visit Website
                </a>
              )}

              {canEdit && (
                <Link
                  to={`/entity/${entity.slug}/edit`}
                  className="text-xs md:text-sm px-3 py-1 rounded-full border border-zinc-600 text-gray-100 hover:bg-zinc-800"
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="mt-6 px-4 space-y-6">
        {/* Social Links */}
        {socialLinks && Object.keys(socialLinks).length > 0 && (
          <section className="bg-zinc-900 rounded-2xl p-4 md:p-6">
            <h2 className="text-lg font-semibold text-white mb-3">
              Social Links
            </h2>
            <ul className="flex flex-wrap gap-3">
              {Object.entries(socialLinks).map(([key, value]) => {
                if (!value || typeof value !== "string") return null;
                const href = value.trim();
                if (!href) return null;

                return (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline"
                    >
                      {key.toUpperCase()}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Events */}
        <section className="bg-zinc-900 rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">
              Events
            </h2>
            {eventsLoading && (
              <span className="text-xs text-gray-400">Loading events...</span>
            )}
          </div>

          {eventsForEntity.length === 0 && !eventsLoading && (
            <p className="text-sm text-gray-400">
              No events found for this entity yet.
            </p>
          )}

          {eventsForEntity.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {eventsForEntity.map((ev: any) => (
                <div
                  key={ev.id}
                  className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/60"
                >
                  <h3 className="text-white font-semibold mb-1">
                    {ev.name}
                  </h3>
                  {ev.startTime && (
                    <p className="text-xs text-gray-400 mb-1">
                      {new Date(ev.startTime).toLocaleString()}
                    </p>
                  )}
                  {ev.location && (
                    <p className="text-xs text-gray-400 mb-2">
                      {ev.location}
                    </p>
                  )}
                  {ev.description && (
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {ev.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Placeholder for future tours / merch */}
        <section className="bg-zinc-900 rounded-2xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-white mb-2">
            Tours & Merch
          </h2>
          <p className="text-sm text-gray-400">
            Tours, stores, and merch will appear here once they&apos;re set up.
          </p>
        </section>
      </div>
    </div>
  );
}
