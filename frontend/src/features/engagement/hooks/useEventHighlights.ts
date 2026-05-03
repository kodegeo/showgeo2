import { useQuery } from "@tanstack/react-query";
import { engagementService } from "@/services/engagement.service";
import { useEventClient } from "@/lib/event-client";

export function useEventHighlights(eventId: string | undefined, options?: { enabled?: boolean }) {
  const client = useEventClient();

  return useQuery({
    queryKey: ["event-highlights", eventId],
    queryFn: () =>
      client && eventId && client.eventId === eventId
        ? client.getHighlights()
        : engagementService.getHighlights(eventId!),
    enabled: Boolean(eventId) && options?.enabled !== false,
  });
}
