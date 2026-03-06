import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type {
  SuspendUserRequest,
  ReinstateUserRequest,
  DisableEntityRequest,
  ReinstateEntityRequest,
  TerminateEventRequest,
  AdminReport,
  PromoteUserRequest,
  DemoteUserRequest,
  DisableUserRequest,
  EnableUserRequest,
  ApproveEntityRequest,
  RejectEntityRequest,
  AcceptApplicationRequest,
  RejectApplicationRequest,
  BanApplicationRequest,
} from "@/services/admin.service";

/**
 * Get all users (admin only)
 */
export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminService.getUsers(),
  });
}

/**
 * Get all entities (admin only)
 */
export function useAdminEntities() {
  return useQuery({
    queryKey: ["admin", "entities"],
    queryFn: () => adminService.getEntities(),
  });
}

/**
 * Get all admin reports
 */
export function useAdminReports(status?: "OPEN" | "RESOLVED" | "DISMISSED") {
  return useQuery<AdminReport[]>({
    queryKey: ["admin", "reports", status],

    enabled: false, // 🔑 CRITICAL: do not auto-run

    queryFn: async () => {
      try {
        const data = await adminService.getReports(status);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        return [];
      }
    },

    retry: false,
    throwOnError: false, // 🔑 suppress React Query error propagation
    select: (data) => data ?? [],
    staleTime: 60_000,
  });
}

/**
 * Suspend user mutation
 */
export function useSuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: SuspendUserRequest }) =>
      adminService.suspendUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Reinstate user mutation
 */
export function useReinstateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: ReinstateUserRequest }) =>
      adminService.reinstateUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Disable entity mutation
 */
export function useDisableEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityId, payload }: { entityId: string; payload: DisableEntityRequest }) =>
      adminService.disableEntity(entityId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] });
    },
  });
}

/**
 * Reinstate entity mutation
 */
export function useReinstateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityId, payload }: { entityId: string; payload: ReinstateEntityRequest }) =>
      adminService.reinstateEntity(entityId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] });
    },
  });
}

/**
 * Terminate event mutation
 */
export function useTerminateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: TerminateEventRequest }) =>
      adminService.terminateEvent(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

/**
 * Resolve admin report mutation
 */
export function useResolveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: string; payload: { resolutionNotes?: string } }) =>
      adminService.resolveReport(reportId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
  });
}

/**
 * Promote user to ADMIN role mutation
 * Domain Rule: This only affects platform ADMIN role, not creator status.
 * Users become creators through approved applications.
 */
export function usePromoteToAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: { reason: string } }) =>
      adminService.promoteToAdmin(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Demote ADMIN user to USER role mutation
 * Domain Rule: This only affects platform ADMIN role, not creator status.
 * Cannot demote the last remaining ADMIN.
 */
export function useDemoteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: { reason: string } }) =>
      adminService.demoteAdmin(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Disable user mutation
 */
export function useDisableUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: DisableUserRequest }) =>
      adminService.disableUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Enable user mutation
 */
export function useEnableUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: EnableUserRequest }) =>
      adminService.enableUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Suspend entity mutation
 */
export function useSuspendEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityId, payload }: { entityId: string; payload: ApproveEntityRequest }) =>
      adminService.suspendEntity(entityId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] });
    },
  });
}

/**
 * Reject entity mutation
 */
export function useRejectEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityId, payload }: { entityId: string; payload: RejectEntityRequest }) =>
      adminService.rejectEntity(entityId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] });
    },
  });
}

/**
 * Get all entity applications (admin only)
 * Only fetches when enabled is true (typically when Applications tab is active)
 */
export function useAdminEntityApplications(enabled: boolean = true) {
  return useQuery({
    queryKey: ["admin", "entity-applications"],
    queryFn: async () => {
      const data = await adminService.getEntityApplications();
      return Array.isArray(data) ? data : [];
    },
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

/**
 * Get a single entity application by ID (admin only)
 */
export function useAdminEntityApplication(applicationId: string | null) {
  return useQuery({
    queryKey: ["admin", "entity-application", applicationId],
    queryFn: async () => {
      try {
        return await adminService.getEntityApplicationById(applicationId!);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!applicationId,
    retry: false,
  });
}

/**
 * Accept application mutation
 */
export function useAcceptApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, payload }: { applicationId: string; payload: AcceptApplicationRequest }) =>
      adminService.acceptApplication(applicationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entity-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Reject application mutation
 */
export function useRejectApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, payload }: { applicationId: string; payload: RejectApplicationRequest }) =>
      adminService.rejectApplication(applicationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entity-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] });
    },
  });
}

/**
 * Ban application mutation (IRREVERSIBLE)
 */
export function useBanApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicationId, payload }: { applicationId: string; payload: BanApplicationRequest }) =>
      adminService.banApplication(applicationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entity-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

