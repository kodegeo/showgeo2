import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api";

export function useTours() {
  const getByEntity = (entityId: string) =>
    useQuery({
      queryKey: ["tours", "entity", entityId],
      queryFn: async () => {
        const { data } = await apiClient.get(`/tours?entityId=${entityId}`);
        return data;
      },
      enabled: !!entityId,
    });

  const getBySlug = (slug: string) =>
    useQuery({
      queryKey: ["tour", "slug", slug],
      queryFn: async () => {
        const { data } = await apiClient.get(`/tours/slug/${slug}`);
        return data;
      },
      enabled: !!slug,
    });

  return {
    getByEntity,
    getBySlug,
  };
}
