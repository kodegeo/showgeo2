import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventActivitiesService } from "@/services/event-activities.service";
import type { EventPhase } from "@/types/eventPhase";
import type { EventActivity } from "@/services/event-activities.service";

/**
 * Hook to fetch event activities
 * 
 * Phase 5C.1: READ-ONLY
 * 
 * @param eventId - Event ID
 * @param phase - Optional phase filter
 */
export function useEventActivities(
  eventId: string | undefined,
  phase?: EventPhase,
) {
  return useQuery<EventActivity[]>({
    queryKey: ["event-activities", eventId, phase],
    queryFn: () => eventActivitiesService.getActivities(eventId!, phase),
    enabled: !!eventId,
  });
}

/**
 * Hook to launch an activity
 * 
 * Phase 5C.2: Activity lifecycle mutations
 */
export function useLaunchActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activityId: string) =>
      eventActivitiesService.launchActivity(activityId),
    onSuccess: (data) => {
      // Invalidate all activity queries for this event
      queryClient.invalidateQueries({
        queryKey: ["event-activities", data.eventId],
      });
    },
  });
}

/**
 * Hook to complete an activity
 * 
 * Phase 5C.2: Activity lifecycle mutations
 */
export function useCompleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activityId: string) =>
      eventActivitiesService.completeActivity(activityId),
    onSuccess: (data) => {
      // Invalidate all activity queries for this event
      queryClient.invalidateQueries({
        queryKey: ["event-activities", data.eventId],
      });
    },
  });
}

