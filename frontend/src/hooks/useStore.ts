import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storeService } from "@/services";
import type {
  QueryParams,
  CreateStoreRequest,
  UpdateStoreRequest,
  CreateProductRequest,
  UpdateProductRequest,
} from "@/services";
import type { StoreVisibility } from "../../../packages/shared/types/store.types";

export function useStores(
  params?: QueryParams & {
    entityId?: string;
    isActive?: boolean;
    visibility?: StoreVisibility;
  },
) {
  return useQuery({
    queryKey: ["stores", params],
    queryFn: () => storeService.getAll(params),
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: ["stores", id],
    queryFn: () => storeService.getById(id),
    enabled: !!id,
  });
}

export function useStoreByEntity(entityId: string) {
  return useQuery({
    queryKey: ["stores", "entity", entityId],
    queryFn: () => storeService.getByEntity(entityId),
    enabled: !!entityId,
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStoreRequest) => storeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStoreRequest }) =>
      storeService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["stores", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["stores", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => storeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}

export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: CreateProductRequest }) =>
      storeService.addProduct(storeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stores", variables.storeId] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductRequest }) =>
      storeService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => storeService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}













