import { useState } from "react";
import { X } from "lucide-react";

export interface CreateClipModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (startTime: number, endTime: number) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function CreateClipModal({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateClipModalProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const start = Math.floor(Number(startTime));
    const end = Math.floor(Number(endTime));
    if (Number.isNaN(start) || start < 0) {
      setError("Start time must be a non-negative number (seconds).");
      return;
    }
    if (Number.isNaN(end) || end <= start) {
      setError("End time must be greater than start time (seconds).");
      return;
    }
    const duration = end - start;
    if (duration > 600) {
      setError("Clip duration cannot exceed 10 minutes (600 seconds).");
      return;
    }
    try {
      await onSubmit(start, end);
      setStartTime("");
      setEndTime("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create clip.");
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setStartTime("");
      setEndTime("");
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-[#0B0B0B] border border-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-heading font-semibold text-white uppercase tracking-tight">
            Clip Moment
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded text-white/60 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="clip-start" className="block text-sm font-medium text-white/80 mb-1">
              Start Time (seconds)
            </label>
            <input
              id="clip-start"
              type="number"
              min={0}
              step={1}
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#CD000E]"
              placeholder="0"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="clip-end" className="block text-sm font-medium text-white/80 mb-1">
              End Time (seconds)
            </label>
            <input
              id="clip-end"
              type="number"
              min={0}
              step={1}
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#CD000E]"
              placeholder="60"
              disabled={isSubmitting}
            />
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-600 text-white/90 rounded-lg hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded-lg uppercase tracking-wider disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create Clip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
