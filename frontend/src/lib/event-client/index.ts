export { EventClient } from "./EventClient";
export { EventSocket } from "./EventSocket";
export { EventState } from "./EventState";
export { EventMessageRouter } from "./EventMessageRouter";
export { getSharedSocket } from "./socket-shared";
export {
  EventClientProvider,
  useEventClient,
  type EventClientProviderProps,
} from "./context/EventClientProvider";
export {
  EventLifecycleManager,
  type EventLifecycleManagerProps,
} from "./lifecycle/EventLifecycleManager";
export type { EventStateData, ChatMessage, ReactionItem } from "./types";
export * from "./modules";
