import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEvent, useEventAnalytics } from "@/hooks/useEvents";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { useToast } from "@/hooks/creator/useToast";
import { eventsService, followService } from "@/services";
import { ArrowLeft, Send, Mail, MessageSquare, Users, Ticket } from "lucide-react";

type AudienceType = "FOLLOWERS" | "TICKET_HOLDERS" | "CUSTOM";
type ChannelType = "IN_APP" | "EMAIL";

export function CreatorEventBlastPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: event, isLoading } = useEvent(eventId!);
  const { data: analytics } = useEventAnalytics(eventId!);

  // Fetch follower count for the entity
  const { data: followCounts } = useQuery({
    queryKey: ["follow-counts", event?.entityId],
    queryFn: () => followService.getFollowCounts(event!.entityId),
    enabled: !!event?.entityId,
  });

  const [audience, setAudience] = useState<AudienceType>("FOLLOWERS");
  const [channel, setChannel] = useState<ChannelType>("IN_APP");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get audience counts
  const followerCount = followCounts?.followers ?? 0;
  const ticketHolderCount = analytics?.ticketsIssued ?? analytics?.registrationsCount ?? 0;

  if (isLoading) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-white/60">Loading event…</div>
      </CreatorDashboardLayout>
    );
  }

  if (!event) {
    return (
      <CreatorDashboardLayout>
        <div className="p-6 text-red-400">Event not found</div>
      </CreatorDashboardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        type: "error",
        title: "Title Required",
        description: "Please enter a title for your blast",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        type: "error",
        title: "Message Required",
        description: "Please enter a message for your blast",
      });
      return;
    }

    // Check audience count and show warning if zero
    const currentCount = audience === "FOLLOWERS" ? followerCount : ticketHolderCount;
    if (currentCount === 0) {
      const audienceLabel = audience === "FOLLOWERS" ? "followers" : "ticket holders";
      const confirmed = window.confirm(
        `Warning: You have no ${audienceLabel}. This message will not reach anyone. Do you want to continue?`
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const result = await eventsService.createBlast(eventId!, {
        audience,
        channel,
        title: title.trim(),
        message: message.trim(),
      });

      // Show appropriate success message based on delivery count
      if (result.recipientsCount === 0) {
        toast({
          type: "warning",
          title: "Blast Sent",
          description: "No users received this message. The audience is empty.",
        });
      } else {
        const audienceLabel = audience === "FOLLOWERS" ? "followers" : "ticket holders";
        toast({
          type: "success",
          title: "Blast Sent",
          description: `Delivered to ${result.recipientsCount} ${audienceLabel}`,
        });
      }

      // Navigate back to event dashboard
      navigate(`/creator/events/${eventId}`);
    } catch (error: any) {
      toast({
        type: "error",
        title: "Failed to Create Blast",
        description: error?.response?.data?.message || "An error occurred while creating the blast",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/creator/events/${eventId}`);
  };

  return (
    <CreatorDashboardLayout>
      <div className="p-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to={`/creator/events/${eventId}`}
            className="text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">Create Blast</h1>
            <p className="text-sm text-white/60 mt-1">{event.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Audience Selection */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Audience
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAudience("FOLLOWERS")}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  audience === "FOLLOWERS"
                    ? "border-[#CD000E] bg-[#CD000E]/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-white font-semibold text-sm">Followers</span>
                </div>
                <p className="text-xs text-gray-400">
                  ~{followerCount.toLocaleString()} followers
                </p>
              </button>
              <button
                type="button"
                onClick={() => setAudience("TICKET_HOLDERS")}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  audience === "TICKET_HOLDERS"
                    ? "border-[#CD000E] bg-[#CD000E]/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Ticket className="w-5 h-5 text-gray-400" />
                  <span className="text-white font-semibold text-sm">Ticket Holders</span>
                </div>
                <p className="text-xs text-gray-400">
                  ~{ticketHolderCount.toLocaleString()} ticket holders
                </p>
              </button>
              <button
                type="button"
                disabled
                className="p-4 border-2 border-gray-800 rounded-lg opacity-50 cursor-not-allowed text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-500 font-semibold text-sm">Custom</span>
                </div>
                <p className="text-xs text-gray-500">Coming soon</p>
              </button>
            </div>
          </div>

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Channel
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannel("IN_APP")}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  channel === "IN_APP"
                    ? "border-[#CD000E] bg-[#CD000E]/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                  <span className="text-white font-semibold text-sm">In-App</span>
                </div>
                <p className="text-xs text-gray-400">Showgeo inbox</p>
              </button>
              <button
                type="button"
                disabled
                className="p-4 border-2 border-gray-800 rounded-lg opacity-50 cursor-not-allowed text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-500 font-semibold text-sm">Email</span>
                </div>
                <p className="text-xs text-gray-500">Coming soon</p>
              </button>
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter blast title..."
              maxLength={100}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#CD000E]"
              required
            />
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Message <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={8}
              maxLength={1000}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#CD000E] resize-none"
              required
            />
            <p className="text-xs text-gray-400 mt-1">{message.length}/1000 characters</p>
          </div>

          {/* Warning for FOLLOWERS with zero count */}
          {audience === "FOLLOWERS" && followerCount === 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-sm text-yellow-400">
                <strong>Warning:</strong> No followers yet. This message will not reach anyone.
              </p>
            </div>
          )}

          {/* Warning for TICKET_HOLDERS with zero count */}
          {audience === "TICKET_HOLDERS" && ticketHolderCount === 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-sm text-yellow-400">
                <strong>Warning:</strong> No ticket holders yet. This message will not reach anyone.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !message.trim()}
              className="px-6 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? "Creating..." : "Send Blast"}
            </button>
          </div>
        </form>
      </div>
    </CreatorDashboardLayout>
  );
}
