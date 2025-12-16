import { apiClient } from "./api";

export interface Fan {
  id: string;
  userId: string;
  entityId: string;
  status: "active" | "blocked" | "invited";
  notes?: string;
  user: {
    id: string;
    email: string;
    profile?: {
      username?: string;
      avatarUrl?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface ManageFanRequest {
  action: "Follow" | "Unfollow" | "Block" | "Invite";
  notes?: string;
}

export const fansService = {
  /**
   * Manage fan (follow, unfollow, block, or invite)
   * Uses follow service for Follow/Unfollow, placeholder for Block/Invite
   */
  async manageFan(entityId: string, userId: string, data: ManageFanRequest): Promise<{ message: string }> {
    // For Follow/Unfollow, use the existing follow service endpoints
    if (data.action === "Follow") {
      const response = await apiClient.post<{ message: string }>(`/follow/${entityId}`);
      return response.data;
    }

    if (data.action === "Unfollow") {
      await apiClient.delete(`/follow/${entityId}`);
      return { message: "Unfollowed successfully" };
    }

    // For Block and Invite, use placeholder endpoint
    // TODO: Implement /api/fans/manage when backend is ready
    const response = await apiClient.post<{ message: string }>(`/fans/manage`, {
      entityId,
      userId,
      action: data.action,
      notes: data.notes,
    });
    return response.data;
  },
};






