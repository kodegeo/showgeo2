// src/pages/EntityEditPage.tsx

import { useEffect, useState, FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { entitiesService } from "@/services/entities.service";
import type { Entity } from "../../../../packages/shared/types";

interface FormState {
  name: string;
  bio: string;
  tagsInput: string; // comma-separated
  thumbnail: string;
  bannerImage: string;
  location: string;
  website: string;
  isPublic: boolean;
  socialLinks: {
    twitter: string;
    instagram: string;
    facebook: string;
    youtube: string;
    tiktok: string;
  };
}

export function EntityEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1️⃣ Load entity by slug
  const {
    data: entity,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["entity", "edit", slug],
    enabled: !!slug,
    queryFn: () => entitiesService.getBySlug(slug!),
  });

  const [form, setForm] = useState<FormState | null>(null);

  // 2️⃣ Initialize form when entity loads
  useEffect(() => {
    if (!entity) return;

    const social = (entity.socialLinks ?? {}) as Record<string, string>;

    setForm({
      name: entity.name ?? "",
      bio: entity.bio ?? "",
      tagsInput: Array.isArray(entity.tags) ? entity.tags.join(", ") : "",
      thumbnail: entity.thumbnail ?? "",
      bannerImage: entity.bannerImage ?? "",
      location: entity.location ?? "",
      website: entity.website ?? "",
      isPublic: entity.isPublic ?? true,
      socialLinks: {
        twitter: social.twitter ?? "",
        instagram: social.instagram ?? "",
        facebook: social.facebook ?? "",
        youtube: social.youtube ?? "",
        tiktok: social.tiktok ?? "",
      },
    });
  }, [entity]);

  // 3️⃣ Update mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!entity) throw new Error("No entity loaded");
      return entitiesService.update(entity.id, payload);
    },
    onSuccess: (updated: Entity) => {
      // Invalidate cache and redirect to public entity page
      queryClient.invalidateQueries({ queryKey: ["entity", "edit", slug] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      navigate(`/entity/${updated.slug}`, { replace: true });
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!form) return;
  
    const target = e.target;
  
    // Checkbox path (only valid for inputs)
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setForm({ ...form, [target.name]: target.checked });
      return;
    }
  
    // All other inputs + textareas
    setForm({ ...form, [target.name]: target.value });
  };
  
  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!form) return;
    const { name, value } = e.target;

    setForm({
      ...form,
      socialLinks: {
        ...form.socialLinks,
        [name]: value,
      },
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Build tags array
    const tags = form.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Build social links payload (only non-empty values)
    const socialEntries = Object.entries(form.socialLinks).filter(
      ([, value]) => value && value.trim().length > 0
    );
    const socialLinks =
      socialEntries.length > 0
        ? Object.fromEntries(socialEntries)
        : undefined;

    const payload = {
      name: form.name,
      bio: form.bio || undefined,
      tags: tags.length > 0 ? tags : undefined,
      thumbnail: form.thumbnail || undefined,
      bannerImage: form.bannerImage || undefined,
      location: form.location || undefined,
      website: form.website || undefined,
      socialLinks,
      isPublic: form.isPublic,
    };

    updateMutation.mutate(payload);
  };

  if (isLoading || !form) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <p className="text-gray-300">Loading entity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <p className="text-red-400">Failed to load entity.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Edit Entity Profile</h1>
        {entity && (
          <Link
            to={`/entity/${entity.slug}`}
            className="text-sm text-blue-400 hover:underline"
          >
            View Public Page
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Basic Info</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Tags (comma-separated)
            </label>
            <input
              name="tagsInput"
              value={form.tagsInput}
              onChange={handleChange}
              placeholder="musician, live, hip-hop"
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            />
          </div>
        </section>

        {/* Media */}
        <section className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Branding & Media</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Thumbnail URL
            </label>
            <input
              name="thumbnail"
              value={form.thumbnail}
              onChange={handleChange}
              placeholder="/assets/entity-thumbnail.png"
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Banner Image URL
            </label>
            <input
              name="bannerImage"
              value={form.bannerImage}
              onChange={handleChange}
              placeholder="/assets/entity-banner.png"
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            />
          </div>
        </section>

        {/* Location & Website */}
        <section className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Location & Website
          </h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Denver, CO"
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Website</label>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://example.com"
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
            />
          </div>

          <label className="inline-flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              name="isPublic"
              checked={form.isPublic}
              onChange={handleChange}
              className="rounded border-zinc-600 bg-zinc-800"
            />
            <span className="text-sm text-gray-300">
              Make profile public
            </span>
          </label>
        </section>

        {/* Social Links */}
        <section className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Social Links</h2>

          {(["twitter", "instagram", "facebook", "youtube", "tiktok"] as const).map(
            (key) => (
              <div key={key}>
                <label className="block text-sm text-gray-400 mb-1 capitalize">
                  {key}
                </label>
                <input
                  name={key}
                  value={form.socialLinks[key]}
                  onChange={handleSocialChange}
                  placeholder={`https://${key}.com/your-handle`}
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white"
                />
              </div>
            )
          )}
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {entity && (
            <Link
              to={`/entity/${entity.slug}`}
              className="px-4 py-2 rounded-md border border-zinc-600 text-gray-200 hover:bg-zinc-800 transition"
            >
              Cancel
            </Link>
          )}
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {updateMutation.error && (
          <p className="text-sm text-red-400 mt-2">
            Failed to save changes. Please try again.
          </p>
        )}
      </form>
    </div>
  );
}
