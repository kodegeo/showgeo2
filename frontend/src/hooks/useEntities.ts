import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { entitiesService } from "@/services";
import type {
  QueryParams,
  CreateEntityRequest,
  UpdateEntityRequest,
  AddCollaboratorRequest,
} from "@/services";


export function useEntities(params?: QueryParams & { type?: string; isVerified?: boolean }) {
  const queryClient = useQueryClient();

  // LIST
  const listQuery = useQuery({
    queryKey: ["entities", params],
    queryFn: () => entitiesService.getAll(params),
  });

  // HELPERS
  const getBySlugQuery = (slug: string) =>
    useQuery({
      queryKey: ["entity", "slug", slug],
      queryFn: () => entitiesService.getBySlug(slug),
      enabled: !!slug,
    });

  const getByIdQuery = (id: string) =>
    useQuery({
      queryKey: ["entity", "id", id],
      queryFn: () => entitiesService.getById(id),
      enabled: !!id,
    });

  // UPDATE
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => entitiesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
  
  return {
    list: listQuery,
    getBySlug: getBySlugQuery,
    getById: getByIdQuery,
    update: updateMutation.mutateAsync,
  };
}

export function useEntity(id: string) {
  return useQuery({
    queryKey: ["entities", id],
    queryFn: () => entitiesService.getById(id),
    enabled: !!id,
  });
}

export function useEntityBySlug(slug: string) {
  return useQuery({
    queryKey: ["entities", "slug", slug],
    queryFn: () => entitiesService.getBySlug(slug),
    enabled: !!slug,
  });
}

export function useCreateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEntityRequest) => entitiesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEntityRequest }) =>
      entitiesService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["entities", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["entities", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => entitiesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useEntityCollaborators(entityId: string) {
  return useQuery({
    queryKey: ["entities", entityId, "collaborators"],
    queryFn: () => entitiesService.getCollaborators(entityId),
    enabled: !!entityId,
  });
}

export function useAddCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityId,
      data,
    }: {
      entityId: string;
      data: AddCollaboratorRequest;
    }) => entitiesService.addCollaborator(entityId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["entities", variables.entityId, "collaborators"],
      });
      queryClient.invalidateQueries({ queryKey: ["entities", variables.entityId] });
    },
  });
}

export function useRemoveCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entityId, userId }: { entityId: string; userId: string }) =>
      entitiesService.removeCollaborator(entityId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["entities", variables.entityId, "collaborators"],
      });
      queryClient.invalidateQueries({ queryKey: ["entities", variables.entityId] });
    },
  });
}

export function useCreatorApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      brandName: string;
      category: "musician" | "comedian" | "speaker" | "dancer" | "fitness";
      purpose: string;
      socialLinks?: Record<string, string>;
      website?: string;
      thumbnail?: string;
      bannerImage?: string;
      termsAccepted: boolean;
    }) => entitiesService.creatorApply(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * PATCH an existing entity (draft updates, resubmission prep, etc.)
 * 
 * Accepts:
 *  { id: string, data: Partial<Entity> }
 */
export function useUpdateEntityDraft() {
  const queryClient = useQueryClient(); // ✅ FIX

  return useMutation({
    mutationFn: async (params: { id: string; data: any }) => {
      const { id, data } = params;
      const res = await axios.patch(`/api/entities/${id}`, data);
      return res.data;
    },

    onSuccess: (_, variables) => {
      // Invalidate entity list
      queryClient.invalidateQueries({ queryKey: ["entities"] });

      // Invalidate the specific entity
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["entities", variables.id] });
      }
    },
  });
}


