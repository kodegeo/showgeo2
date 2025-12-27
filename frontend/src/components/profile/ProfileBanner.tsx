import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { useUploadAsset } from "@/hooks/useAssets";
import { AssetType, AssetOwnerType } from "../../../../packages/shared/types";
import { Camera, Loader2 } from "lucide-react";

function waitForImage(url: string, retries = 10, delay = 300): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      if (retries <= 0) {
        return reject(new Error("Image failed to load after retries"));
      }
      setTimeout(
        () => waitForImage(url + `?cb=${Date.now()}`, retries - 1, delay).then(resolve).catch(reject),
        delay
      );
    };
    img.src = url + `?cb=${Date.now()}`;
  });
}

export function ProfileBanner() {
  const { user, refetchUser } = useAuth();
  const updateUser = useUpdateUserProfile();
  const uploadAsset = useUploadAsset();  

  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Default banner (only used as fallback)
  const defaultBanner = "/assets/defaults/profile-banner.png";

  // Initialize with user's bannerUrl if available, otherwise null (not defaultBanner)
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    (user?.profile as any)?.bannerUrl || null
  );
  
  // ✅ SYNC WITH AUTH STATE - Update ONLY when user.profile.bannerUrl changes
  // This prevents resetting when other profile fields (like avatarUrl) change
  useEffect(() => {
    if (user?.profile) {
      const profileBannerUrl = (user.profile as any)?.bannerUrl;
      // Only update if bannerUrl actually changed (not when avatarUrl or other fields change)
      if (profileBannerUrl !== bannerUrl) {
        setBannerUrl(profileBannerUrl || null);
      }
    } else if (user && !user.profile) {
      // User exists but no profile yet - clear banner
      setBannerUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profile?.bannerUrl]); // Only depend on bannerUrl, not entire profile object

  // Early return AFTER all hooks are called
  if (!user) return null;
    
  const handleBannerChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be < 10MB");
      return;
    }

    try {
      // Upload via the shared hook (uses assets.service.ts pattern)
      const asset = await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.USER,
        ownerId: user.id,
        isPublic: true,
        metadata: { purpose: "banner" },
      });

      const newBannerUrl = asset.url;

      // ✅ Immediately update UI (optimistic update)
      setBannerUrl(newBannerUrl);
      
      // Update user profile with new banner URL
      // useUpdateUserProfile already updates the ["auth", "me"] cache,
      // which will trigger the useEffect to sync bannerUrl
      await updateUser.mutateAsync({
        id: user.id,
        data: { bannerUrl: newBannerUrl },
      });

      // Note: No need to call refetchUser() here because useUpdateUserProfile
      // already updates the ["auth", "me"] cache, which useAuth reads from.
      // The useEffect will automatically sync bannerUrl when user.profile.bannerUrl changes.
    } catch (err) {
      console.error("Banner upload failed:", err);
      alert("Banner upload failed. Try again.");
    } finally {
      // reset input so same file can be re-selected
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    }
  };

  return (
    <div
      className="relative w-full h-48 md:h-64 lg:h-72 overflow-hidden cursor-pointer group bg-black"
      onClick={(e) => {
        e.stopPropagation();
        bannerInputRef.current?.click();
      }}
    >
      {/* Show uploaded banner if available, otherwise show default banner */}
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt="Profile banner"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // Fallback to default banner if uploaded image fails to load
            console.warn("Banner image failed to load, falling back to default");
            (e.target as HTMLImageElement).src = defaultBanner;
          }}
        />
      ) : (
        <img
          src={defaultBanner}
          alt="Default profile banner"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            // If default also fails, show placeholder
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      {/* Hover overlay with Camera icon */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
        {uploadAsset.isPending ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Camera className="w-8 h-8 text-white" />
            <span className="text-white font-semibold text-sm uppercase tracking-wider">
              Change Banner
            </span>
          </div>
        )}
      </div>

      {/* Hidden input */}
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBannerChange}
        disabled={uploadAsset.isPending}
      />
    </div>
  );
}

