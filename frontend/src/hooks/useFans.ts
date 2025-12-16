import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fansService } from "@/services";
import type { ManageFanRequest } from "@/services";

export function useManageFan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityId,
      userId,
      data,
    }: {
      entityId: string;
      userId: string;
      data: ManageFanRequest;
    }) => fansService.manageFan(entityId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow"] });
      queryClient.invalidateQueries({ queryKey: ["fans"] });
    },
  });
}






