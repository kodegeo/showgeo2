import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services";

export function useEntityAnalytics(entityId: string) {
  return useQuery({
    queryKey: ["analytics", "entity", entityId],
    queryFn: () => analyticsService.getEntityAnalytics(entityId),
    enabled: !!entityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEventPerformance(eventId: string) {
  return useQuery({
    queryKey: ["analytics", "event", eventId],
    queryFn: () => analyticsService.getEventPerformance(eventId),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUserEngagement(userId: string) {
  return useQuery({
    queryKey: ["analytics", "user", userId],
    queryFn: () => analyticsService.getUserEngagement(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePlatformOverview() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analyticsService.getPlatformOverview(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useRecommendations(userId: string) {
  return useQuery({
    queryKey: ["analytics", "recommendations", userId],
    queryFn: () => analyticsService.getRecommendations(userId),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}













