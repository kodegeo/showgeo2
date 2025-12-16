import { useQuery } from "@tanstack/react-query";
import { useEntityContext } from "@/hooks/useEntityContext";
import { generateMockMetrics, type DashboardMetrics } from "@/services/creator/mockMetrics";
import { useState } from "react";

/**
 * Hook to fetch creator dashboard metrics
 * Uses mock data until backend endpoints are ready
 */
export function useCreatorMetrics(timeRange: "all" | "week" | "month" | "quarter" | "year" = "all") {
  const { currentEntity } = useEntityContext();

  return useQuery({
    queryKey: ["creator", "metrics", currentEntity?.id, timeRange],
    queryFn: () => {
      if (!currentEntity?.id) {
        return null;
      }
      // TODO: Replace with real API call when backend is ready
      // return creatorMetricsService.getMetrics(currentEntity.id, timeRange);
      return generateMockMetrics(currentEntity.id, timeRange);
    },
    enabled: !!currentEntity?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to manage time range filter state
 */
export function useTimeRangeFilter() {
  const [timeRange, setTimeRange] = useState<"all" | "week" | "month" | "quarter" | "year">("all");
  const [filterType, setFilterType] = useState<"all" | "free" | "paid">("all");

  return {
    timeRange,
    setTimeRange,
    filterType,
    setFilterType,
  };
}






