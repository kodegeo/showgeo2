import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsService } from "@/services";
import { useMailbox } from "@/hooks/useMailbox";
import { Check, Circle } from "lucide-react";
import type { Event } from "@/types/event.types";

interface PreLiveChecklistProps {
  event: Event;
}

export function PreLiveChecklist({ event }: PreLiveChecklistProps) {
  // Fetch reminders for this event
  const { data: reminders = [] } = useQuery({
    queryKey: ["event-reminders", event.id],
    queryFn: () => eventsService.getReminders(event.id),
    enabled: !!event.id,
  });

  // Fetch mailbox items to check for blasts
  const { data: mailboxItems = [] } = useMailbox();

  // Check if blast was sent for this event
  const hasBlast = useMemo(() => {
    return mailboxItems.some(
      (item) =>
        item.metadata?.eventId === event.id &&
        item.metadata?.actionType === "BLAST_SENT"
    );
  }, [mailboxItems, event.id]);

  // Checklist items
  const checklistItems = useMemo(() => {
    const hasTickets = Array.isArray(event.ticketTypes) && event.ticketTypes.length > 0;
    const hasReminder = reminders.length > 0;
    const hasLiveIntroduction = event.liveIntroduction?.enabled === true;

    return [
      {
        id: "tickets",
        label: "Tickets published",
        completed: hasTickets,
      },
      {
        id: "reminder",
        label: "Reminder scheduled",
        completed: hasReminder,
      },
      {
        id: "blast",
        label: "Blast sent",
        completed: hasBlast,
      },
      {
        id: "live-intro",
        label: "Live Introduction configured",
        completed: hasLiveIntroduction,
      },
    ];
  }, [event.ticketTypes, event.liveIntroduction, reminders.length, hasBlast]);

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;

  return (
    <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Pre-Live Checklist</h3>
        <span className="text-xs text-gray-400">
          {completedCount}/{totalCount} completed
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">Optional, but recommended</p>
      <div className="space-y-2">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 text-sm"
          >
            {item.completed ? (
              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-500 flex-shrink-0" />
            )}
            <span
              className={
                item.completed
                  ? "text-gray-300 line-through"
                  : "text-gray-400"
              }
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
