import { useQuery } from "@tanstack/react-query";
import { fanInteractionService } from "@/services/fan-interaction.service";
import { useEventClient } from "@/lib/event-client";

export function useEventFans(eventId: string | undefined, options?: { enabled?: boolean }) {
  const client = useEventClient();

  return useQuery({
    queryKey: ["event-fans", eventId],
    queryFn: () =>
      client && eventId && client.eventId === eventId
        ? client.getFans()
        : fanInteractionService.getFans(eventId!),
    enabled: Boolean(eventId) && options?.enabled !== false,
  });
}
