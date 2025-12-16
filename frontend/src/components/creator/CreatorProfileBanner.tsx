import { useEntityContext } from "@/hooks/useEntityContext";
import { useAuth } from "@/hooks/useAuth";
import { useFollowers, useFollowing } from "@/hooks/useFollow";
import { Edit, Share2 } from "lucide-react";

interface CreatorProfileBannerProps {
  onEditClick?: () => void;
  onShareClick?: () => void;
}

export function CreatorProfileBanner({
  onEditClick,
  onShareClick,
}: CreatorProfileBannerProps) {
  const { currentEntity } = useEntityContext();
  const { user } = useAuth();
  const { data: followersData } = useFollowers(currentEntity?.id || "", 1, 1);
  const { data: followingData } = useFollowing(user?.id || "", 1, 1);

  const followerCount = followersData?.meta?.total || 0;
  const followingCount = followingData?.meta?.total || 0;

  if (!currentEntity) {
    return null;
  }

  return (
    <div className="relative w-full bg-[#0B0B0B] border-b border-gray-800">
      {/* Banner Image */}
      <div
        className="relative h-48 md:h-64 bg-gradient-to-r from-[#CD000E] to-[#860005] overflow-hidden"
        style={{
          backgroundImage: currentEntity.bannerImage ? `url(${currentEntity.bannerImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/70 to-transparent" />
        {!currentEntity.bannerImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#CD000E]/90 via-[#860005]/90 to-[#0B0B0B]/90" />
        )}
      </div>

      {/* Profile Info */}
      <div className="relative px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 -mt-16 md:-mt-20">
          {/* Avatar and Info */}
          <div className="flex items-end gap-4">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#0B0B0B] bg-[#0B0B0B] overflow-hidden">
                {currentEntity.thumbnail ? (
                  <img
                    src={currentEntity.thumbnail}
                    alt={currentEntity.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#CD000E] to-[#860005] flex items-center justify-center text-white font-heading font-bold text-2xl">
                    {currentEntity.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {currentEntity.isVerified && (
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#CD000E] rounded-full flex items-center justify-center border-2 border-[#0B0B0B]">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>

            <div className="pb-2">
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-1 uppercase tracking-tighter">
                {currentEntity.name}
              </h1>
              {currentEntity.bio && (
                <p className="text-[#9A9A9A] font-body text-sm max-w-2xl line-clamp-2">
                  {currentEntity.bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats and Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-heading font-bold text-white">
                  {followerCount.toLocaleString()}
                </div>
                <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">
                  Followers
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-heading font-bold text-white">
                  {followingCount.toLocaleString()}
                </div>
                <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">
                  Following
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onEditClick}
                className="px-4 py-2 border border-gray-700 hover:border-[#CD000E] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 text-sm flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Page
              </button>
              <button
                onClick={onShareClick}
                className="px-4 py-2 border border-gray-700 hover:border-[#CD000E] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 text-sm flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

