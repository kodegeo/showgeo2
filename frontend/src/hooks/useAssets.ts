import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetsService } from "@/services";
import type {
  AssetQueryParams,
  UploadAssetRequest,
} from "@/services";
import { AssetOwnerType } from "../../../packages/shared/types";

export function useAssets(params?: AssetQueryParams) {
  return useQuery({
    queryKey: ["assets", params],
    queryFn: () => assetsService.getAll(params),
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ["assets", id],
    queryFn: () => assetsService.getById(id),
    enabled: !!id,
  });
}

export function useAssetUrl(id: string) {
  return useQuery({
    queryKey: ["assets", id, "url"],
    queryFn: () => assetsService.getUrl(id),
    enabled: !!id,
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UploadAssetRequest) => assetsService.upload(data),
    onSuccess: (_, variables) => {
      // Invalidate user (avatar, banner)
      if (variables.ownerType === AssetOwnerType.USER) {
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        queryClient.invalidateQueries({ queryKey: ["user", variables.ownerId] });
      }

      // Invalidate entity images if it’s for an entity
      if (variables.ownerType === AssetOwnerType.ENTITY) {
        queryClient.invalidateQueries({ queryKey: ["entity", variables.ownerId] });
      }

      // Always invalidate assets
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}
