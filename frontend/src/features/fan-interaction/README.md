# Fan Interaction Feature

Fan signals, reactions, presence, and leaderboard aligned with the backend event-engine (fan_signals, fan_reactions, fan_presence, fan_rankings).

## Components

- **FanSignalsUI** – Fan signals summary (uses GET /events/:eventId/fans).
- **FanReactionsUI** / **ReactionOverlay** – LiveKit reaction overlay for streams (re-exported from streaming).
- **FanLeaderboard** – Engagement rankings (uses GET /events/:eventId/rankings).
- **ManageFanModal** – Manage fan actions (re-exported from modals/creator).

## Hooks

- **useEventFans** – Fetch fans/presence for an event.
- **useEventRankings** – Fetch rankings for an event.
- **useManageFan** – From `@/hooks/useFans`.
- **socket** – From `@/hooks/useRealtime`.
- **useStreaming** – From `@/hooks/useStreaming`.

## Usage

```tsx
import { FanLeaderboard, FanSignalsUI, ReactionOverlay } from "@/features/fan-interaction";
import { useEventFans, useEventRankings } from "@/features/fan-interaction/hooks";
```
