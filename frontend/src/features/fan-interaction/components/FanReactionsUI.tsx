/**
 * Fan reactions UI – re-exports LiveKit ReactionOverlay for use in event streams.
 * For socket-based reactions (lobby), use the realtime socket (useRealtime) and send_message or reaction events.
 */
export {
  ReactionOverlay,
  ReactionOverlay as FanReactionsUI,
} from "@/components/streaming/ReactionOverlay";
