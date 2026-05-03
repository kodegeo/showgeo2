import { getSharedSocket } from "@/lib/event-client/socket-shared";

/** Shared socket; same instance used by EventClient. */
export const socket = getSharedSocket();
