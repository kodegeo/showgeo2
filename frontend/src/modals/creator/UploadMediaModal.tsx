import { useState } from "react";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useUploadMedia } from "@/hooks/creator/useCreatorActions";

export function UploadMediaModal() {
  const { currentModal, closeModal } = useModalContext();
  const { currentEntity } = useEntityContext();
  const uploadMedia = useUploadMedia();

  const [formData, setFormData] = useState({
    file: null as File | null,
    title: "",
    description: "",
    type: "IMAGE" as "IMAGE" | "VIDEO" | "AUDIO",
    visibility: "public" as "public" | "private",
    expiration: "",
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isOpen = currentModal === "uploadMedia";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, file });
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.file || !formData.title) {
      return;
    }

    if (!currentEntity) {
      return;
    }

    try {
      await uploadMedia.mutateAsync({
        file: formData.file,
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        isPublic: formData.visibility === "public",
        expiration: formData.expiration || undefined,
        entityId: currentEntity.id,
      });

      closeModal();
      setFormData({
        file: null,
        title: "",
        description: "",
        type: "IMAGE",
        visibility: "public",
        expiration: "",
      });
      setPreviewUrl(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Upload Media"
      description="Upload images, videos, or audio files"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            File *
          </label>
          <input
            type="file"
            required
            accept=".jpg,.png,.mp3,.mp4"
            onChange={handleFileChange}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#CD000E] file:text-white hover:file:bg-[#860005] file:cursor-pointer"
          />
          {previewUrl && (
            <div className="mt-2">
              {formData.type === "IMAGE" ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg border border-gray-700"
                />
              ) : (
                <div className="w-full h-32 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                  <span className="text-[#9A9A9A]">Preview not available</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Title *
          </label>
          <input
            type="text"
            required
            maxLength={80}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="Enter media title"
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
            placeholder="Describe your media"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Type *
          </label>
          <select
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as "IMAGE" | "VIDEO" | "AUDIO" })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white focus:border-[#CD000E] focus:outline-none"
          >
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
            <option value="AUDIO">Audio</option>
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

        {/* Expiration */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Expiration (Optional)
          </label>
          <input
            type="datetime-local"
            value={formData.expiration}
            onChange={(e) => setFormData({ ...formData, expiration: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white focus:border-[#CD000E] focus:outline-none"
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
            disabled={uploadMedia.isPending}
            className="px-6 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMedia.isPending ? "Uploading..." : "Upload Media"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

