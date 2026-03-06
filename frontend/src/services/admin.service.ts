import { apiClient } from "./api";
import { supabase } from "../lib/supabase";

/**
 * Admin Service
 * 
 * SHOWGEO ADMIN / SUPERUSER API endpoints
 * Platform governance and enforcement
 */

export interface SuspendUserRequest {
  reason: string;
}

export interface ReinstateUserRequest {
  reason: string;
}

export interface DisableEntityRequest {
  reason: string;
}

export interface ReinstateEntityRequest {
  reason: string;
}

export interface TerminateEventRequest {
  reason: string;
}

export interface PromoteUserRequest {
  reason: string;
}

export interface DemoteUserRequest {
  reason: string;
}

export interface DisableUserRequest {
  reason: string;
}

export interface EnableUserRequest {
  reason: string;
}

export interface ApproveEntityRequest {
  reason: string;
}

export interface RejectEntityRequest {
  reason: string;
}

export interface AcceptApplicationRequest {
  reason: string;
}

export interface RejectApplicationRequest {
  reason: string;
}

export interface BanApplicationRequest {
  reason: string;
}

export interface EntityApplication {
  id: string;
  entityId: string;
  ownerId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "BANNED";
  reason?: string | null;
  proof?: any;
  createdAt: string;
  updatedAt: string;
  entityName?: string | null;
  entitySlug?: string | null;
  entityBio?: string | null;
  entityTags?: string[];
  entityStatus?: string | null;
  ownerEmail?: string | null;
  ownerRole?: string | null;
}

