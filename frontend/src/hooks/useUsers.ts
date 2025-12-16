import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/services";
import type {
  QueryParams,
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
} from "@/services";

export function useUsers(params?: QueryParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersService.getAll(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => usersService.getById(id),
    enabled: !!id,
  });
}

export function useUserByUsername(username: string) {
  return useQuery({
    queryKey: ["users", "username", username],
    queryFn: () => usersService.getByUsername(username),
    enabled: !!username,
  });
}

export function useUserEntities(userId: string) {
  return useQuery({
    queryKey: ["users", userId, "entities"],
    queryFn: () => usersService.getEntities(userId),
    enabled: !!userId && userId.trim() !== "", // Only enable if userId is a valid non-empty string
  });
}

export function useCreateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: CreateUserProfileRequest }) =>
      usersService.createProfile(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateUserProfileRequest;
    }) => usersService.updateProfile(id, data),
    onSuccess: (updatedUser, variables) => {
      // Keep any user-specific caches fresh
      queryClient.setQueryData(["users", variables.id], updatedUser);

      // 🔥 Also update the auth "me" cache so useAuth immediately sees new profile
      // This must happen BEFORE invalidating to prevent stale data from overwriting
      queryClient.setQueryData(["auth", "me"], updatedUser);

      // Invalidate any user lists (but NOT ["auth", "me"] to avoid refetch overwriting our update)
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      // Note: We don't invalidate ["auth", "me"] here because we just set it above
      // Invalidating would trigger a refetch that might return stale data
    },
  });
}

export function useUpgradeToCreator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => usersService.upgradeToCreator(),
    onSuccess: (data) => {
      // Invalidate user queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["users", data.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      // Invalidate auth query to refresh user in auth context
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

