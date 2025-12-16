import React, { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUploadAsset } from "@/hooks/useAssets";
import { AssetType, AssetOwnerType } from "../../../../packages/shared/types";
import { Camera, Loader2 } from "lucide-react";

const AvatarUpload: React.FC = () => {
  const { user, refetchUser } = useAuth();
  const uploadAsset = useUploadAsset();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) return null;

  // Fallback avatar if none set
  const avatarUrl =
    (user as any)?.user_profiles?.avatarUrl ||
    "/assets/defaults/profile-avatar.png";

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

      await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.USER,
        ownerId: user.id,
        metadata: {
          purpose: "avatar",
        },
      } as any);

      // Backend already updates avatar on profile;
      // this just refreshes the auth user.
      await refetchUser?.();
    } catch (err) {
      console.error("Avatar upload failed", err);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <img
          src={avatarUrl}
          alt="Profile avatar"
          className="h-24 w-24 rounded-full object-cover border border-border shadow-sm"
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