export interface User {
  id: string;
  email: string;
  role: string;
  account_status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
  createdAt: string;
  updatedAt: string;
  profile?: {
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface Entity {
  id: string;
  ownerAccountStatus?: "ACTIVE" | "SUSPENDED" | "DISABLED";
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "DISABLED";
  type: "INDIVIDUAL" | "ORGANIZATION";
  ownerId: string;
  ownerEmail?: string | null;
  createdAt: string;
  applicationId?: string;
  entity_application_id?: string;
}

export interface Event {
  id: string;
  name: string;
  status: string;
  phase: string;
  entityId: string;
  startTime: string;
}

export interface AdminReport {
  id: string;
  reporterUserId: string;
  reporterRole: string;
  message: string;
  entityId?: string;
  eventId?: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export const adminService = {
  /**
   * Suspend a user
   * PATCH /api/admin/users/:id/suspend
   */
  suspendUser: async (userId: string, payload: SuspendUserRequest) => {
    const response = await apiClient.patch(`/admin/users/${userId}/suspend`, payload);
    return response.data;
  },

  /**
   * Reinstate a user
   * PATCH /api/admin/users/:id/reinstate
   */
  reinstateUser: async (userId: string, payload: ReinstateUserRequest) => {
    const response = await apiClient.patch(`/admin/users/${userId}/reinstate`, payload);
    return response.data;
  },

  /**
   * Disable an entity
   * PATCH /api/admin/entities/:id/disable
   */
  disableEntity: async (entityId: string, payload: DisableEntityRequest) => {
    const response = await apiClient.patch(`/admin/entities/${entityId}/disable`, payload);
    return response.data;
  },

  /**
   * Reinstate an entity
   * PATCH /api/admin/entities/:id/reinstate
   */
  reinstateEntity: async (entityId: string, payload: ReinstateEntityRequest) => {
    const response = await apiClient.patch(`/admin/entities/${entityId}/reinstate`, payload);
    return response.data;
  },

  /**
   * Terminate an event
   * POST /api/admin/events/:id/terminate
   */
  terminateEvent: async (eventId: string, payload: TerminateEventRequest) => {
    const response = await apiClient.post(`/admin/events/${eventId}/terminate`, payload);
    return response.data;
  },

  /**
   * Get all admin reports
   * GET /api/admin/reports
   */
  getReports: async (status?: "OPEN" | "RESOLVED" | "DISMISSED"): Promise<AdminReport[]> => {
    const response = await apiClient.get<AdminReport[]>("/admin/reports", {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  /**
   * Resolve an admin report
   * PATCH /api/admin/reports/:id/resolve
   */
  resolveReport: async (reportId: string, payload: { resolutionNotes?: string }) => {
    const response = await apiClient.patch(`/admin/reports/${reportId}/resolve`, payload);
    return response.data;
  },

  /**
   * Get all users (admin only)
   * GET /api/admin/users
   */
  getUsers: async (): Promise<{ data: User[] }> => {
    const response = await apiClient.get<{ data: User[] }>("/admin/users");
    return response.data;
  },

  /**
   * Get all entities (admin only)
   * GET /api/admin/entities
   */
  getEntities: async (): Promise<{ data: Entity[] }> => {
    const response = await apiClient.get<{ data: Entity[] }>("/admin/entities");
    return response.data;
  },

  /**
   * Approve an entity
   * PATCH /api/admin/entities/:id/approve
   */
  suspendEntity: async (entityId: string, payload: { reason: string }) => {
    const response = await apiClient.patch(`/admin/entities/${entityId}/suspend`, payload);
    return response.data;
  },

  /**
   * Reject an entity
   * PATCH /api/admin/entities/:id/reject
   */
  rejectEntity: async (entityId: string, payload: { reason: string }) => {
    const response = await apiClient.patch(`/admin/entities/${entityId}/reject`, payload);
    return response.data;
  },

  /**
   * Promote a user to ADMIN role
   * PATCH /api/admin/users/:id/promote-to-admin
   * Domain Rule: This only affects platform ADMIN role, not creator status.
   */
  promoteToAdmin: async (userId: string, payload: { reason: string }) => {
    const response = await apiClient.patch(`/admin/users/${userId}/promote-to-admin`, payload);
    return response.data;
  },

  /**
   * Demote an ADMIN user to USER role
   * PATCH /api/admin/users/:id/demote-admin
   * Domain Rule: This only affects platform ADMIN role, not creator status.
   */
  demoteAdmin: async (userId: string, payload: { reason: string }) => {
    const response = await apiClient.patch(`/admin/users/${userId}/demote-admin`, payload);
    return response.data;
  },

  /**
   * Disable a user
   * PATCH /api/admin/users/:id/disable
   */
  disableUser: async (userId: string, payload: DisableUserRequest) => {
    const response = await apiClient.patch(`/admin/users/${userId}/disable`, payload);
    return response.data;
  },

  /**
   * Enable a user
   * PATCH /api/admin/users/:id/enable
   */
  enableUser: async (userId: string, payload: EnableUserRequest) => {
    const response = await apiClient.patch(`/admin/users/${userId}/enable`, payload);
    return response.data;
  },

  /**
   * Get all entity applications
   * GET /api/admin/entity-applications
   * Returns { data: ApplicationRow[] }
   */
  getEntityApplications: async (): Promise<any[]> => {
    const { data } = await supabase.auth.getSession();
  
    if (!data.session) {
      return [];
    }
  
    const token = data.session.access_token;
  
    if (!token) {
      return [];
    }
  
    const response = await apiClient.get<{ data: any[] }>("/admin/entity-applications", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },
      
  /**
   * Get a single entity application by ID
   * GET /api/admin/entity-applications/:id
   * Returns ApplicationRow with camelCase fields
   */
  getEntityApplicationById: async (applicationId: string): Promise<any> => {
    const response = await apiClient.get<any>(`/admin/entity-applications/${applicationId}`);
    return response.data;
  },

  /**
   * Accept an entity application
   * PATCH /api/admin/entity-applications/:id/accept
   */
  acceptApplication: async (applicationId: string, payload: AcceptApplicationRequest) => {
    const response = await apiClient.patch(`/admin/entity-applications/${applicationId}/accept`, payload);
    return response.data;
  },

  /**
   * Reject an entity application
   * PATCH /api/admin/entity-applications/:id/reject
   */
  rejectApplication: async (applicationId: string, payload: RejectApplicationRequest) => {
    const response = await apiClient.patch(`/admin/entity-applications/${applicationId}/reject`, payload);
    return response.data;
  },

  /**
   * Ban an entity application (IRREVERSIBLE)
   * PATCH /api/admin/entity-applications/:id/ban
   */
  banApplication: async (applicationId: string, payload: BanApplicationRequest) => {
    const response = await apiClient.patch(`/admin/entity-applications/${applicationId}/ban`, payload);
    return response.data;
  },

  /**
   * Get admin audit logs
   * GET /api/admin/audit-logs
   */
  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    adminId?: string;
    targetType?: "USER" | "ENTITY" | "APPLICATION";
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get<{
      data: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>("/admin/audit-logs", { params });
    return response.data;
  },
};

