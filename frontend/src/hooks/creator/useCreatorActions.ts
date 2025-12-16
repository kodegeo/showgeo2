import { useMutation, useQueryClient } from "@tanstack/react-query";
import { creatorService } from "@/services/creator/creator.service";
import type {
  CreateEventWithThumbnailRequest,
  CreatePostWithMediaRequest,
  CreateProductWithImageRequest,
  StartStreamRequest,
  UploadMediaRequest,
} from "@/services/creator/creator.service";
import type { ManageFanRequest } from "@/services/fans.service";
import { useToast } from "./useToast";

/**
 * Hook for creating events with optimistic updates
 */
export function useCreateEventWithThumbnail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateEventWithThumbnailRequest) => creatorService.createEvent(data),
    onMutate: async (newEvent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["events"] });

      // Snapshot previous value
      const previousEvents = queryClient.getQueryData(["events"]);

      // Optimistically update
      queryClient.setQueryData(["events"], (old: any) => {
        const optimisticEvent = {
          id: `temp-${Date.now()}`,
          ...newEvent,
          status: "DRAFT",
          phase: "PRE_LIVE",
          createdAt: new Date().toISOString(),
        };
        return {
          ...old,
          data: [optimisticEvent, ...(old?.data || [])],
        };
      });

      return { previousEvents };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        type: "success",
        title: "Event created successfully!",
        duration: 3000,
      });
    },
    onError: (error, newEvent, context) => {
      // Rollback on error
      if (context?.previousEvents) {
        queryClient.setQueryData(["events"], context.previousEvents);
      }
      toast({
        type: "error",
        title: "Could not create event.",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    },
  });
}

/**
 * Hook for uploading media with optimistic updates
 */
export function useUploadMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UploadMediaRequest) => creatorService.uploadMedia(data),
    onMutate: async (newMedia) => {
      await queryClient.cancelQueries({ queryKey: ["assets"] });

      const previousAssets = queryClient.getQueryData(["assets"]);

      queryClient.setQueryData(["assets"], (old: any) => {
        const optimisticAsset = {
          id: `temp-${Date.now()}`,
          url: URL.createObjectURL(newMedia.file),
          type: newMedia.type,
          ownerId: newMedia.entityId,
          createdAt: new Date().toISOString(),
        };
        return {
          ...old,
          data: [optimisticAsset, ...(old?.data || [])],
        };
      });

      return { previousAssets };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({
        type: "success",
        title: "Upload complete!",
        duration: 3000,
      });
    },
    onError: (error, newMedia, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(["assets"], context.previousAssets);
      }
      toast({
        type: "error",
        title: "Upload failed.",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    },
  });
}

/**
 * Hook for creating posts with optimistic updates
 */
export function useCreatePostWithMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreatePostWithMediaRequest & { entityId: string }) =>
      creatorService.createPost(data),
    onMutate: async (newPost) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const previousPosts = queryClient.getQueryData(["posts"]);

      queryClient.setQueryData(["posts"], (old: any) => {
        const optimisticPost = {
          id: `temp-${Date.now()}`,
          ...newPost,
          createdAt: new Date().toISOString(),
        };
        return {
          ...old,
          data: [optimisticPost, ...(old?.data || [])],
        };
      });

      return { previousPosts };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({
        type: "success",
        title: "Post published!",
        duration: 3000,
      });
    },
    onError: (error, newPost, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
      toast({
        type: "error",
        title: "Could not publish post.",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    },
  });
}

/**
 * Hook for adding products with optimistic updates
 */
