import { useState } from "react";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useCreatePostWithMedia } from "@/hooks/creator/useCreatorActions";

export function CreatePostModal() {
  const { currentModal, closeModal } = useModalContext();
  const { currentEntity } = useEntityContext();
  const createPost = useCreatePostWithMedia();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    mediaAttachment: null as File | null,
    visibility: "public" as "public" | "private",
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isOpen = currentModal === "createPost";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, mediaAttachment: file });
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEntity) {
      return;
    }

    try {
      await createPost.mutateAsync({
        entityId: currentEntity.id,
        title: formData.title,
        content: formData.content,
        mediaFile: formData.mediaAttachment || undefined,
        isPublic: formData.visibility === "public",
      });

      closeModal();
      setFormData({
        title: "",
        content: "",
        mediaAttachment: null,
        visibility: "public",
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
      title="Create Post"
      description="Create and publish a social-style post"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Post Title */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Post Title *
          </label>
          <input
            type="text"
            required
            maxLength={80}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="Enter post title"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Content *
          </label>
          <textarea
            required
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none resize-none"
            rows={6}
            placeholder="Write your post content (Markdown supported)"
          />
        </div>

        {/* Media Attachment */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Media Attachment
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#CD000E] file:text-white hover:file:bg-[#860005] file:cursor-pointer"
          />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-700"
            />
          )}
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
            disabled={createPost.isPending}
            className="px-6 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPost.isPending ? "Publishing..." : "Publish Post"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

