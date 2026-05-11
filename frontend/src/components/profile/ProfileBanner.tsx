import { useRef, useState, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { useUploadAsset } from "@/hooks/useAssets";
import { useFollowers, useFollowing } from "@/hooks/useFollow";
import { useUserEntities } from "@/hooks/useUsers";
import { isCreator } from "@/utils/creator";
import type { User } from "../../../../packages/shared/types";
import { AssetType, AssetOwnerType, UserRole } from "../../../../packages/shared/types";
import { Camera, Loader2, Pencil, Ticket, ShoppingBag, Bookmark, Settings, Sparkles, UserPlus } from "lucide-react";
import {
  PROFILE_IMAGE_ACCEPT,
  canonicalImageUrl,
  withImageCacheBust,
  versionFromProfile,
  validateProfileImageFile,
} from "@/lib/profile-images";
import { profileMediaEditBtnClass } from "@/lib/profile-media-controls";

const defaultBanner = "/assets/defaults/profile-banner.png";
const defaultAvatar = "/assets/defaults/profile-picture.png";

function primaryRoleBadge(user: User): string {
  if (user.role === UserRole.ADMIN) return "ADMIN";
  if (user.isEntity || user.role === UserRole.ENTITY) return "CREATOR";
  return "USER";
}

const actionBtnClass =
  "inline-flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-[#E10600] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 text-xs sm:text-sm";

export function ProfileBanner() {
  const { user, ownedEntity } = useAuth();
  const updateUser = useUpdateUserProfile();
  const uploadAsset = useUploadAsset();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: entitiesData } = useUserEntities(user?.id ?? null);
  const hasEntities =
    !!entitiesData &&
    ((entitiesData.owned?.length ?? 0) > 0 || (entitiesData.managed?.length ?? 0) > 0);
  const userIsCreator = isCreator(user, hasEntities);

  const entityIdForFollowers =
    (ownedEntity as { id?: string } | null | undefined)?.id ?? "";
  const { data: followersData } = useFollowers(entityIdForFollowers, 1, 1);
  const { data: followingData } = useFollowing(user?.id ?? "", 1, 1);

  const followerCount = followersData?.meta?.total ?? 0;
  const followingCount = followingData?.meta?.total ?? 0;

  const [bannerSrc, setBannerSrc] = useState<string | undefined>(undefined);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);
  const [uploadSlot, setUploadSlot] = useState<null | "banner" | "avatar">(null);

  useLayoutEffect(() => {
    if (!user?.profile) {
      setBannerSrc(undefined);
      setAvatarSrc(undefined);
      return;
    }
    const p = user.profile;
    if (p.bannerUrl) {
      setBannerSrc(withImageCacheBust(p.bannerUrl, versionFromProfile(p.updatedAt)));
    } else {
      setBannerSrc(undefined);
    }
    if (p.avatarUrl) {
      setAvatarSrc(withImageCacheBust(p.avatarUrl, versionFromProfile(p.updatedAt)));
    } else {
      setAvatarSrc(undefined);
    }
  }, [user?.profile?.bannerUrl, user?.profile?.avatarUrl, user?.profile?.updatedAt, user?.id]);

  if (!user) return null;

  const displayName =
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim() ||
    user.profile?.username ||
    user.email?.split("@")[0] ||
    "Member";

  const bio = user.profile?.bio;
  const roleBadge = primaryRoleBadge(user);

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
        ownerType: AssetOwnerType.USER,
        ownerId: user.id,
        isPublic: true,
        metadata: { purpose: "banner" },
      });

      const canon = canonicalImageUrl(asset.url);
      setBannerSrc(withImageCacheBust(canon, Date.now()));
      await updateUser.mutateAsync({
        id: user.id,
        data: { bannerUrl: canon },
      });
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const msg = validateProfileImageFile(file, 5 * 1024 * 1024, "Profile photo");
    if (msg) {
      toast.error(msg);
      e.target.value = "";
      return;
    }

    setUploadSlot("avatar");
    try {
      const asset = await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.USER,
        ownerId: user.id,
        isPublic: true,
        metadata: {
          purpose: "avatar",
          uploadedAt: new Date().toISOString(),
        },
      });
      const canon = canonicalImageUrl(asset.url);
      setAvatarSrc(withImageCacheBust(canon, Date.now()));
      await updateUser.mutateAsync({
        id: user.id,
        data: { avatarUrl: canon },
      });
      toast.success("Profile photo updated");
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      toast.error("Profile photo upload failed. Try again.");
    } finally {
      setUploadSlot(null);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const anyImageUploading = uploadSlot !== null;

  return (
    <div className="relative w-full bg-[#0B0B0B] border-b border-gray-800">
      <div className="relative h-48 md:h-64 w-full overflow-hidden bg-gradient-to-r from-[#E10600] to-[#860005]">
        {bannerSrc ? (
          <img
            src={bannerSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(ev) => {
              console.warn("Banner image failed to load, falling back to default");
              (ev.target as HTMLImageElement).src = defaultBanner;
            }}
          />
        ) : (
          <img
            src={defaultBanner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(ev) => {
              (ev.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/70 to-transparent pointer-events-none" />
        {!bannerSrc && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#E10600]/40 via-transparent to-[#0B0B0B]/60 pointer-events-none" />
        )}

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
      </div>

      <input
        ref={bannerInputRef}
        type="file"
        accept={PROFILE_IMAGE_ACCEPT}
        className="hidden"
        onChange={handleBannerChange}
        disabled={anyImageUploading}
      />

      <div className="relative px-4 sm:px-6 lg:px-8 pb-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between -mt-20">
          <div className="flex flex-col gap-4 min-w-0 md:flex-row md:items-end md:gap-4">
            <div className="relative h-24 w-24 shrink-0 md:h-32 md:w-32">
              <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-[#0B0B0B] bg-[#0B0B0B] shadow-xl">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(ev) => {
                      (ev.target as HTMLImageElement).src = defaultAvatar;
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E10600] to-[#860005] font-heading text-2xl font-bold text-white md:text-3xl">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={anyImageUploading}
                title="Change profile photo"
                aria-label="Change profile photo"
                className={`${profileMediaEditBtnClass} absolute bottom-1 right-1 z-10 md:bottom-1.5 md:right-1.5`}
              >
                {uploadSlot === "avatar" ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
                ) : (
                  <Camera className="h-[18px] w-[18px]" aria-hidden />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept={PROFILE_IMAGE_ACCEPT}
                className="hidden"
                onChange={handleAvatarChange}
                disabled={anyImageUploading}
              />
            </div>

            <div className="min-w-0 flex-1 pb-2 text-left">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="max-w-[min(100%,28rem)] truncate font-heading text-2xl font-bold uppercase tracking-tighter text-white md:text-3xl">
                  {displayName}
                </h1>
                <span className="shrink-0 rounded-full border border-[#E10600]/50 bg-[#E10600]/15 px-3 py-1 font-heading text-xs font-semibold uppercase tracking-wider text-[#E10600]">
                  {roleBadge}
                </span>
              </div>
              {bio ? (
                <p className="mt-1 max-w-2xl font-body text-sm text-[#9CA3AF] line-clamp-2">{bio}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-8 md:justify-end shrink-0 w-full md:w-auto border-t border-gray-800/80 md:border-0 pt-4 md:pt-0">
            <div className="text-center md:text-right">
              <div className="text-2xl font-heading font-bold text-white tabular-nums">
                {followerCount.toLocaleString()}
              </div>
              <div className="text-xs text-[#9CA3AF] font-body uppercase tracking-wider">Followers</div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-2xl font-heading font-bold text-white tabular-nums">
                {followingCount.toLocaleString()}
              </div>
              <div className="text-xs text-[#9CA3AF] font-body uppercase tracking-wider">Following</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/settings/profile" className={actionBtnClass}>
            <Pencil className="w-4 h-4 shrink-0" />
            Edit Profile
          </Link>
          <Link to="/tickets" className={actionBtnClass}>
            <Ticket className="w-4 h-4 shrink-0" />
            My Tickets
          </Link>
          <Link to="/settings" className={actionBtnClass}>
            <ShoppingBag className="w-4 h-4 shrink-0" />
            My Orders
          </Link>
          <Link to="/profile#saved-events" className={actionBtnClass}>
            <Bookmark className="w-4 h-4 shrink-0" />
            Saved Events
          </Link>
          <Link to="/settings" className={actionBtnClass}>
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </Link>
          {userIsCreator ? (
            <Link to="/studio/overview" className={actionBtnClass}>
              <Sparkles className="w-4 h-4 shrink-0" />
              Open Studio
            </Link>
          ) : (
            <Link to="/studio/application" className={actionBtnClass}>
              <UserPlus className="w-4 h-4 shrink-0" />
              Become a Creator
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
