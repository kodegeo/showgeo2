import { useNavigate } from "react-router-dom";
import { useCreateEvent } from "@/hooks/useEvents";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useState } from "react";
import type { CreateEventRequest } from "@/services/events.service";

export function CreateEventPage() {
  const navigate = useNavigate();
  const { currentEntity } = useEntityContext();
  const createEvent = useCreateEvent();

  const [form, setForm] = useState({
    name: "",
    description: "",
    startTime: "",
    location: "",
    isVirtual: false,
  });

  if (!currentEntity) {
    return <div className="text-white/60">No entity found</div>;
  }

  const submit = async () => {
    // ✅ Guard: Validate entityId
    if (!currentEntity?.id) {
      alert("No entity selected. Please select an entity before creating an event.");
      return;
    }

    // ✅ Guard: Validate required fields
    if (!form.name) {
      alert("Event name is required");
      return;
    }

    if (!form.startTime) {
      alert("Start time is required");
      return;
    }

    // Construct minimal payload - backend applies defaults
    const startTimeDate = new Date(form.startTime);
    const endTimeDate = new Date(startTimeDate.getTime() + 60 * 60 * 1000); // Default: 1 hour after start

    const payload: CreateEventRequest = {
      // ✅ REQUIRED FIELDS ONLY
      entityId: currentEntity.id,
      name: form.name,
      startTime: startTimeDate.toISOString(),
      
      // ✅ OPTIONAL FIELDS
      ...(form.description ? { description: form.description } : {}),
      ...(form.location ? { location: form.location } : {}),
      endTime: endTimeDate.toISOString(),
    };

    // Log payload immediately before submission
    console.log("CreateEvent payload", payload);

    const createdEvent = await createEvent.mutateAsync(payload);
  
    // ✅ Redirect to Event Dashboard after creation
    if (createdEvent?.id) {
      navigate(`/studio/events/${createdEvent.id}`);
    } else {
      navigate("/studio/events");
    }
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
