import { SetMetadata } from "@nestjs/common";

export const EVENT_PERMISSION_KEY = "eventPermission";

export type EventPermissionType = "phase" | "broadcaster";

export const RequireEventPhase = () => SetMetadata(EVENT_PERMISSION_KEY, "phase" as EventPermissionType);
export const RequireEventBroadcaster = () => SetMetadata(EVENT_PERMISSION_KEY, "broadcaster" as EventPermissionType);
