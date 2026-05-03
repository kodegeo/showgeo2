import { useState } from "react";
import type { EventWizardState } from "@/types/events";

interface EventQuickSetupProps {
  state: EventWizardState;
  onUpdate: (patch: Partial<EventWizardState>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
  { value: "TICKET_HOLDERS", label: "Ticket Holders" },
] as const;

export function EventQuickSetup({
  state,
  onUpdate,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: EventQuickSetupProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, startTime: true });
    if (!state.name.trim()) return;
    if (!state.startTime) return;
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-lg font-semibold text-white uppercase tracking-tight">
        Step 1 — Quick Setup
      </h2>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Event Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={state.name}
          onChange={e => onUpdate({ name: e.target.value })}
          onBlur={() => setTouched(t => ({ ...t, name: true }))}
          placeholder="e.g. Live Concert"
          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-md text-white placeholder:text-white/40 focus:border-[#CD000E] focus:outline-none"
          required
        />
        {touched.name && !state.name.trim() && (
          <p className="mt-1 text-xs text-red-400">Event name is required</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">Description</label>
        <textarea
          value={state.description}
          onChange={e => onUpdate({ description: e.target.value })}
          placeholder="Brief description of your event"
          rows={3}
          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-md text-white placeholder:text-white/40 focus:border-[#CD000E] focus:outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">Category</label>
        <input
          type="text"
          value={state.category}
          onChange={e => onUpdate({ category: e.target.value })}
          placeholder="e.g. Music, Comedy"
          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-md text-white placeholder:text-white/40 focus:border-[#CD000E] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">Visibility</label>
        <div className="flex flex-wrap gap-3">
          {VISIBILITY_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value={opt.value}
                checked={state.visibility === opt.value}
                onChange={() => onUpdate({ visibility: opt.value })}
                className="text-[#CD000E] focus:ring-[#CD000E]"
              />
              <span className="text-white/90">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Start Time <span className="text-red-500">*</span>
        </label>
        <input
          type="datetime-local"
          value={state.startTime ? state.startTime.slice(0, 16) : ""}
          onChange={e =>
            onUpdate({
              startTime: e.target.value ? new Date(e.target.value).toISOString() : "",
            })
          }
          onBlur={() => setTouched(t => ({ ...t, startTime: true }))}
          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-md text-white focus:border-[#CD000E] focus:outline-none"
          required
        />
        {touched.startTime && !state.startTime && (
          <p className="mt-1 text-xs text-red-400">Start time is required</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-white/80 hover:text-white border border-white/20 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !state.name.trim() || !state.startTime}
          className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating…" : "Next"}
        </button>
      </div>
    </form>
  );
}
