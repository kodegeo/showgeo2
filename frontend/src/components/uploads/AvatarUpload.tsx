import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useUploadAsset } from "@/hooks/useAssets";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { AssetType, AssetOwnerType } from "../../../../packages/shared/types";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadComplete: (avatarUrl: string) => void;
  className?: string;
  userId: string;   // ADD THIS
}

export function AvatarUpload({
  currentAvatarUrl,
  onUploadComplete,
  className = "",
  userId,
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentAvatarUrl || null
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAsset = useUploadAsset();
  const updateUser = useUpdateUserProfile();

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate size < 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setError(null);

    // Local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      // Upload via the shared hook (uses assets.service.ts pattern)
      const asset = await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.USER,
        ownerId: userId,
        isPublic: true,
        metadata: { purpose: "avatar" },
      });

      const publicUrl = asset.url;

      // Notify parent
      onUploadComplete(publicUrl);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Could not upload image. Please try again."
      );
      setPreviewUrl(currentAvatarUrl || null);
    }
  };

  const handleRemove = async () => {
    setPreviewUrl(null);

    try {
      await updateUser.mutateAsync({
        id: userId,
        data: {
          avatarUrl: "",
        },
      });
      onUploadComplete("");
    } catch {
      setError("Failed to remove avatar");
    }
  };

  const handleClick = () => fileInputRef.current?.click();

  return (
    <div className={className}>
      <label className="block text-sm font-heading font-semibold text-white mb-2 uppercase text-xs tracking-wider">
        Profile Picture
      </label>

      <div className="flex items-start gap-4">
        <div className="relative">
          <div
            onClick={handleClick}
            className="w-24 h-24 rounded-full border-2 border-gray-700 bg-[#0B0B0B] overflow-hidden cursor-pointer hover:border-[#CD000E] transition-colors flex items-center justify-center group"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                className="w-full h-full object-cover"
                alt="avatar"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#9A9A9A] group-hover:text-[#CD000E]">
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs">Upload</span>
              </div>
            )}

            {uploadAsset.isPending && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#CD000E] animate-spin" />
              </div>
            )}
          </div>

          {previewUrl && !uploadAsset.isPending && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#CD000E] hover:bg-[#860005] text-white flex items-center justify-center transition-colors shadow-lg"
              aria-label="Remove avatar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1">
          <input
            type="file"
            className="hidden"
            accept="image/*"
            ref={fileInputRef}
            disabled={uploadAsset.isPending}
            onChange={handleFileSelect}
          />

          <div className="space-y-2">
            <button
              onClick={handleClick}
              disabled={uploadAsset.isPending}
              className="px-4 py-2 border border-gray-700 hover:border-[#CD000E] text-white text-sm rounded-lg uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {uploadAsset.isPending
                ? "Uploading..."
                : previewUrl
                ? "Change Picture"
                : "Upload Picture"}
            </button>

            <p className="text-xs text-[#9A9A9A]">
              JPG, PNG, GIF • Max 5MB • Recommended 400×400px
            </p>

            {error && (
              <p className="text-xs text-[#CD000E]">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
