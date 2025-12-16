import { useMutation, useQueryClient } from "@tanstack/react-query";
import { streamingService, eventsService } from "@/services";
import type { CreateSessionRequest, CreateEventRequest } from "@/services";

interface StartStreamRequest {
  entityId: string;
  title: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  notifyFollowers?: boolean;
}

export function useStartStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StartStreamRequest) => {
      // Create a temporary event for the stream
      // TODO: Update when backend has dedicated /api/stream/start endpoint
      const event = await eventsService.create({
        entityId: data.entityId,
        name: data.title,
        description: data.description,
        eventType: "LIVE",
        startTime: new Date().toISOString(),
        status: "LIVE",
      } as CreateEventRequest);

      // Create streaming session for the event
      const session = await streamingService.createSession(event.id, {
        accessLevel: data.isPublic ? "PUBLIC" : "REGISTERED",
      } as CreateSessionRequest);

      return { ...session, eventId: event.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaming", "active"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

