import { useNavigate } from "react-router-dom";
import { useCreateEvent } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export function CreateEventPage() {
  const navigate = useNavigate();
  const { ownedEntity } = useAuth();
  const createEvent = useCreateEvent();

  const [form, setForm] = useState({
    name: "",
    description: "",
    startTime: "",
    location: "",
    isVirtual: false,
  });

  if (!ownedEntity) {
    return <div className="text-white/60">No entity found</div>;
  }

  const submit = async () => {
    await createEvent.mutateAsync({
      entityId: ownedEntity.id,
      name: form.name,
      description: form.description || undefined,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.startTime).toISOString(),
      location: form.location || undefined,
      eventType: "LIVE",
      isVirtual: form.isVirtual,
    });
  
    navigate("/profile");
  };
  
  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create Event</h1>

      <input
        className="w-full p-2 bg-black/40 border border-white/10"
        placeholder="Event name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <textarea
        className="w-full p-2 bg-black/40 border border-white/10"
        placeholder="Description"
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
        placeholder="Location"
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
      />

      <button
        onClick={submit}
        className="bg-white text-black px-4 py-2 rounded"
        disabled={createEvent.isPending}
      >
        Create Event
      </button>
    </div>
  );
}
