import { useNavigate } from "react-router-dom";

export function CreatorProfileActions() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3 border-b border-white/10 px-6 py-4">
      <button
        onClick={() => navigate("/creator/events/new")}
        className="rounded bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
      >
        Create Event
      </button>

      <button
        onClick={() => navigate("/profile/setup")}
        className="rounded border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
      >
        Edit Profile
      </button>
    </div>
  );
}
  