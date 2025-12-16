import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ProfileLayout } from "@/layouts/ProfileLayout";

// Existing components you already use
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { ProfileFilters } from "@/components/profile/ProfileFilters";
import { ProfileEventsFeed } from "@/components/profile/ProfileEventsFeed";
import { ProfileCreatorsFeed } from "@/components/profile/ProfileCreatorsFeed";
import { ProfileLiveFeed } from "@/components/profile/ProfileLiveFeed";

// New (or existing) creator-only action bar
import { CreatorProfileActions } from "@/components/creator/CreatorProfileActions" 

export function ProfilePage() {
  const { user } = useAuth();

  /**
   * Identity flags
   * Keep these extremely simple and explicit
   */
  const isEntity = !!user?.isEntity;
  const isOwner = isEntity; // later: replace with real ownership / role check

  /**
   * Memoize creator action bar so layout stays clean
   */
  const creatorActions = useMemo(() => {
    if (!isEntity || !isOwner) return null;
    return <CreatorProfileActions />;
  }, [isEntity, isOwner]);

  return (
    <ProfileLayout
      isEntity={isEntity}
      isOwner={isOwner}
      creatorActions={creatorActions}
    >
      {/* ============================= */}
      {/* Profile Banner (shared) */}
      {/* ============================= */}
      <ProfileBanner />

      {/* ============================= */}
      {/* Filters (shared) */}
      {/* ============================= */}
      <ProfileFilters />

      {/* ============================= */}
      {/* Main Profile Content */}
      {/* ============================= */}
      <div className="space-y-10 px-6 py-8">
        {/* Live / Streaming */}
        <ProfileLiveFeed />

        {/* Events */}
        <ProfileEventsFeed />

        {/* Creators / Following */}
        <ProfileCreatorsFeed />
      </div>
    </ProfileLayout>
  );
}
