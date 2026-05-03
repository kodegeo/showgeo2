import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEventAnalytics } from "@/hooks/useEvents";
import { eventsService, followService } from "@/services";
import { useToast } from "@/hooks/creator/useToast";
import { Send, Mail, MessageSquare, Users, Ticket } from "lucide-react";

export interface EventManageMessagingTabProps {
  eventId: string;
  event: { entityId: string; name: string };
}

type AudienceType = "FOLLOWERS" | "TICKET_HOLDERS" | "CUSTOM";
type ChannelType = "IN_APP" | "EMAIL";

export function EventManageMessagingTab({ eventId, event }: EventManageMessagingTabProps) {
  const { toast } = useToast();
  const { data: analytics } = useEventAnalytics(eventId);

  const { data: followCounts } = useQuery({
    queryKey: ["follow-counts", event.entityId],
    queryFn: () => followService.getFollowCounts(event.entityId),
    enabled: !!event.entityId,
  });

  const [audience, setAudience] = useState<AudienceType>("FOLLOWERS");
  const [channel, setChannel] = useState<ChannelType>("IN_APP");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const followerCount = followCounts?.followers ?? 0;
  const ticketHolderCount = analytics?.ticketsIssued ?? analytics?.registrationsCount ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        type: "error",
        title: "Title required",
        description: "Enter a title for your message.",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        type: "error",
        title: "Message required",
        description: "Enter the message body.",
      });
      return;
    }

    const currentCount = audience === "FOLLOWERS" ? followerCount : ticketHolderCount;
    if (currentCount === 0) {
      const audienceLabel = audience === "FOLLOWERS" ? "followers" : "ticket holders";
      const confirmed = window.confirm(
        `You have no ${audienceLabel}. This message will not reach anyone. Continue?`,
      );
      if (!confirmed) return;
    }

    try {
      setIsSubmitting(true);
      const result = await eventsService.createBlast(eventId, {
        audience,
        channel,
        title: title.trim(),
        message: message.trim(),
      });

      if (result.recipientsCount === 0) {
        toast({
          type: "warning",
          title: "Blast sent",
          description: "No users received this message (empty audience).",
        });
      } else {
        const audienceLabel = audience === "FOLLOWERS" ? "followers" : "ticket holders";
        toast({
          type: "success",
          title: "Blast sent",
          description: `Delivered to ${result.recipientsCount} ${audienceLabel}`,
        });
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        type: "error",
        title: "Failed to send",
        description: err?.response?.data?.message ?? "Something went wrong",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-white/70">
        Send an in-app message to your audience. Message history will appear here in a future
        update.
      </p>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-6"
      >
        <div>
          <label className="block text-sm font-semibold text-white mb-3">Audience</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <p className="text-xs text-gray-400">~{followerCount.toLocaleString()} followers</p>
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
                <span className="text-white font-semibold text-sm">Ticket holders</span>
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

        <div>
          <label className="block text-sm font-semibold text-white mb-3">Channel</label>
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
                <span className="text-white font-semibold text-sm">In-app</span>
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

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Headline"
            maxLength={100}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#CD000E]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Your message…"
            rows={6}
            maxLength={1000}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#CD000E] resize-none"
          />
          <p className="text-xs text-white/40 mt-1">{message.length}/1000</p>
        </div>

        {audience === "FOLLOWERS" && followerCount === 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-400">
              <strong>Warning:</strong> No followers yet. This message will not reach anyone.
            </p>
          </div>
        )}
        {audience === "TICKET_HOLDERS" && ticketHolderCount === 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-400">
              <strong>Warning:</strong> No ticket holders yet. This message will not reach anyone.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !message.trim()}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? "Sending…" : "Send blast"}
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-6">
        <h3 className="text-sm font-medium text-white/80 mb-1">Message history</h3>
        <p className="text-sm text-white/45">Past blasts will appear here in a future update.</p>
      </section>
    </div>
  );
}
