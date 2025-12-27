import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { eventsService } from "@/services";
import type {
  QueryParams,
  CreateEventRequest,
  UpdateEventRequest,
  UpdateMetricsRequest,
  TestResultsRequest,
} from "@/services";
import type { EventPhase, EventStatus, Event } from "../../../packages/shared/types";
import type { PaginatedResponse } from "@/services/types";

export function useEvents(
  params?: QueryParams & {
    entityId?: string;
    phase?: EventPhase;
    status?: EventStatus;
    type?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: Omit<UseQueryOptions<PaginatedResponse<Event>>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["events", params],
    queryFn: () => eventsService.getAll(params),
    ...options,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => eventsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventRequest) => eventsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventRequest }) =>
      eventsService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["events", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["events", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => eventsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useTransitionEventPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, phase }: { id: string; phase: EventPhase }) =>
      eventsService.transitionPhase(id, phase),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["events", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["events", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useExtendEventPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, duration }: { id: string; duration: number }) =>
      eventsService.extendPhase(id, duration),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["events", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["events", variables.id] });
    },
  });
}

export function useEventMetrics(eventId: string) {
  return useQuery({
    queryKey: ["events", eventId, "metrics"],
    queryFn: () => eventsService.getMetrics(eventId),
    enabled: !!eventId,
    refetchInterval: 30000, // Refetch every 30 seconds for live metrics
  });
}

export function useUpdateEventMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMetricsRequest }) =>
      eventsService.updateMetrics(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "metrics"] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.id] });
    },
  });
}

export function useLogTestResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TestResultsRequest }) =>
      eventsService.logTestResults(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id] });
    },
  });
}


