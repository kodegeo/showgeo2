import { useQuery } from "@tanstack/react-query";
import { engagementService } from "@/services/engagement.service";
import { useEventClient } from "@/lib/event-client";

export function useEventEnergy(eventId: string | undefined, options?: { enabled?: boolean }) {
  const client = useEventClient();

  return useQuery({
    queryKey: ["event-energy", eventId],
    queryFn: () =>
      client && eventId && client.eventId === eventId
        ? client.getEnergy()
        : engagementService.getEnergy(eventId!),
    enabled: Boolean(eventId) && options?.enabled !== false,
  });
}
