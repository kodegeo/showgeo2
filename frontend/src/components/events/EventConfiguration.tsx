import { useState, useRef } from "react";
import type { EventWizardState } from "@/types/events";

interface EventConfigurationProps {
  state: EventWizardState;
  onUpdate: (patch: Partial<EventWizardState>) => void;
  /** Called when user clicks Next. Parent should upload thumbnail (if any) and PATCH event, then advance. */
  onSubmit: (options?: { thumbnailFile?: File | null }) => void;
  onBack: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}

const STREAMING_ACCESS_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "REGISTERED", label: "Registered only" },
  { value: "TICKETED", label: "Ticket holders only" },
] as const;

export function EventConfiguration({
  state,
  onUpdate,
  onSubmit,
  onBack,
  onCancel,
  isSubmitting,
  error,
}: EventConfigurationProps) {
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ thumbnailFile: thumbnailFile ?? null });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setThumbnailFile(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-lg font-semibold text-white uppercase tracking-tight">
        Step 2 — Configure Event
      </h2>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">Event Thumbnail</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 border border-white/20 rounded-md text-white/90 hover:bg-white/5 text-sm"
          >
            {thumbnailFile ? thumbnailFile.name : "Choose image"}
          </button>
          {(thumbnailFile || state.thumbnailUrl) && (
            <span className="text-sm text-white/60">
              {thumbnailFile ? "Will upload on Next" : "Uploaded"}
            </span>
          )}
        </div>
        {thumbnailFile && (
          <p className="mt-1 text-xs text-white/50">
            File will be uploaded when you click Next. Event thumbnail will be updated.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">Ticket Price (USD)</label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={state.ticketPrice === 0 ? "" : state.ticketPrice}
          onChange={e =>
            onUpdate({
              ticketPrice: e.target.value === "" ? 0 : Number.parseFloat(e.target.value) || 0,
            })
          }
          placeholder="0 for free"
          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-md text-white placeholder:text-white/40 focus:border-[#CD000E] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">Ticket Quantity</label>
        <input
          type="number"
          min={1}
          value={state.ticketQuantity}
          onChange={e =>
            onUpdate({
              ticketQuantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
            })
          }
          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-md text-white placeholder:text-white/40 focus:border-[#CD000E] focus:outline-none"
        />
        <p className="mt-1 text-xs text-white/50">
          Display only. Backend creates default ticket tier on event creation.
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.geoRestricted}
            onChange={e => onUpdate({ geoRestricted: e.target.checked })}
            className="rounded text-[#CD000E] focus:ring-[#CD000E]"
          />
          <span className="text-white/90 text-sm">Geo restriction (optional)</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Streaming Access Level
        </label>
        <div className="flex flex-wrap gap-3">
          {STREAMING_ACCESS_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="streamingAccessLevel"
                value={opt.value}
                checked={state.streamingAccessLevel === opt.value}
                onChange={() => onUpdate({ streamingAccessLevel: opt.value })}
                className="text-[#CD000E] focus:ring-[#CD000E]"
              />
              <span className="text-white/90 text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
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
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-white/80 hover:text-white border border-white/20 rounded-md"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving…" : "Next"}
        </button>
      </div>
    </form>
  );
}
