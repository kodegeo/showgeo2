import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetGreetService } from "@/services/meet-greet.service";
import type {
  MeetGreetSession,
  StartNextSessionResponse,
} from "@/services/meet-greet.service";

/**
 * Hook to fetch Meet & Greet queue
 * 
 * Phase 5C.4: VIP Meet & Greet integration
 */
export function useMeetGreetQueue(eventId: string | undefined) {
  return useQuery<MeetGreetSession[]>({
    queryKey: ["meet-greet", "queue", eventId],
    queryFn: () => meetGreetService.getQueue(eventId!),
    enabled: !!eventId,
  });
}

/**
 * Hook to fetch current active session
 * 
 * Phase 5C.4: VIP Meet & Greet integration
 */
export function useMeetGreetCurrent(eventId: string | undefined) {
  return useQuery<MeetGreetSession | null>({
    queryKey: ["meet-greet", "current", eventId],
    queryFn: () => meetGreetService.getCurrent(eventId!),
    enabled: !!eventId,
  });
}

/**
 * Hook to start next session
 * 
 * Phase 5C.4: VIP Meet & Greet integration
 */
export function useStartNextSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => meetGreetService.startNext(eventId),
    onSuccess: (data, eventId) => {
      // Invalidate queue and current session queries
      queryClient.invalidateQueries({
        queryKey: ["meet-greet", "queue", eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["meet-greet", "current", eventId],
      });
    },
  });
}

/**
 * Hook to complete a session
 * 
 * Phase 5C.4: VIP Meet & Greet integration
 */
export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      eventId,
    }: {
      sessionId: string;
      eventId: string;
    }) => meetGreetService.completeSession(sessionId),
    onSuccess: (data, variables) => {
      // Invalidate queue and current session queries
      queryClient.invalidateQueries({
        queryKey: ["meet-greet", "queue", variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["meet-greet", "current", variables.eventId],
      });
    },
  });
}

/**
 * Hook to mark a session as missed
 * 
 * Phase 5C.4: VIP Meet & Greet integration
 */
export function useMissSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      eventId,
    }: {
      sessionId: string;
      eventId: string;
    }) => meetGreetService.missSession(sessionId),
    onSuccess: (data, variables) => {
      // Invalidate queue and current session queries
      queryClient.invalidateQueries({
        queryKey: ["meet-greet", "queue", variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["meet-greet", "current", variables.eventId],
      });
    },
  });
}

/**
 * Hook to join VIP room (fan)
 * 
 * Phase 4D: VIP Meet & Greet LiveKit room routing
 */
export function useJoinVip() {
  return useMutation({
    mutationFn: (sessionId: string) => meetGreetService.joinVip(sessionId),
  });
}

