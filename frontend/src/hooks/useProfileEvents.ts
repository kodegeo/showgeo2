import { useEvents } from "@/hooks/useEvents";
import type { ProfileEvent } from "../../../packages/shared/types/event.views";

export function useProfileEvents(entityId?: string) {
  const query = useEvents({ entityId });

  const items: ProfileEvent[] = query.data?.data ?? [];

  return {
    ...query,
    items, // convenience alias
  };
}
