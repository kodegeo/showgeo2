import { useRef } from "react";
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

  if (!user) return null;

  // Default banner
  const defaultBanner = "/assets/defaults/profile-banner.png";
  const bannerUrl =
    (user.profile as any)?.bannerUrl || defaultBanner;

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

      // 👇 NEW: Wait for CDN propagation before updating UI
      await waitForImage(newBannerUrl);
      
      // Update user's profile in DB
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          bannerUrl: newBannerUrl,
        },
      });

      // Refresh local user
      await refetchUser();
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
      className="relative w-full bg-[#0B0B0B] border-b border-gray-800 md:w-screen md:ml-[calc(-50vw+50%)] lg:w-full lg:ml-0"
    >
      <div
        className="relative w-full h-48 md:h-64 lg:h-72 bg-gradient-to-r from-[#CD000E] to-[#860005] overflow-hidden cursor-pointer group"
        onClick={() => bannerInputRef.current?.click()}
        style={{
          backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Invisible click area */}
        <div
          className="absolute inset-0 z-20 cursor-pointer"
          onClick={() => bannerInputRef.current?.click()}
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/65 to-black/90" />

        {/* Fallback gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#CD000E]/90 via-[#860005]/90 to-[#0B0B0B]/90 pointer-events-none"
          style={{
            display: bannerUrl === defaultBanner ? "block" : "none",
          }}
        />

        {/* Hover upload overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          {uploadAsset.isPending ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-white" />
              <span className="text-white font-heading font-semibold text-sm uppercase tracking-wider">
                Click to Upload Banner
              </span>
            </div>
          )}
        </div>

        {/* Hidden input */}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerChange}
          className="hidden"
          disabled={uploadAsset.isPending}
        />
      </div>
    </div>
  );
}

