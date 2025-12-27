import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUploadAsset } from "@/hooks/useAssets";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { AssetType, AssetOwnerType } from "../../../../packages/shared/types";
import { Camera, Loader2 } from "lucide-react";

const AvatarUpload: React.FC = () => {
  const { user } = useAuth();
  const uploadAsset = useUploadAsset();
  const updateUser = useUpdateUserProfile();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default avatar (only used as fallback)
  const defaultAvatar = "/assets/defaults/profile-avatar.png";

  // Initialize with user's avatarUrl if available, otherwise null
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.profile?.avatarUrl || null
  );

  // ✅ SYNC WITH AUTH STATE - Update ONLY when user.profile.avatarUrl changes
  // This prevents resetting when other profile fields (like bannerUrl) change
  useEffect(() => {
    if (user?.profile) {
      const profileAvatarUrl = user.profile.avatarUrl;
      // Only update if avatarUrl actually changed (not when bannerUrl or other fields change)
      if (profileAvatarUrl !== avatarUrl) {
        setAvatarUrl(profileAvatarUrl || null);
      }
    } else if (user && !user.profile) {
      // User exists but no profile yet - clear avatar
      setAvatarUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profile?.avatarUrl]); // Only depend on avatarUrl, not entire profile object

  // Early return AFTER all hooks are called
  if (!user) return null;

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // 5MB max as a safety cap
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("Please upload an image smaller than 5MB");
      return;
    }

    try {
      setIsUploading(true);

      // Upload via the shared hook (uses assets.service.ts pattern)
      const asset = await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.USER,
        ownerId: user.id,
        isPublic: true,
        metadata: {
          purpose: "avatar",
        },
      });

      const newAvatarUrl = asset.url;

      // ✅ Immediately update UI (optimistic update)
      setAvatarUrl(newAvatarUrl);

      // Update user profile with new avatar URL
      // useUpdateUserProfile already updates the ["auth", "me"] cache,
      // which will trigger the useEffect to sync avatarUrl
      await updateUser.mutateAsync({
        id: user.id,
        data: { avatarUrl: newAvatarUrl },
      });

      // Note: No need to call refetchUser() here because useUpdateUserProfile
      // already updates the ["auth", "me"] cache, which useAuth reads from.
      // The useEffect will automatically sync avatarUrl when user.profile.avatarUrl changes.
    } catch (err) {
      console.error("Avatar upload failed", err);
      alert("Failed to upload avatar. Please try again.");
      // Revert to previous avatar on error
      setAvatarUrl(user?.profile?.avatarUrl || null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Determine what to display: uploaded avatar, default avatar, or placeholder
  const displayAvatarUrl = avatarUrl || defaultAvatar;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <img
          src={displayAvatarUrl}
          alt="Profile avatar"
          className="h-24 w-24 rounded-full object-cover border border-border shadow-sm"
          onError={(e) => {
            // Fallback to default avatar if uploaded image fails to load
            if (displayAvatarUrl !== defaultAvatar) {
              (e.target as HTMLImageElement).src = defaultAvatar;
            }
          }}
        />
        <button
          type="button"
          onClick={handleClick}
          className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-xs text-muted-foreground">
        Upload a square image (recommended 400×400px).
      </p>
    </div>
  );
};

export default AvatarUpload;
