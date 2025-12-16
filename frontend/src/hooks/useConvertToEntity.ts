import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/services";
import type { ConvertToEntityRequest } from "@/services";

export function useConvertToEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: ConvertToEntityRequest }) =>
      usersService.convertToEntity(userId, data),
    onSuccess: (entity, variables) => {
      // Invalidate user and entities queries
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId, "entities"] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

      // Return entity so component can handle switching
      return entity;
    },
  });
}

