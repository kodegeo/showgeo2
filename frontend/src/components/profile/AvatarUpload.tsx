import React, { useRef, useState, useLayoutEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUploadAsset } from "@/hooks/useAssets";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { AssetType, AssetOwnerType } from "../../../../packages/shared/types";
import { Camera, Loader2 } from "lucide-react";
import {
  PROFILE_IMAGE_ACCEPT,
  canonicalImageUrl,
  withImageCacheBust,
  versionFromProfile,
  validateProfileImageFile,
} from "@/lib/profile-images";

const AvatarUpload: React.FC = () => {
  const { user } = useAuth();
  const uploadAsset = useUploadAsset();
  const updateUser = useUpdateUserProfile();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default avatar (only used as fallback)
  const defaultAvatar = "/assets/defaults/profile-avatar.png";

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!user?.profile?.avatarUrl) {
      setAvatarUrl(null);
      return;
    }
    setAvatarUrl(
      withImageCacheBust(user.profile.avatarUrl, versionFromProfile(user.profile.updatedAt)),
    );
  }, [user?.profile?.avatarUrl, user?.profile?.updatedAt, user?.id]);

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

    const msg = validateProfileImageFile(file, 5 * 1024 * 1024, "Profile photo");
    if (msg) {
      alert(msg);
      return;
    }

    try {
      setIsUploading(true);

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

      const canon = canonicalImageUrl(asset.url);
      setAvatarUrl(withImageCacheBust(canon, Date.now()));

      await updateUser.mutateAsync({
        id: user.id,
        data: { avatarUrl: canon },
      });
    } catch (err) {
      console.error("Avatar upload failed", err);
      alert("Failed to upload avatar. Please try again.");
      if (user?.profile?.avatarUrl) {
        setAvatarUrl(
          withImageCacheBust(user.profile.avatarUrl, versionFromProfile(user.profile.updatedAt)),
        );
      } else {
        setAvatarUrl(null);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const displayAvatarUrl = avatarUrl ?? defaultAvatar;

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
        accept={PROFILE_IMAGE_ACCEPT}
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
