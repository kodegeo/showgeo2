import { useAuth } from "@/hooks/useAuth";
import { ProfileLayout } from "@/layouts/ProfileLayout";
import { Link } from "react-router-dom";

export default function EntityProfilePage() {
  const { ownedEntity } = useAuth();

  if (!ownedEntity) {
    return (
      <ProfileLayout>
        <div className="text-white p-10 text-xl">
          No entity found. You may need to complete your creator application.
        </div>
      </ProfileLayout>
    );
  }

  const entity = ownedEntity;

  return (
    <ProfileLayout>
      {/* Banner */}
      <div
        className="w-full h-52 bg-cover bg-center rounded-xl"
        style={{
          backgroundImage: `url(${entity.bannerImage || "/assets/defaults/entity-banner.png"})`,
        }}
      />

      {/* Header section */}
      <div className="flex items-center gap-6 mt-[-40px] px-8">
        <img
          src={entity.thumbnail || "/assets/defaults/entity-avatar.png"}
          className="w-32 h-32 rounded-full border-4 border-black object-cover"
        />
        <div>
          <h1 className="text-4xl font-bold text-white">{entity.name}</h1>
          <p className="text-gray-400">{entity.bio || "No bio provided yet."}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 px-8 mt-6">
        <Link
          to="/entity/edit"
          className="px-5 py-2 rounded-lg bg-purple-600 text-white"
        >
          Edit Profile
        </Link>

        <Link
          to="/creator/events/new"
          className="px-5 py-2 rounded-lg bg-blue-600 text-white"
        >
          Create Event
        </Link>

        <Link
          to="/tours/create"
          className="px-5 py-2 rounded-lg bg-green-600 text-white"
        >
          Create Tour
        </Link>

        <Link
          to="/store/manage"
          className="px-5 py-2 rounded-lg bg-yellow-600 text-black"
        >
          Manage Store
        </Link>
      </div>

      {/* Sections */}
      <div className="px-8 mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* About */}
        <div className="bg-[#141414] p-6 rounded-xl text-white">
          <h2 className="text-2xl font-semibold mb-4">About</h2>
          <p>{entity.bio || "This entity has not added an about section yet."}</p>

          <div className="mt-4 text-gray-400">
            <p><strong>Location:</strong> {entity.location || "Not set"}</p>
            <p><strong>Website:</strong> {entity.website || "Not set"}</p>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-[#141414] p-6 rounded-xl text-white">
          <h2 className="text-2xl font-semibold mb-4">Social Links</h2>

          {(entity.socialLinks && Object.keys(entity.socialLinks).length > 0) ? (
            <ul className="space-y-2">
              {Object.entries(entity.socialLinks).map(([key, value]) => (
                <li key={key}>
                    <a href={(value as string) ?? "#"} className="text-blue-400" target="_blank">
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No social links added.</p>
          )}
        </div>

      </div>

      {/* Events, Store, Tours, Followers — Placeholder modules */}
      <div className="px-8 mt-10 text-white">
        <h2 className="text-3xl font-bold mb-4">Your Events</h2>
        {/* TODO: Add EventsTable component */}
      </div>

      <div className="px-8 mt-10 text-white">
        <h2 className="text-3xl font-bold mb-4">Your Store</h2>
        {/* TODO: Add StoreOverview component */}
      </div>

      <div className="px-8 mt-10 text-white">
        <h2 className="text-3xl font-bold mb-4">Your Tours</h2>
        {/* TODO: Add ToursList component */}
      </div>

      <div className="px-8 mt-10 text-white mb-20">
        <h2 className="text-3xl font-bold mb-4">Followers</h2>
        {/* TODO: Add FollowersTable component */}
      </div>
    </ProfileLayout>
  );
}
