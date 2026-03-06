import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { moderationService } from "@/services/moderation.service";
import type {
  ModerationReport,
  CreateReportRequest,
  UpdateReportStatusRequest,
} from "@/services/moderation.service";

/**
 * Hook to create a moderation report
 * 
 * Phase 6A: Moderation & Trust
 */
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: string;
      payload: CreateReportRequest;
    }) => moderationService.createReport(eventId, payload),
    onSuccess: (data) => {
      // Invalidate event reports and user reports
      queryClient.invalidateQueries({
        queryKey: ["moderation", "event-reports", data.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["moderation", "my-reports"],
      });
    },
  });
}

/**
 * Hook to fetch reports created by the current user
 * 
 * Phase 6A: Moderation & Trust
 */
export function useMyReports() {
  return useQuery<ModerationReport[]>({
    queryKey: ["moderation", "my-reports"],
    queryFn: () => moderationService.getMyReports(),
  });
}

/**
 * Hook to fetch reports for an event (producer/admin only)
 * 
 * Phase 6A: Moderation & Trust
 */
export function useEventReports(eventId: string | undefined) {
  return useQuery<ModerationReport[]>({
    queryKey: ["moderation", "event-reports", eventId],
    queryFn: () => moderationService.getEventReports(eventId!),
    enabled: !!eventId,
  });
}

/**
 * Hook to update report status
 * 
 * Phase 6A: Moderation & Trust
 */
export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      payload,
    }: {
      reportId: string;
      payload: UpdateReportStatusRequest;
    }) => moderationService.updateReportStatus(reportId, payload),
    onSuccess: (data) => {
      // Invalidate event reports
      queryClient.invalidateQueries({
        queryKey: ["moderation", "event-reports", data.eventId],
      });
    },
  });
}