export function useAddProductWithImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateProductWithImageRequest & { storeId: string; entityId: string }) =>
      creatorService.addProduct(data),
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: ["stores", newProduct.storeId, "products"] });

      const previousProducts = queryClient.getQueryData(["stores", newProduct.storeId, "products"]);

      queryClient.setQueryData(["stores", newProduct.storeId, "products"], (old: any) => {
        const optimisticProduct = {
          id: `temp-${Date.now()}`,
          ...newProduct,
          createdAt: new Date().toISOString(),
        };
        return {
          ...old,
          data: [optimisticProduct, ...(old?.data || [])],
        };
      });

      return { previousProducts };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stores", variables.storeId, "products"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast({
        type: "success",
        title: "Product added to store.",
        duration: 3000,
      });
    },
    onError: (error, newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(
          ["stores", newProduct.storeId, "products"],
          context.previousProducts,
        );
      }
      toast({
        type: "error",
        title: "Error adding product.",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    },
  });
}

/**
 * Hook for starting streams with optimistic updates
 */
export function useStartStreamWithOptimistic() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: StartStreamRequest) => creatorService.startStream(data),
    onMutate: async (newStream) => {
      await queryClient.cancelQueries({ queryKey: ["streaming", "active"] });
      await queryClient.cancelQueries({ queryKey: ["events"] });

      const previousSessions = queryClient.getQueryData(["streaming", "active"]);
      const previousEvents = queryClient.getQueryData(["events"]);

      // Optimistically add to active sessions
      queryClient.setQueryData(["streaming", "active"], (old: any) => {
        const optimisticSession = {
          id: `temp-${Date.now()}`,
          eventId: `temp-event-${Date.now()}`,
          entityId: newStream.entityId,
          active: true,
          startTime: new Date().toISOString(),
        };
        return [...(old || []), optimisticSession];
      });

      return { previousSessions, previousEvents };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaming", "active"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        type: "success",
        title: "Stream started!",
        duration: 3000,
      });
    },
    onError: (error, newStream, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(["streaming", "active"], context.previousSessions);
      }
      if (context?.previousEvents) {
        queryClient.setQueryData(["events"], context.previousEvents);
      }
      toast({
        type: "error",
        title: "Stream connection failed.",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    },
  });
}

/**
 * Hook for managing fans with optimistic updates
 */
export function useManageFanWithOptimistic() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      entityId: string;
      userId: string;
      action: ManageFanRequest["action"];
      notes?: string;
    }) => creatorService.manageFan(data),
    onMutate: async (fanData) => {
      await queryClient.cancelQueries({ queryKey: ["follow", fanData.entityId, "followers"] });
      await queryClient.cancelQueries({ queryKey: ["follow", "status", fanData.entityId] });

      const previousFollowers = queryClient.getQueryData([
        "follow",
        fanData.entityId,
        "followers",
      ]);
      const previousStatus = queryClient.getQueryData(["follow", "status", fanData.entityId]);

      // Optimistically update follow status
      if (fanData.action === "Follow") {
        queryClient.setQueryData(["follow", "status", fanData.entityId], true);
      } else if (fanData.action === "Unfollow") {
        queryClient.setQueryData(["follow", "status", fanData.entityId], false);
      }

      return { previousFollowers, previousStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow"] });
      queryClient.invalidateQueries({ queryKey: ["fans"] });
      toast({
        type: "success",
        title: "Fan updated successfully.",
        duration: 3000,
      });
    },
    onError: (error, fanData, context) => {
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(
          ["follow", "status", fanData.entityId],
          context.previousStatus,
        );
      }
      if (context?.previousFollowers) {
        queryClient.setQueryData(
          ["follow", fanData.entityId, "followers"],
          context.previousFollowers,
        );
      }
      toast({
        type: "error",
        title: "Failed to update fan.",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    },
  });
}

/**
 * Hook for deleting resources with optimistic updates
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { resourceType: string; resourceId: string }) =>
      creatorService.deleteResource(data.resourceType, data.resourceId),
    onMutate: async ({ resourceType, resourceId }) => {
      const queryKey = [resourceType.toLowerCase() + "s"];
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically remove from list
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((item: any) => item.id !== resourceId),
        };
      });

      return { previousData, queryKey };
    },
    onSuccess: (_, variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
      toast({
        type: "success",
        title: "Deleted successfully.",
        duration: 3000,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast({
        type: "error",
        title: "Could not delete item.",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    },
  });
}

