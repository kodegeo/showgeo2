import { useState } from "react";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useManageFanWithOptimistic } from "@/hooks/creator/useCreatorActions";

export function ManageFanModal() {
  const { currentModal, closeModal, modalData } = useModalContext();
  const { currentEntity } = useEntityContext();
  const manageFan = useManageFanWithOptimistic();

  const fan = modalData?.fan;

  const [formData, setFormData] = useState({
    action: "Follow" as "Follow" | "Unfollow" | "Block" | "Invite",
    notes: "",
  });

  const isOpen = currentModal === "manageFan";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fan || !currentEntity) {
      return;
    }

    // Extract userId from fan object (could be fan.userId or fan.user?.id)
    const userId = fan.userId || fan.user?.id;
    if (!userId) {
      return;
    }

    try {
      await manageFan.mutateAsync({
        entityId: currentEntity.id,
        userId,
        action: formData.action,
        notes: formData.notes || undefined,
      });

      closeModal();
      setFormData({
        action: "Follow",
        notes: "",
      });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Manage Fan"
      description="Adjust fan settings, invite, or block users"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username (Read-only) */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Username
          </label>
          <input
            type="text"
            readOnly
            value={fan?.user?.profile?.username || fan?.user?.email || fan?.username || fan?.email || "N/A"}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-[#9A9A9A] cursor-not-allowed"
          />
        </div>

        {/* Action */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Action *
          </label>
          <select
            required
            value={formData.action}
            onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white focus:border-[#CD000E] focus:outline-none"
          >
            <option value="Follow">Follow</option>
            <option value="Unfollow">Unfollow</option>
            <option value="Block">Block</option>
            <option value="Invite">Invite</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none resize-none"
            rows={3}
            placeholder="Optional notes"
          />
        </div>

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
            disabled={manageFan.isPending}
            className="px-6 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {manageFan.isPending ? "Updating..." : "Update Fan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

