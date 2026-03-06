# Frontend route map

## Canonical public routes (no auth)

| Path | Component | Description |
|------|-----------|-------------|
| `/creators` | CreatorsPage | Public creators discovery list |
| `/creators/:slug` | PublicCreatorProfilePage | Single canonical public creator profile (by slug) |
| `/events` | EventsPage | Public events discovery list |
| `/events/:id` | EventLandingPage | Public event landing page |
| `/events/:id/watch` | EventWatchPage | Watch stream (public) |
| `/events/:id/live` | EventLivePage | Live event (protected) |

## Studio (creator workspace, under /studio/*, auth required)

| Path | Component | Description |
|------|-----------|-------------|
| `/studio/dashboard` | CreatorDashboardPage | Creator dashboard |
| `/studio/events` | CreatorEventsPage | Creator events list |
| `/studio/events/new` | CreateEventPage | New event |
| `/studio/events/:id` | CreatorEventDetailPage | Event detail |
| `/studio/events/:id/edit` | CreatorEventEditPage | Edit event |
| `/studio/events/:id/tickets` | CreatorEventTicketsPage | Event tickets |
| `/studio/events/:id/blast` | CreatorEventBlastPage | Blast |
| `/studio/analytics` | CreatorAnalyticsPage | Analytics |
| `/studio/store` | CreatorStorePage | Store |
| `/studio/settings` | SettingsCreatorPage | Creator settings |
| `/studio/profile` | EntityProfilePage | Owner's entity profile view |
| `/studio/edit` | EntityEditPage | Owner's entity edit |
| `/studio/application` | CreatorApplicationPage | Creator application |
| `/studio/status` | CreatorStatusPage | Application status |

Layout: StudioLayout. Guard: StudioRoute.

## Production

| Path | Component | Description |
|------|-----------|-------------|
| `/production/events/:eventId/console` | ProductionConsolePage | Production console (protected, StudioRoute) |

## Legacy redirects (preserve slug/params)

| Legacy path | Redirect to |
|-------------|-------------|
| `/entities/:slug` | `/creators/:slug` |
| `/entity/:slug` | `/creators/:slug` |
| `/entities` | `/creators` |
| `/entity/profile` | `/studio/profile` |
| `/creator/*` | `/studio/*` (path segment replaced) |

## Other routes

- `/`, `/login`, `/register`, `/dashboard`, `/profile`, `/settings/*`, `/admin/*`, `/reset-password` — unchanged.

## Duplicates removed

- PublicEntityPage (deleted; replaced by PublicCreatorProfilePage)
- Workspace pages live in `src/pages/studio/`.
