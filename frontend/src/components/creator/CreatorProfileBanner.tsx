import { useRef, useState, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useAuth } from "@/hooks/useAuth";
import { useFollowers, useFollowing } from "@/hooks/useFollow";
import { useUploadAsset } from "@/hooks/useAssets";
import { useUpdateEntity } from "@/hooks/useEntities";
import { Edit, Share2, Camera, Loader2 } from "lucide-react";
import { AssetType, AssetOwnerType } from "../../../../packages/shared/types";
import {
  PROFILE_IMAGE_ACCEPT,
  canonicalImageUrl,
  withImageCacheBust,
  versionFromProfile,
  validateProfileImageFile,
} from "@/lib/profile-images";
import { profileMediaEditBtnClass } from "@/lib/profile-media-controls";

const defaultEntityBanner = "/assets/defaults/entity-banner.png";
const defaultEntityAvatar = "/assets/defaults/entity-avatar.png";

interface CreatorProfileBannerProps {
  onEditClick?: () => void;
  onShareClick?: () => void;
}

export function CreatorProfileBanner({
  onEditClick,
  onShareClick,
}: CreatorProfileBannerProps) {
  const location = useLocation();
  const { currentEntity, setCurrentEntity } = useEntityContext();
  const { user } = useAuth();
  const uploadAsset = useUploadAsset();
  const updateEntity = useUpdateEntity();

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const isStudioShell = location.pathname.startsWith("/studio");
  const canEditBranding =
    isStudioShell && !!user?.id && !!currentEntity && currentEntity.ownerId === user.id;

  const { data: followersData } = useFollowers(currentEntity?.id || "", 1, 1);
  const { data: followingData } = useFollowing(user?.id || "", 1, 1);

  const followerCount = followersData?.meta?.total || 0;
  const followingCount = followingData?.meta?.total || 0;

  const [bannerSrc, setBannerSrc] = useState<string | undefined>(undefined);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | undefined>(undefined);
  const [uploadSlot, setUploadSlot] = useState<null | "banner" | "thumbnail">(null);

  useLayoutEffect(() => {
    if (!currentEntity) {
      setBannerSrc(undefined);
      setThumbnailSrc(undefined);
      return;
    }
    if (currentEntity.bannerImage) {
      setBannerSrc(
        withImageCacheBust(currentEntity.bannerImage, versionFromProfile(currentEntity.updatedAt)),
      );
    } else {
      setBannerSrc(undefined);
    }
    if (currentEntity.thumbnail) {
      setThumbnailSrc(
        withImageCacheBust(currentEntity.thumbnail, versionFromProfile(currentEntity.updatedAt)),
      );
    } else {
      setThumbnailSrc(undefined);
    }
  }, [
    currentEntity?.id,
    currentEntity?.bannerImage,
    currentEntity?.thumbnail,
    currentEntity?.updatedAt,
  ]);

  if (!currentEntity) {
    return null;
  }

  const anyImageUploading = uploadSlot !== null;

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEntity) return;

    const msg = validateProfileImageFile(file, 10 * 1024 * 1024, "Banner");
    if (msg) {
      toast.error(msg);
      e.target.value = "";
      return;
    }

    setUploadSlot("banner");
    try {
      const asset = await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.ENTITY,
        ownerId: currentEntity.id,
        isPublic: true,
        metadata: { purpose: "creator-banner" },
      });
      const canon = canonicalImageUrl(asset.url);
      setBannerSrc(withImageCacheBust(canon, Date.now()));
      const updated = await updateEntity.mutateAsync({
        id: currentEntity.id,
        data: { bannerImage: canon },
      });
      setCurrentEntity(updated);
      toast.success("Banner updated");
    } catch (err) {
      console.error("Banner upload failed:", err);
      toast.error("Banner upload failed. Try again.");
    } finally {
      setUploadSlot(null);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEntity) return;

    const msg = validateProfileImageFile(file, 5 * 1024 * 1024, "Profile photo");
    if (msg) {
      toast.error(msg);
      e.target.value = "";
      return;
    }

    setUploadSlot("thumbnail");
    try {
      const asset = await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.ENTITY,
        ownerId: currentEntity.id,
        isPublic: true,
        metadata: { purpose: "creator-thumbnail" },
      });
      const canon = canonicalImageUrl(asset.url);
      setThumbnailSrc(withImageCacheBust(canon, Date.now()));
      const updated = await updateEntity.mutateAsync({
        id: currentEntity.id,
        data: { thumbnail: canon },
      });
      setCurrentEntity(updated);
      toast.success("Profile photo updated");
    } catch (err) {
      console.error("Thumbnail upload failed:", err);
      toast.error("Profile photo upload failed. Try again.");
    } finally {
      setUploadSlot(null);
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative w-full bg-[#0B0B0B] border-b border-gray-800">
      <div className="relative h-48 md:h-64 overflow-hidden bg-gradient-to-r from-[#CD000E] to-[#860005]">
        {bannerSrc ? (
          <img
            src={bannerSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(ev) => {
              (ev.target as HTMLImageElement).src = defaultEntityBanner;
            }}
          />
        ) : (
          <img
            src={defaultEntityBanner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(ev) => {
              (ev.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/70 to-transparent" />
        {!bannerSrc && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#CD000E]/90 via-[#860005]/90 to-[#0B0B0B]/90" />
        )}

        {canEditBranding ? (
          <>
            <input
              ref={bannerInputRef}
              type="file"
              accept={PROFILE_IMAGE_ACCEPT}
              className="hidden"
              onChange={handleBannerChange}
              disabled={anyImageUploading}
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={anyImageUploading}
              title="Change banner"
              aria-label="Change banner"
              className={`${profileMediaEditBtnClass} absolute top-4 right-4 z-20 sm:top-5 sm:right-5 md:top-6 md:right-6`}
            >
              {uploadSlot === "banner" ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
              ) : (
                <Camera className="h-[18px] w-[18px]" aria-hidden />
              )}
            </button>
          </>
        ) : null}
      </div>

      <div className="relative px-4 pb-6 sm:px-6 lg:px-8">
        <div className="-mt-16 flex flex-col gap-4 md:-mt-20 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative h-24 w-24 shrink-0 md:h-32 md:w-32">
              <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-[#0B0B0B] bg-[#0B0B0B]">
                {thumbnailSrc ? (
                  <img
                    src={thumbnailSrc}
                    alt={currentEntity.name}
                    className="h-full w-full object-cover"
                    onError={(ev) => {
                      (ev.target as HTMLImageElement).src = defaultEntityAvatar;
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#CD000E] to-[#860005] font-heading text-2xl font-bold text-white">
                    {currentEntity.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {currentEntity.isVerified ? (
                <div className="absolute right-0.5 top-0.5 z-[5] flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0B0B0B] bg-[#CD000E]">
                  <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ) : null}
              {canEditBranding ? (
                <>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept={PROFILE_IMAGE_ACCEPT}
                    className="hidden"
                    onChange={handleThumbnailChange}
                    disabled={anyImageUploading}
                  />
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={anyImageUploading}
                    title="Change profile photo"
                    aria-label="Change profile photo"
                    className={`${profileMediaEditBtnClass} absolute bottom-1 right-1 z-10 md:bottom-1.5 md:right-1.5`}
                  >
                    {uploadSlot === "thumbnail" ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
                    ) : (
                      <Camera className="h-[18px] w-[18px]" aria-hidden />
                    )}
                  </button>
                </>
              ) : null}
            </div>

            <div className="pb-2">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-bold uppercase tracking-tighter text-white md:text-3xl">
                  {currentEntity.name}
                </h1>
                {isStudioShell ? (
                  <span className="rounded-full border border-[#CD000E]/50 bg-[#CD000E]/20 px-3 py-1 font-heading text-xs font-semibold uppercase tracking-wider text-[#CD000E]">
                    Creator
                  </span>
                ) : null}
              </div>
              {currentEntity.bio ? (
                <p className="line-clamp-2 max-w-2xl font-body text-sm text-[#9A9A9A]">
                  {currentEntity.bio}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 md:flex-row md:items-end">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="font-heading text-2xl font-bold text-white">
                  {followerCount.toLocaleString()}
                </div>
                <div className="font-body text-xs uppercase tracking-wider text-[#9A9A9A]">
                  Followers
                </div>
              </div>
              <div className="text-center">
                <div className="font-heading text-2xl font-bold text-white">
                  {followingCount.toLocaleString()}
                </div>
                <div className="font-body text-xs uppercase tracking-wider text-[#9A9A9A]">
                  Following
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onEditClick}
                className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 font-heading text-sm font-semibold uppercase tracking-wider text-white transition-all duration-300 hover:border-[#CD000E]"
              >
                <Edit className="h-4 w-4" />
                Edit Page
              </button>
              <button
                type="button"
                onClick={onShareClick}
                className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 font-heading text-sm font-semibold uppercase tracking-wider text-white transition-all duration-300 hover:border-[#CD000E]"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
