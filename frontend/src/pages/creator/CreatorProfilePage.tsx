import { useParams, useNavigate, Link } from "react-router-dom";
import { useEntityBySlug } from "@/hooks/useEntities";
import { useEvents } from "@/hooks/useEvents";
import { useFollowers, useIsFollowing, useFollowEntity, useUnfollowEntity } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useStoreByEntity } from "@/hooks/useStore";
import { Calendar, MapPin, Globe, Share2, Heart, UserPlus, Edit, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Entity } from "../../../../packages/shared/types/entity.types";
import type { Event } from "../../../../packages/shared/types/event.types";
import type { Store } from "../../../../packages/shared/types/store.types";

export function CreatorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { currentEntity } = useEntityContext();
  
  // Fetch entity by slug or ID
  const { data: entity, isLoading: entityLoading } = useEntityBySlug(slug || "");
  const entityId = entity?.id || "";

  if (!slug) {
    navigate("/entities");
    return null;
  }
  
  
  // Check if this is the current user's entity (for edit mode)
  const isOwner = currentEntity?.id === entityId;
  
  // Fetch related data
  const { data: eventsData, isLoading: eventsLoading } = useEvents({
    entityId: entityId,
    limit: 10,
  });
  
  const { data: followersData } = useFollowers(entityId, 1, 1);
  const { data: isFollowingData } = useIsFollowing(entityId);
  const { data: storeData } = useStoreByEntity(entityId);
  
  const followEntity = useFollowEntity();
  const unfollowEntity = useUnfollowEntity();
  
  const followerCount = followersData?.meta?.total || 0;
  const events = eventsData?.data || [];
  const isFollowing = isFollowingData || false;
  const [isEditMode, setIsEditMode] = useState(false);
  
  if (entityLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#CD000E] mx-auto mb-4" />
          <p className="text-[#9A9A9A] font-body">Loading creator profile...</p>
        </div>
      </div>
    );
  }
  
  if (!entity) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-white mb-2">Creator Not Found</p>
          <p className="text-[#9A9A9A] font-body mb-4">The creator profile you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate("/entities")}
            className="px-6 py-2 bg-[#CD000E] hover:bg-[#860005] text-white rounded-lg font-heading font-semibold uppercase tracking-wider transition-colors"
          >
            Browse Creators
          </button>
        </div>
      </div>
    );
  }
  
  const handleFollow = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    if (isFollowing) {
      await unfollowEntity.mutateAsync(entityId);
    } else {
      await followEntity.mutateAsync(entityId);
    }
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: entity.name,
        text: entity.bio || `Check out ${entity.name} on Showgeo`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast notification
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      {/* Banner */}
      <div
        className="relative h-64 md:h-80 bg-gradient-to-r from-[#CD000E] to-[#860005] overflow-hidden"
        style={{
          backgroundImage: entity.bannerImage ? `url(${entity.bannerImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/70 to-transparent" />
        {!entity.bannerImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#CD000E]/90 via-[#860005]/90 to-[#0B0B0B]/90" />
        )}
      </div>
      
      {/* Profile Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 pb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          {/* Avatar and Info */}
          <div className="flex items-end gap-6">
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#0B0B0B] bg-[#0B0B0B] overflow-hidden">
                {entity.thumbnail ? (
                  <img
                    src={entity.thumbnail}
                    alt={entity.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#CD000E] to-[#860005] flex items-center justify-center text-white font-heading font-bold text-4xl">
                    {entity.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {entity.isVerified && (
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#CD000E] rounded-full flex items-center justify-center border-4 border-[#0B0B0B]">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
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
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-white uppercase tracking-tighter">
                  {entity.name}
                </h1>
                {entity.type && (
                  <span className="px-3 py-1 bg-[#CD000E]/20 border border-[#CD000E]/50 rounded-full text-xs font-heading font-semibold uppercase tracking-wider text-[#CD000E]">
                    {entity.type}
                  </span>
                )}
              </div>
              {entity.bio && (
                <p className="text-[#9A9A9A] font-body text-base max-w-2xl mb-4">
                  {entity.bio}
                </p>
              )}
              
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#9A9A9A]">
                {entity.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{entity.location}</span>
                  </div>
                )}
                {entity.website && (
                  <a
                    href={entity.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-[#CD000E] transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Website</span>
                  </a>
                )}
                {entity.socialLinks && Object.keys(entity.socialLinks).length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider">Social:</span>
                    {Object.entries(entity.socialLinks).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#CD000E] transition-colors capitalize"
                      >
                        {platform}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Stats and Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-white">
                  {followerCount.toLocaleString()}
                </div>
                <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">
                  Followers
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-white">
                  {events.length}
                </div>
                <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">
                  Events
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="px-4 py-2 border border-gray-700 hover:border-[#CD000E] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 text-sm flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  {isEditMode ? "View Mode" : "Edit Profile"}
                </button>
              )}
              {!isOwner && isAuthenticated && (
                <button
                  onClick={handleFollow}
                  disabled={followEntity.isPending || unfollowEntity.isPending}
                  className={`px-6 py-2 font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 text-sm flex items-center gap-2 ${
                    isFollowing
                      ? "border border-gray-700 hover:border-[#CD000E] text-white"
                      : "bg-[#CD000E] hover:bg-[#860005] text-white"
                  }`}
                >
                  {followEntity.isPending || unfollowEntity.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <Heart className="w-4 h-4 fill-current" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleShare}
                className="px-4 py-2 border border-gray-700 hover:border-[#CD000E] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 text-sm flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {isEditMode ? (
          <CreatorProfileEditView entity={entity} onCancel={() => setIsEditMode(false)} />
        ) : (
          <CreatorProfilePublicView entity={entity as Entity} events={events as Event[]} store={storeData as Store | null} eventsLoading={eventsLoading} />
        )}  
      </div>
    </div>
  );
}

// Public View Component
function CreatorProfilePublicView({
  entity,
  events,
  store,
  eventsLoading,
}: {
  entity: Entity;
  events: Event[];
  store: Store | null;
  eventsLoading: boolean;
})
{
  return (
    <div className="space-y-8">
      {/* Upcoming Events */}
      <section>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-heading font-bold text-white uppercase tracking-tighter">
            Upcoming Events
          </h2>

          {events.length > 0 && (
            <Link
              to={`/events?entity=${entity.id}`}
              className="text-sm text-[#CD000E] hover:text-[#860005] font-heading font-semibold uppercase tracking-wider transition-colors"
            >
              View All
            </Link>
          )}
        </div>

        {/* Loading */}
        {eventsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 bg-gray-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!eventsLoading && events.length === 0 && (
          <div className="w-full py-12 text-center border border-gray-800 rounded-lg">
            <Calendar className="w-12 h-12 text-[#9A9A9A] mx-auto mb-4" />
            <p className="text-[#9A9A9A] font-body">
              No upcoming events scheduled.
            </p>
          </div>
        )}

        {/* Events Grid */}
        {!eventsLoading && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                aria-label={`View event ${event.name}`}
                className="group block bg-[#0B0B0B] border border-gray-800 rounded-lg overflow-hidden hover:border-[#CD000E] transition-all duration-300"
              >
                {event.thumbnail && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={event.thumbnail}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-4">
                  <h3 className="text-lg font-heading font-bold text-white mb-2 uppercase tracking-tighter line-clamp-2">
                    {event.name}
                  </h3>

                  {event.description && (
                    <p className="text-sm text-[#9A9A9A] font-body line-clamp-2 mb-3">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    {event.startTime && (
                      <span className="text-[#9A9A9A] font-body">
                        {new Date(event.startTime).toLocaleDateString()}
                      </span>
                    )}

                    <span
                      className={`px-2 py-1 rounded-full font-heading font-semibold uppercase tracking-wider ${
                        event.status === "LIVE"
                          ? "bg-[#CD000E] text-white"
                          : event.status === "SCHEDULED"
                          ? "bg-[#F49600] text-white"
                          : "bg-gray-700 text-white"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      
      {/* Store Section */}
      {store && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-heading font-bold text-white uppercase tracking-tighter">
              Store
            </h2>
            <a
              href={`/entities/${entity.slug}/store`}
              className="text-sm text-[#CD000E] hover:text-[#860005] font-heading font-semibold uppercase tracking-wider transition-colors"
            >
              View Store
            </a>
          </div>
          <div className="bg-[#0B0B0B] border border-gray-800 rounded-lg p-6">
            <p className="text-[#9A9A9A] font-body">
              {store.name || "Store"} is now open. Browse products and merchandise.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

// Edit View Component
function CreatorProfileEditView({ 
  entity, 
  onCancel 
}: { 
  entity: any; 
  onCancel: () => void;
}) {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-[#0B0B0B] border border-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-heading font-bold text-white mb-6 uppercase tracking-tighter">
          Edit Creator Profile
        </h2>
        <p className="text-[#9A9A9A] font-body mb-6">
          Use the Creator Settings page to edit your profile information, banner, avatar, and other details.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/creator/settings")}
            className="px-6 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-colors"
          >
            Go to Settings
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-700 hover:border-[#CD000E] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

