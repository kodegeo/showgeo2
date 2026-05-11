import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ProfileLayout } from "@/layouts/ProfileLayout";

import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { ProfileFilters } from "@/components/profile/ProfileFilters";
import { ProfileEventsFeed } from "@/components/profile/ProfileEventsFeed";
import { ProfileCreatorsFeed } from "@/components/profile/ProfileCreatorsFeed";
import { ProfileLiveFeed } from "@/components/profile/ProfileLiveFeed";

export function ProfilePage() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash !== "#saved-events") return;
    const el = document.getElementById("saved-events");
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [location.hash]);

  return (
    <ProfileLayout>
      {/* Profile hero: cover + subtle media edit controls on banner/avatar */}
      <ProfileBanner />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10">
        <ProfileFilters />

        <div className="space-y-10 pt-6">
          <ProfileLiveFeed />
          <ProfileEventsFeed />
          <ProfileCreatorsFeed />
        </div>
      </div>
    </ProfileLayout>
  );
}
