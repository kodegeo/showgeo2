import { useState } from "react";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useDeleteResource } from "@/hooks/creator/useCreatorActions";

export function ConfirmDeleteModal() {
  const { currentModal, closeModal, modalData } = useModalContext();
  const deleteResource = useDeleteResource();

  const { resourceType, resourceId, resourceName, onConfirm } = modalData || {};

  const [confirmationText, setConfirmationText] = useState("");

  const isOpen = currentModal === "confirmDelete";
  const isValid = confirmationText === "DELETE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      return;
    }

    try {
      // Use onConfirm callback if provided, otherwise use deleteResource hook
      if (onConfirm) {
        await onConfirm();
      } else if (resourceType && resourceId) {
        await deleteResource.mutateAsync({
          resourceType,
          resourceId,
        });
      }

      closeModal();
      setConfirmationText("");
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Confirm Delete"
      description={`Are you sure you want to delete ${resourceName || "this item"}? This action cannot be undone.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Confirmation Text */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Type "DELETE" to confirm *
          </label>
          <input
            type="text"
            required
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="DELETE"
          />
        </div>

        {/* Resource Type (Hidden) */}
        {resourceType && (
          <input type="hidden" name="resourceType" value={resourceType} />
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={closeModal}
            className="px-6 py-2 border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors uppercase text-xs font-heading font-semibold tracking-wider"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="px-6 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </form>
    </Modal>
  );
}

