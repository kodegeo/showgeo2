import { useState, useMemo } from "react";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { eventsService } from "@/services";
import { useToast } from "@/hooks/creator/useToast";
import { Calendar, Clock, Users, Ticket, MessageSquare } from "lucide-react";

type ReminderType = "FOLLOWERS" | "TICKET_HOLDERS" | "CUSTOM";

interface ScheduleReminderModalProps {
  eventId: string;
  eventStartTime: string;
}

export function ScheduleReminderModal() {
  const { currentModal, closeModal, modalData } = useModalContext();
  const { showToast } = useToast();
  const [selectedType, setSelectedType] = useState<ReminderType>("FOLLOWERS");
  const [selectedTiming, setSelectedTiming] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("");
  const [messageTemplate, setMessageTemplate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = currentModal === "scheduleReminder";
  const eventData = modalData as ScheduleReminderModalProps | undefined;
  const eventId = eventData?.eventId;
  const eventStartTime = eventData?.eventStartTime;

  // Calculate preset timing options
  const timingOptions = useMemo(() => {
    if (!eventStartTime) return [];

    const startTime = new Date(eventStartTime);
    const now = new Date();

    const options: Array<{ label: string; value: string; scheduledFor: Date }> = [];

    // 24 hours before
    const dayBefore = new Date(startTime);
    dayBefore.setHours(dayBefore.getHours() - 24);
    if (dayBefore > now) {
      options.push({
        label: "24 hours before",
        value: "24h",
        scheduledFor: dayBefore,
      });
    }

    // 1 hour before
    const hourBefore = new Date(startTime);
    hourBefore.setHours(hourBefore.getHours() - 1);
    if (hourBefore > now) {
      options.push({
        label: "1 hour before",
        value: "1h",
        scheduledFor: hourBefore,
      });
    }

    // 10 minutes before
    const tenMinBefore = new Date(startTime);
    tenMinBefore.setMinutes(tenMinBefore.getMinutes() - 10);
    if (tenMinBefore > now) {
      options.push({
        label: "10 minutes before",
        value: "10m",
        scheduledFor: tenMinBefore,
      });
    }

    return options;
  }, [eventStartTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventId) {
      showToast({
        type: "error",
        message: "Event ID is required",
      });
      return;
    }

    let scheduledFor: Date;

    if (selectedTiming === "custom") {
      if (!customDate || !customTime) {
        showToast({
          type: "error",
          message: "Please select a custom date and time",
        });
        return;
      }
      scheduledFor = new Date(`${customDate}T${customTime}`);
    } else {
      const option = timingOptions.find((opt) => opt.value === selectedTiming);
      if (!option) {
        showToast({
          type: "error",
          message: "Please select a timing option",
        });
        return;
      }
      scheduledFor = option.scheduledFor;
    }

    if (scheduledFor <= new Date()) {
      showToast({
        type: "error",
        message: "Scheduled time must be in the future",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await eventsService.createReminder(eventId, {
        type: selectedType,
        scheduledFor: scheduledFor.toISOString(),
        messageTemplate: messageTemplate || undefined,
      });

      showToast({
        type: "success",
        message: `Reminder scheduled for ${scheduledFor.toLocaleString()}`,
      });

      closeModal();
      // Reset form
      setSelectedType("FOLLOWERS");
      setSelectedTiming(null);
      setCustomDate("");
      setCustomTime("");
      setMessageTemplate("");
    } catch (error: any) {
      showToast({
        type: "error",
        message: error?.response?.data?.message || "Failed to schedule reminder",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !eventId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Schedule Reminder"
      description="Schedule a reminder to be sent to your audience"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Audience Type */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">
            Audience
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectedType("FOLLOWERS")}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedType === "FOLLOWERS"
                  ? "border-[#CD000E] bg-[#CD000E]/10"
                  : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <Users className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <div className="text-sm font-semibold text-white">Followers</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("TICKET_HOLDERS")}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedType === "TICKET_HOLDERS"
                  ? "border-[#CD000E] bg-[#CD000E]/10"
                  : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <Ticket className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <div className="text-sm font-semibold text-white">Ticket Holders</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("CUSTOM")}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedType === "CUSTOM"
                  ? "border-[#CD000E] bg-[#CD000E]/10"
                  : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <div className="text-sm font-semibold text-white">Custom</div>
            </button>
          </div>
        </div>

        {/* Timing Options */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">
            Timing
          </label>
          <div className="space-y-2">
            {timingOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedTiming(option.value)}
                className={`w-full p-3 border-2 rounded-lg transition-all text-left ${
                  selectedTiming === option.value
                    ? "border-[#CD000E] bg-[#CD000E]/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-semibold">{option.label}</span>
                  <span className="text-gray-400 text-sm ml-auto">
                    {option.scheduledFor.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedTiming("custom")}
              className={`w-full p-3 border-2 rounded-lg transition-all text-left ${
                selectedTiming === "custom"
                  ? "border-[#CD000E] bg-[#CD000E]/10"
                  : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-white font-semibold">Custom Date & Time</span>
              </div>
            </button>
          </div>
        </div>

        {/* Custom Date/Time Inputs */}
        {selectedTiming === "custom" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Date
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#CD000E]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Time
              </label>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#CD000E]"
                required
              />
            </div>
          </div>
        )}

        {/* Message Template (Optional) */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Message Template (Optional)
          </label>
          <textarea
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            placeholder="Custom message for the reminder..."
            rows={3}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#CD000E] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedTiming}
            className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Scheduling..." : "Schedule Reminder"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
