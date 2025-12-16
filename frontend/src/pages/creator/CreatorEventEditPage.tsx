import { useParams, useNavigate } from "react-router-dom";
import { useEvent, useUpdateEvent } from "@/hooks/useEvents";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { useState, useEffect } from "react";

export function CreatorEventEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(id!);
  const updateEvent = useUpdateEvent();

  const [form, setForm] = useState({
    name: "",
    description: "",
    startTime: "",
    location: "",
  });

  useEffect(() => {
    if (event) {
      setForm({
        name: event.name,
        description: event.description ?? "",
        startTime: event.startTime
        ? new Date(event.startTime).toISOString().slice(0, 16)
        : "",
        location: event.location ?? "",
      });
    }
  }, [event]);

  if (isLoading || !event) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-white/60">Loading…</div>
      </CreatorDashboardLayout>
    );
  }

  async function save() {
    if (!event) return;
  
    await updateEvent.mutateAsync({
      id: event.id,
      data: {
        name: form.name,
        description: form.description || undefined,
        startTime: new Date(form.startTime).toISOString(),
        location: form.location || undefined,
      },
    });
  
    navigate(`/creator/events/${event.id}`);
  }
  return (
    <CreatorDashboardLayout>
      <div className="max-w-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-white">Edit Event</h1>

        <input
          className="w-full p-2 bg-black/40 border border-white/10"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <textarea
          className="w-full p-2 bg-black/40 border border-white/10"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <input
          type="datetime-local"
          className="w-full p-2 bg-black/40 border border-white/10"
          value={form.startTime}
          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
        />

        <input
          className="w-full p-2 bg-black/40 border border-white/10"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />

        <div className="flex gap-3 pt-4">
          <button
            onClick={save}
            className="px-4 py-2 bg-[#CD000E] text-white rounded"
          >
            Save Changes
          </button>

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white/10 text-white rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </CreatorDashboardLayout>
  );
}
