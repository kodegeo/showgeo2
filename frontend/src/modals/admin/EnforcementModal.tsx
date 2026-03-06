import { useState } from "react";
import { Modal } from "@/components/creator/Modal";

interface EnforcementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  title: string;
  description: string;
  actionLabel: string;
  actionType: "danger" | "warning" | "success";
  isLoading?: boolean;
}

export function EnforcementModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  actionLabel,
  actionType,
  isLoading = false,
}: EnforcementModalProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent Enter key auto-submit - require explicit button click
    if (reason.trim().length < 10) {
      return;
    }
    try {
      await onSubmit(reason.trim());
      setReason("");
      onClose();
    } catch (error) {
      // Error handling is done by the parent component
      console.error("Enforcement action failed:", error);
    }
  };

  // Prevent Enter key from submitting the form
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLTextAreaElement) {
      // Allow Enter in textarea for multi-line input
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const buttonClasses = {
    danger: "bg-red-600 hover:bg-red-700",
    warning: "bg-yellow-600 hover:bg-yellow-700",
    success: "bg-green-600 hover:bg-green-700",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="md">
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-white mb-2">
            Reason <span className="text-red-400">*</span>
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a detailed reason for this action (minimum 10 characters)..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            required
            minLength={10}
            disabled={isLoading}
            onKeyDown={(e) => {
              // Prevent Enter key from submitting form
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                // Allow Ctrl+Enter or Cmd+Enter to submit
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
              }
            }}
          />
          <p className="mt-1 text-xs text-gray-400">
            {reason.length}/10 minimum characters
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={reason.trim().length < 10 || isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses[actionType]}`}
            onClick={(e) => {
              // Ensure explicit click - prevent programmatic submission
              if (reason.trim().length < 10) {
                e.preventDefault();
              }
            }}
          >
            {isLoading ? "Processing..." : actionLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

