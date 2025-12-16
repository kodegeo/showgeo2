import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useEntityContext } from "@/hooks/useEntityContext";
import { streamingService } from "@/services";
import { eventsService } from "@/services";
import { handleApiError } from "@/services/api";

export function StartStreamModal() {
  const { currentModal, closeModal, modalData } = useModalContext();
  const { currentEntity } = useEntityContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: routeEventId } = useParams<{ id: string }>(); // ✅ Get eventId from route if available
  
  // ✅ Get eventId from modalData (if passed) or route params
  const eventId = modalData?.eventId || routeEventId;

  const [formData, setFormData] = useState({
    title: "",
    category: "Music",
    description: "",
    visibility: "public" as "public" | "private",
    duration: "60",
    notifyFollowers: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = currentModal === "startStream";

  // ✅ Single handleSubmit function - creates event if needed, then creates streaming session
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentEntity) {
      setError("No entity selected");
      return;
    }

    setIsSubmitting(true);

    try {
      let targetEventId = eventId;

      // Step 1: Create event if eventId not provided
      if (!targetEventId) {
        console.log("[StartStreamModal] No eventId provided, creating new event...");
        const newEvent = await eventsService.create({
          entityId: currentEntity.id,
          name: formData.title,
          description: formData.description || undefined,
          eventType: "LIVE",
          startTime: new Date().toISOString(),
        } as any); // ✅ Type assertion - ticketRequired not in interface but needed for backend
        targetEventId = newEvent.id;
        console.log("[StartStreamModal] Event created:", targetEventId);
      }

      // Step 2: Create streaming session - payload matches CreateSessionDto exactly
      // CreateSessionDto accepts: accessLevel?, metadata?, geoRegions?
      console.log("[StartStreamModal] Creating streaming session for event:", targetEventId);
      const session = await streamingService.createSession(targetEventId, {
        accessLevel: formData.visibility === "public" ? "PUBLIC" : "REGISTERED",
        // Store form metadata in metadata field for future use
        metadata: {
          title: formData.title,
          category: formData.category,
          description: formData.description,
          duration: formData.duration,
        },
      });

      console.log("[StartStreamModal] Streaming session created:", session.id);

      // Step 3: Success - invalidate queries so StreamingPanel detects the new session
      await queryClient.invalidateQueries({ queryKey: ["streaming", "targetEventId"] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });

      // Step 4: Close modal and navigate to event detail page with host=1 query param
      // StreamingPanel will detect the active session via useStreaming hook refetch
      // and automatically join as broadcaster when host=1 is present
      closeModal();
      navigate(`/creator/events/${targetEventId}?host=1`);


      

    } catch (error: any) {
      console.error("[StartStreamModal] Failed to create streaming session:", error);
      
      // ✅ Improved error messaging - show backend error message directly
      let errorMessage = "Failed to create streaming session";
      
      if (error?.response?.data) {
        const backendMessage = error.response.data.message || error.response.data.error;
        if (backendMessage) {
          errorMessage = backendMessage;
          console.error("[StartStreamModal] Backend error:", {
            status: error.response.status,
            message: backendMessage,
            data: error.response.data,
          });
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = handleApiError(error);
      }
      
      setError(errorMessage);
      // ✅ Do NOT swallow errors - user sees them in UI
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Start Stream"
      description="Configure and start a live stream"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ✅ Error display - visible to user */}
        {error && (
          <div className="border-2 border-red-600 bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-400 font-semibold mb-1">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stream Title */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Stream Title *
          </label>
          <input
            type="text"
            required
            maxLength={80}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="Enter stream title"
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          >
            <option value="Music">Music</option>
            <option value="Comedy">Comedy</option>
            <option value="Podcast">Podcast</option>
            <option value="Talk">Talk</option>
            <option value="Workshop">Workshop</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Description
          </label>
          <textarea
            maxLength={300}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none resize-none"
            rows={3}
            placeholder="Describe your stream"
            disabled={isSubmitting}
          />
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
              <span className="text-white">Private</span>
            </label>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Duration (minutes)
          </label>
          <input
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="60"
            disabled={isSubmitting}
          />
        </div>

        {/* Notify Followers */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notifyFollowers}
              onChange={(e) => setFormData({ ...formData, notifyFollowers: e.target.checked })}
              className="w-4 h-4 text-[#CD000E] focus:ring-[#CD000E] rounded"
              disabled={isSubmitting}
            />
            <span className="text-white text-sm">Notify Followers</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={closeModal}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Starting..." : "Go Live"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
