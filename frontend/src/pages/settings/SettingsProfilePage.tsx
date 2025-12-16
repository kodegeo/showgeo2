import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { AvatarUpload } from "@/components/uploads/AvatarUpload";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { toast } from "react-toastify";

export function SettingsProfilePage() {
  const { user, refetchUser } = useAuth();
  const updateProfile = useUpdateUserProfile();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    location: "",
    website: "",
  });

  // Populate form when user loads
  useEffect(() => {
    if (!user) return;

    setForm({
      firstName: user.profile?.firstName ?? "",
      lastName: user.profile?.lastName ?? "",
      bio: user.profile?.bio ?? "",
      location: user.profile?.location ?? "",
      website: user.profile?.website ?? "",
    });
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-heading text-white">Profile Settings</h1>
        <p className="text-gray-400">Loading your profile…</p>
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateProfile.mutateAsync({
        id: user.id,
        data: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          bio: form.bio.trim(),
          location: form.location.trim(),
          website: form.website.trim(),
        },
      });

      await refetchUser();
      toast.success("Profile updated");

      navigate("/profile");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile. Please try again.");
    }
  };

  const isSaving = updateProfile.isPending;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-heading text-white">Profile Settings</h1>
        <p className="text-gray-400">Update your personal profile details.</p>
      </div>

      {/* Banner + Avatar */}
      <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="relative">
          <ProfileBanner />
          <div className="absolute -bottom-12 left-6">
            <AvatarUpload
              userId={user.id}
              onUploadComplete={async () => {
                await refetchUser();
              }}
            />
          </div>
        </div>
        <div className="h-16" />
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg shadow-lg p-6 md:p-8 space-y-6"
      >
        {/* Email — read-only */}
        <div>
          <label className="block text-sm text-gray-200 mb-1">Email</label>
          <input
            type="text"
            value={user.email}
            disabled
            className="w-full rounded-md bg-black/50 border border-gray-700 px-3 py-2 text-sm text-gray-400"
          />
        </div>

        {/* Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-200 mb-1">First Name</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-1">Last Name</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm text-gray-200 mb-1">Bio</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
          />
        </div>

        {/* Location + Website */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-200 mb-1">Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-1">Website</label>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://your-site.com"
              className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            These updates apply to your personal profile only.
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
