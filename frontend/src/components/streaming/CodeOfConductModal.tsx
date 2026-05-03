import { useState } from "react";
import { X } from "lucide-react";
import { usersService } from "@/services/users.service";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after acceptance succeeds and profile is saved (retry token / join). */
  onAccepted: () => void | Promise<void>;
};

const SUMMARY =
  "Showgeo events require a safe, respectful environment. By continuing, you agree to follow our community standards, avoid harassment, and comply with applicable laws. Full policy text will live here; for now this confirms your explicit acceptance before streaming.";

export function CodeOfConductModal({ open, onClose, onAccepted }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!agreed) return;
    setSubmitting(true);
    try {
      await usersService.acceptCodeOfConduct();
      toast.success("Code of Conduct accepted");
      setAgreed(false);
      await onAccepted();
      onClose();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? String(
              (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "",
            )
          : e instanceof Error
          ? e.message
          : "Request failed";
      toast.error(msg || "Could not save acceptance");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coc-title"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#0B0B0B] shadow-xl text-white">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-10 space-y-4">
          <h2 id="coc-title" className="text-xl font-semibold text-white">
            Code of Conduct
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">{SUMMARY}</p>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-white/20 bg-black text-[#CD000E] focus:ring-[#CD000E]"
            />
            <span className="text-sm text-white/80">I agree to the Code of Conduct</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-white/15 text-white/80 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!agreed || submitting}
              onClick={() => void handleSubmit()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#CD000E] text-white hover:bg-[#860005] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving…" : "Accept and Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
