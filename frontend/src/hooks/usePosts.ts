import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsService } from "@/services";
import type { QueryParams, CreatePostRequest, UpdatePostRequest } from "@/services";

export function usePosts(params?: QueryParams & { entityId?: string; isPublic?: boolean }) {
  return useQuery({
    queryKey: ["posts", params],
    queryFn: () => postsService.getAll(params),
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: ["posts", id],
    queryFn: () => postsService.getById(id),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostRequest) => postsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostRequest }) =>
      postsService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["posts", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["posts", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => postsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}






