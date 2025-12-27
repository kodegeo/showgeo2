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
    // Validate required fields
    if (!form.name || !form.startTime) {
      alert("Name and start time are required");
      return;
    }

    // Construct payload strictly aligned with CreateEventDto
    const startTimeDate = new Date(form.startTime);
    const endTimeDate = new Date(startTimeDate.getTime() + 60 * 60 * 1000); // Default: 1 hour after start

    const payload: CreateEventRequest = {
      // REQUIRED FIELDS (must match CreateEventDto exactly)
      entityId: currentEntity.id, // UUID string
      name: form.name, // string
      eventType: "LIVE" as const, // EventType enum: "LIVE" | "PRERECORDED"
      phase: "PRE_LIVE" as const, // EventPhase enum: "PRE_LIVE" | "LIVE" | "POST_LIVE"
      status: "DRAFT" as const, // EventStatus enum: "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED"
      startTime: startTimeDate.toISOString(), // ISO date string
      isVirtual: form.isVirtual, // boolean (required)
      geoRestricted: false, // boolean (required)
      ticketRequired: true, // boolean (required)
      entryCodeRequired: false, // boolean (required)
      entryCodeDelivery: false, // boolean (required)
      testingEnabled: false, // boolean (required)
      
      // OPTIONAL FIELDS (only include if value exists)
      ...(form.description ? { description: form.description } : {}),
      ...(form.location ? { location: form.location } : {}),
      endTime: endTimeDate.toISOString(), // ISO date string (optional)
    };

    // Log payload immediately before submission
    console.log("CreateEvent payload", payload);

    await createEvent.mutateAsync(payload);
  
    navigate("/creator/events");
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
