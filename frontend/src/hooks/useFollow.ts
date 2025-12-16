import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { followService } from "@/services";
import type { PaginatedResponse } from "@/services/types";

// -------------------------
// TYPES
// -------------------------
export interface Follower {
  id: string;
  userId: string;
  entityId: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      username?: string;
    };
  };
}

// -------------------------
// FOLLOWERS
// -------------------------
export function useFollowers(entityId: string, page = 1, limit = 20) {
  return useQuery<PaginatedResponse<Follower>>({
    queryKey: ["follow", entityId, "followers", page, limit],
    queryFn: () => followService.getFollowers(entityId, page, limit),
    enabled: !!entityId,
  });
}

// -------------------------
// FOLLOWING
// -------------------------
export function useFollowing(userId: string, page = 1, limit = 20) {
  return useQuery<PaginatedResponse<Follower>>({
    queryKey: ["follow", "user", userId, page, limit],
    queryFn: () => followService.getFollowing(userId, page, limit),
    enabled: !!userId,
  });
}

// -------------------------
// CHECK IF FOLLOWING
// -------------------------
export function useIsFollowing(entityId: string) {
  return useQuery({
    queryKey: ["follow", "status", entityId],
    queryFn: () => followService.isFollowing(entityId),
    enabled: !!entityId,
  });
}

// -------------------------
// FOLLOW
// -------------------------
export function useFollowEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => followService.followEntity(entityId),
    onSuccess: (_, entityId) => {
      queryClient.invalidateQueries({ queryKey: ["follow", "status", entityId] });
      queryClient.invalidateQueries({ queryKey: ["follow", entityId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["follow", "user"] });
      queryClient.invalidateQueries({ queryKey: ["entities", entityId] });
    },
  });
}

// -------------------------
// UNFOLLOW
// -------------------------
export function useUnfollowEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => followService.unfollowEntity(entityId),
    onSuccess: (_, entityId) => {
      queryClient.invalidateQueries({ queryKey: ["follow", "status", entityId] });
      queryClient.invalidateQueries({ queryKey: ["follow", entityId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["follow", "user"] });
      queryClient.invalidateQueries({ queryKey: ["entities", entityId] });
    },
  });
}
