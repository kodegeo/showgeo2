# Engagement Feature

Crowd energy, highlight moments, and creator feedback aligned with the backend event-engine (crowd_energy_snapshots, highlight_moments, creator_feedback_signals).

## Components

- **CrowdEnergyViz** – Energy snapshots over time (GET /events/:eventId/energy).
- **HighlightMomentsList** – List of highlight moments (GET /events/:eventId/highlights).
- **CreatorFeedbackSignalsUI** – Placeholder for creator feedback metrics.

## Hooks

- **useEventEnergy** – Fetch energy snapshots for an event.
- **useEventHighlights** – Fetch highlights for an event.
- **useStreaming** – From `@/hooks/useStreaming`.
- **socket** – From `@/hooks/useRealtime`.

## Usage

```tsx
import { CrowdEnergyViz, HighlightMomentsList, CreatorFeedbackSignalsUI } from "@/features/engagement";
import { useEventEnergy, useEventHighlights } from "@/features/engagement/hooks";
```
