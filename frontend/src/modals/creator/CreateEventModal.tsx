import { useState } from "react";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useCreateEventWithThumbnail } from "@/hooks/creator/useCreatorActions";
import { toast } from "sonner";

export function CreateEventModal() {
  const { currentModal, closeModal } = useModalContext();
  const { currentEntity } = useEntityContext();
  const createEvent = useCreateEventWithThumbnail();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startTime: "",
    location: "",
    isVirtual: false,
    category: "",
    visibility: "public" as "public" | "private",
    price: "",
    thumbnail: null as File | null,
  });
  
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const isOpen = currentModal === "createEvent";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEntity) {
      toast.error("No entity selected");
      return;
    }

    try {
      await createEvent.mutateAsync({
        entityId: currentEntity.id,
        name: formData.name,
        description: formData.description || undefined,
        eventType: "LIVE",
        startTime: new Date(formData.startTime).toISOString(),
        location: formData.location || undefined,
        isVirtual: Boolean(formData.isVirtual),
      });
            
      closeModal();
      setFormData({
        name: "",
        description: "",
        startTime: "",
        location: "",
        isVirtual: false,
        category: "Music",
        visibility: "public",
        price: "0",
        thumbnail: null,
      });
      setThumbnailUrl(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, thumbnail: file });
      const url = URL.createObjectURL(file);
      setThumbnailUrl(url);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Create Event"
      description="Schedule a new live or on-demand event"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Name */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Event Name *
          </label>
          <input
            type="text"
            required
            maxLength={100}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="Enter event name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Description
          </label>
          <textarea
            maxLength={500}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none resize-none"
            rows={3}
            placeholder="Describe your event"
          />
        </div>

        {/* Date & Time */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Date & Time *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white focus:border-[#CD000E] focus:outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Category *
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white focus:border-[#CD000E] focus:outline-none"
          >
            <option value="Music">Music</option>
            <option value="Comedy">Comedy</option>
            <option value="Podcast">Podcast</option>
            <option value="Talk">Talk</option>
            <option value="Workshop">Workshop</option>
          </select>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Visibility *
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={formData.visibility === "public"}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as "public" | "private" })}
                className="w-4 h-4 text-[#CD000E] focus:ring-[#CD000E]"
              />
              <span className="text-white">Public</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={formData.visibility === "private"}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as "public" | "private" })}
                className="w-4 h-4 text-[#CD000E] focus:ring-[#CD000E]"
              />
              <span className="text-white">Private</span>
            </label>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Price (USD)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="0.00"
          />
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Thumbnail
          </label>
          <input
            type="file"
            accept=".jpg,.png"
            onChange={handleThumbnailChange}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#CD000E] file:text-white hover:file:bg-[#860005] file:cursor-pointer"
          />
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Thumbnail preview"
              className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-700"
            />
          )}
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
            disabled={createEvent.isPending}
            className="px-6 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createEvent.isPending ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

