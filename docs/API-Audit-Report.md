# API Audit Report — Showgeo

This document lists **Backend APIs** (NestJS), **Frontend APIs** (client services), and **Service APIs** (realtime/socket), and how they connect. All backend routes use the global prefix **`/api`**.

---

## 1. Backend APIs (`/backend`)

Base URL: **`/api`** (see `backend/src/main.ts`).

### App & Health
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api` | app.controller | Root |
| GET | `/api/health` | app.controller | Health check |
| GET | `/api/health` | health.controller | Health (duplicate) |

### Auth
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/auth/register-app-user` | auth.controller | Register app user |
| GET | `/api/auth/me` | auth.controller | Current user |
| POST | `/api/auth/dev/create-user` | auth.controller | Dev: create user |
| GET | `/api/auth/me` | auth-alias.controller | Legacy alias for auth/me |

### Users
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/users` | users.controller | List users |
| GET | `/api/users/username/:username` | users.controller | Get by username |
| GET | `/api/users/by-auth-user/:authUserId` | users.controller | Get by auth user id |
| GET | `/api/users/:id` | users.controller | Get user by id |
| GET | `/api/users/:id/entities` | users.controller | User entities |
| PATCH | `/api/users/:id` | users.controller | Update user |
| POST | `/api/users/:id/convert-to-entity` | users.controller | Convert to entity |
| POST | `/api/users/upgrade-to-creator` | users.controller | Upgrade to creator |
| PATCH | `/api/users/:id/link-supabase` | users.controller | Link Supabase |
| POST | `/api/users/:id/promote-to-entity` | users.controller | Promote to entity (admin) |
| DELETE | `/api/users/:id` | users.controller | Delete user |

### Entities
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/entities/my-applications` | entities.controller | My creator applications |
| POST | `/api/entities/creator-apply` | entities.controller | Creator apply |
| POST | `/api/entities` | entities.controller | Create entity |
| GET | `/api/entities/popular` | entities.controller | Popular entities |
| GET | `/api/entities` | entities.controller | List entities |
| GET | `/api/entities/slug/:slug` | entities.controller | Get by slug |
| GET | `/api/entities/:id` | entities.controller | Get entity |
| PATCH | `/api/entities/:id` | entities.controller | Update entity |
| DELETE | `/api/entities/:id` | entities.controller | Delete entity |
| POST | `/api/entities/:id/collaborators` | entities.controller | Add collaborator |
| DELETE | `/api/entities/:id/collaborators/:userId` | entities.controller | Remove collaborator |
| GET | `/api/entities/:id/collaborators` | entities.controller | List collaborators |

### Events
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/events` | events.controller | Create event |
| GET | `/api/events` | events.controller | List events |
| GET | `/api/events/followed` | events.controller | Followed events |
| GET | `/api/events/discovery` | events.controller | Discovery |
| GET | `/api/events/my-events` | events.controller | My events |
| GET | `/api/events/upcoming` | events.controller | Upcoming events |
| GET | `/api/events/:id/financial-summary` | events.controller | Financial summary |
| GET | `/api/events/:id/revenue` | events.controller | Event revenue |
| POST | `/api/events/:id/revenue-splits` | events.controller | Create revenue split |
| POST | `/api/events/:id/revenue-splits/:splitId/approve` | events.controller | Approve split |
| GET | `/api/events/:id/clips` | events.controller | Event clips |
| POST | `/api/events/:id/clips` | events.controller | Create clip |
| GET | `/api/events/:id/stream` | events.controller | Stream config |
| GET | `/api/events/:id` | events.controller | Get event |
| GET | `/api/events/:id/access` | events.controller | Event access |
| GET | `/api/events/:id/roles` | events.controller | Event roles |
| POST | `/api/events/:id/roles` | events.controller | Upsert role |
| DELETE | `/api/events/:id/roles/:userId` | events.controller | Remove role |
| GET | `/api/events/:id/metrics` | events.controller | Event metrics |
| PATCH | `/api/events/:id` | events.controller | Update event |
| DELETE | `/api/events/:id` | events.controller | Delete event |
| POST | `/api/events/:id/phase/transition` | events.controller | Phase transition |
| POST | `/api/events/:id/phase/extend` | events.controller | Extend phase |
| POST | `/api/events/:id/metrics` | events.controller | Update metrics |
| POST | `/api/events/:id/test-results` | events.controller | Log test results |
| GET | `/api/events/:id/analytics` | events.controller | Event analytics |
| POST | `/api/events/:id/audience-action` | events.controller | Audience action |
| POST | `/api/events/:id/reminders` | events.controller | Create reminder |
| GET | `/api/events/:id/reminders` | events.controller | List reminders |
| POST | `/api/events/:id/blasts` | events.controller | Create blast |
| GET | `/api/events` | events-alias.controller | Legacy alias list events |

### Event Registrations & Mailbox
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/events/:eventId/registrations/invitations` | registrations.controller | Send invitations |
| GET | `/api/events/:eventId/registrations/invitations` | registrations.controller | List invitations |
| GET | `/api/events/:eventId/registrations/access-code` | registrations.controller | Get/create access code |
| GET | `/api/events/:eventId/registrations/search-users` | registrations.controller | Search users to invite |
| POST | `/api/events/:eventId/registrations/register` | registrations.controller | Register for event |
| POST | `/api/events/:eventId/registrations/validate-ticket` | registrations.controller | Validate ticket |
| GET | `/api/events/:eventId/registrations/mailbox` | registrations.controller | Mailbox for event |
| GET | `/api/mailbox` | mailbox.controller | All mailbox items |

### Streaming
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/streaming/session/:eventId` | streaming.controller | Create/start session |
| POST | `/api/streaming/:eventId/token` | streaming.controller | Get viewer/broadcaster token |
| POST | `/api/streaming/session/:id/end` | streaming.controller | End session |
| GET | `/api/streaming/active` | streaming.controller | Active sessions |
| GET | `/api/streaming/:id` | streaming.controller | Get session |
| POST | `/api/streaming/:id/metrics` | streaming.controller | Session metrics |
| POST | `/api/streaming/validate-geofence` | streaming.controller | Validate geofence |

### Tickets
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/tickets/my` | tickets.controller | My tickets |

### Stores
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/stores` | store.controller | Create store |
| GET | `/api/stores` | store.controller | List stores |
| GET | `/api/stores/:id` | store.controller | Get store |
| GET | `/api/stores/entity/:entityId` | store.controller | Stores by entity |
| PATCH | `/api/stores/:id` | store.controller | Update store |
| DELETE | `/api/stores/:id` | store.controller | Delete store |
| POST | `/api/stores/:id/products` | store.controller | Add product |
| PATCH | `/api/stores/products/:id` | store.controller | Update product |
| DELETE | `/api/stores/products/:id` | store.controller | Delete product |

### Tours
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/tours` | tours.controller | List tours |
| GET | `/api/tours/slug/:slug` | tours.controller | Get by slug |
| GET | `/api/tours/:id/events` | tours.controller | Tour events |
| GET | `/api/tours/:id` | tours.controller | Get tour |
| POST | `/api/tours` | tours.controller | Create tour |
| PATCH | `/api/tours/:id` | tours.controller | Update tour |

### Clips
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/clips/trending` | clips.controller | Trending clips |
| GET | `/api/clips/:clipId` | clips.controller | Get clip |
| DELETE | `/api/clips/:clipId` | clips.controller | Delete clip |
| POST | `/api/clips/:clipId/share` | clips.controller | Share clip |

### Chat
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/chat/:eventId` | chat.controller | Get messages |
| POST | `/api/chat/:eventId` | chat.controller | Send message |

### Fan interaction (events)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/events/:eventId/fans` | fan-interaction.controller | Event fans |
| GET | `/api/events/:eventId/rankings` | fan-interaction.controller | Event rankings |

### Engagement engine (events)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/events/:eventId/energy` | engagement-engine.controller | Event energy |
| GET | `/api/events/:eventId/highlights` | engagement-engine.controller | Event highlights |

### Follow
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/follow/event/:eventId` | follow.controller | Follow event |
| DELETE | `/api/follow/event/:eventId` | follow.controller | Unfollow event |
| GET | `/api/follow/event/status/:eventId` | follow.controller | Event follow status |
| PATCH | `/api/follow/event/:eventId/notify` | follow.controller | Notify preference |
| POST | `/api/follow/:entityId` | follow.controller | Follow entity |
| DELETE | `/api/follow/:entityId` | follow.controller | Unfollow entity |
| GET | `/api/follow/:entityId/followers` | follow.controller | Entity followers |
| GET | `/api/follow/user/:userId` | follow.controller | User following |
| GET | `/api/follow/status/:entityId` | follow.controller | Entity follow status |
| GET | `/api/follow/counts/entity/:entityId` | follow.controller | Entity counts |
| GET | `/api/follow/counts/user/:userId` | follow.controller | User counts |
| GET | `/api/follow/user/:userId` | follow-alias.controller | Legacy alias |

### Analytics
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/analytics/entity/:entityId` | analytics.controller | Entity analytics |
| GET | `/api/analytics/event/:eventId` | analytics.controller | Event analytics |
| GET | `/api/analytics/user/:userId` | analytics.controller | User analytics |
| GET | `/api/analytics/overview` | analytics.controller | Platform overview |
| GET | `/api/analytics/recommendations/:userId` | analytics.controller | Recommendations |
| POST | `/api/analytics/update` | analytics.controller | Update analytics |

### Assets
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/assets/upload` | assets.controller | Upload asset |
| GET | `/api/assets` | assets.controller | List assets |
| GET | `/api/assets/:id` | assets.controller | Get asset |
| GET | `/api/assets/:id/url` | assets.controller | Get asset URL |
| DELETE | `/api/assets/:id` | assets.controller | Delete asset |
| POST | `/api/assets/creator/upload` | assets.controller | Creator upload |
| POST | `/api/assets/creator/bulk-upload` | assets.controller | Creator bulk upload |
| GET | `/api/assets/creator/:entityId/gallery` | assets.controller | Creator gallery |

### Upload (legacy)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/upload/avatar` | upload.controller | Upload avatar |
| POST | `/api/upload/banner` | upload.controller | Upload banner |

### Notifications
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/notifications` | notifications.controller | List notifications |
| GET | `/api/notifications/unread-count` | notifications.controller | Unread count |
| PATCH | `/api/notifications/:id/read` | notifications.controller | Mark read |
| DELETE | `/api/notifications/clear` | notifications.controller | Clear |
| POST | `/api/notifications/test` | notifications.controller | Test |

### Moderation (no prefix in code; under api)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/events/:eventId/reports` | moderation.controller | Create report |
| GET | `/api/events/:eventId/reports` | moderation.controller | Event reports |
| GET | `/api/me/reports` | moderation.controller | My reports |
| PATCH | `/api/reports/:reportId/status` | moderation.controller | Update report status |

### Admin reports
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/reports` | admin-reports.controller | Create report |
| GET | `/api/reports` | admin-reports.controller | List reports |
| PATCH | `/api/reports/:id/resolve` | admin-reports.controller | Resolve report |
| GET | `/api/admin/reports` | admin-reports.controller | Admin list reports |

### Event activities (no prefix)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/events/:eventId/activities` | event-activities.controller | Create activity |
| PATCH | `/api/activities/:activityId` | event-activities.controller | Update activity |
| POST | `/api/activities/:activityId/launch` | event-activities.controller | Launch activity |
| POST | `/api/activities/:activityId/complete` | event-activities.controller | Complete activity |
| GET | `/api/events/:eventId/activities` | event-activities.controller | List activities |

### Meet-greet (creator + fan)
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/events/:eventId/meet-greet/queue` | meet-greet.controller | Queue |
| GET | `/api/events/:eventId/meet-greet/current` | meet-greet.controller | Current session |
| POST | `/api/events/:eventId/meet-greet/start-next` | meet-greet.controller | Start next |
| POST | `/api/meet-greet/sessions/:sessionId/complete` | meet-greet.controller | Complete session |
| POST | `/api/meet-greet/sessions/:sessionId/miss` | meet-greet.controller | Miss session |
| POST | `/api/events/:eventId/meet-greet/join-vip` | meet-greet.controller | Join VIP |
| GET | `/api/meet-greet/sessions/my` | meet-greet.fan.controller | My sessions |
| POST | `/api/meet-greet/sessions/:sessionId/join` | meet-greet.fan.controller | Join session |
| POST | `/api/meet-greet/sessions/:sessionId/join-vip` | meet-greet.fan.controller | Join VIP |

### Payments
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| POST | `/api/payments/checkout` | payments.controller | Create checkout |
| POST | `/api/payments/webhook` | payments.controller | Webhook |
| GET | `/api/payments/orders` | payments.controller | List orders |
| GET | `/api/payments/orders/:id` | payments.controller | Get order |
| POST | `/api/payments/refund` | payments.controller | Refund |

### Admin
| Method | Path | Controller | Description |
|--------|------|------------|-------------|
| GET | `/api/admin/users` | admin.controller | List users |
| PATCH | `/api/admin/users/:id/suspend` | admin.controller | Suspend user |
| PATCH | `/api/admin/users/:id/reinstate` | admin.controller | Reinstate user |
| PATCH | `/api/admin/entities/:id/disable` | admin.controller | Disable entity |
| PATCH | `/api/admin/entities/:id/reinstate` | admin.controller | Reinstate entity |
| POST | `/api/admin/events/:id/terminate` | admin.controller | Terminate event |
| GET | `/api/admin/reports` | admin.controller | Reports |
| PATCH | `/api/admin/users/:id/promote` | admin.controller | Promote user |
| PATCH | `/api/admin/users/:id/demote` | admin.controller | Demote user |
| PATCH | `/api/admin/users/:id/promote-to-admin` | admin.controller | Promote to admin |
| PATCH | `/api/admin/users/:id/demote-admin` | admin.controller | Demote admin |
| PATCH | `/api/admin/users/:id/disable` | admin.controller | Disable user |
| PATCH | `/api/admin/users/:id/enable` | admin.controller | Enable user |
| GET | `/api/admin/entities` | admin.controller | List entities |
| PATCH | `/api/admin/entities/:id/suspend` | admin.controller | Suspend entity |
| PATCH | `/api/admin/entities/:id/reject` | admin.controller | Reject entity |
| GET | `/api/admin/entity-applications` | admin.controller | Entity applications |
| GET | `/api/admin/entity-applications/:id` | admin.controller | Get application |
| GET | `/api/admin/audit-logs` | admin.controller | Audit logs |
| PATCH | `/api/admin/entity-applications/:id/accept` | admin.controller | Accept application |
| PATCH | `/api/admin/entity-applications/:id/reject` | admin.controller | Reject application |
| PATCH | `/api/admin/entity-applications/:id/ban` | admin.controller | Ban application |

---

## 2. Frontend APIs (`/frontend`)

All frontend API calls go through **`apiClient`** (base URL `/api`). Below: **Service → Method → Backend path(s)**.

### auth.service.ts
- `registerAppUser()` → **POST** `/api/auth/register-app-user`
- `getMe()` → **GET** `/api/auth/me`

### users.service.ts
- `getAll()` → **GET** `/api/users`
- `getById()` → **GET** `/api/users/:id`
- `getByUsername()` → **GET** `/api/users/username/:username` (or similar)
- `getUserEntities()` → **GET** `/api/users/:id/entities`
- `createProfile()` → **POST** `/api/users/:userId/profile` (if exists) or users update path
- `updateProfile()` → **PATCH** `/api/users/:id`
- `convertToEntity()` → **POST** `/api/users/:userId/convert-to-entity`
- `upgradeToCreator()` → **POST** `/api/users/upgrade-to-creator`
- `delete()` → **DELETE** `/api/users/:id`

### entities.service.ts
- `create()` → **POST** `/api/entities`
- `getAll()` → **GET** `/api/entities`
- `getPopular()` → **GET** `/api/entities/popular`
- `getById()` → **GET** `/api/entities/:id`
- `getBySlug()` → **GET** `/api/entities/slug/:slug`
- `update()` → **PATCH** `/api/entities/:id`
- `delete()` → **DELETE** `/api/entities/:id`
- `addCollaborator()` → **POST** `/api/entities/:id/collaborators`
- `removeCollaborator()` → **DELETE** `/api/entities/:id/collaborators/:userId`
- `getCollaborators()` → **GET** `/api/entities/:id/collaborators`
- `getMyApplications()` → **GET** `/api/entities/my-applications`
- `creatorApply()` → **POST** `/api/entities/creator-apply`

### events.service.ts
- `create()` → **POST** `/api/events`
- `getAll()` → **GET** `/api/events`
- `getById()` → **GET** `/api/events/:id`
- `getUpcoming()` → **GET** `/api/events/upcoming`
- `getFollowed()` → **GET** `/api/events/followed`
- `getMyEvents()` → **GET** `/api/events/my-events`
- `getEventRevenue()` → **GET** `/api/events/:eventId/revenue`
- `getAccess()` → **GET** `/api/events/:id/access`
- `getStream()` → **GET** `/api/events/:id/stream`
- `update()` → **PATCH** `/api/events/:id`
- `delete()` → **DELETE** `/api/events/:id`
- `transitionPhase()` → **POST** `/api/events/:id/phase/transition`
- `extendPhase()` → **POST** `/api/events/:id/phase/extend`
- `getMetrics()` → **GET** `/api/events/:id/metrics`
- `updateMetrics()` → **POST** `/api/events/:id/metrics`
- `logTestResults()` → **POST** `/api/events/:id/test-results`
- `getAnalytics()` → **GET** `/api/events/:id/analytics`
- `performAudienceAction()` → **POST** `/api/events/:id/audience-action`
- `createReminder()` → **POST** `/api/events/:id/reminders`
- `getReminders()` → **GET** `/api/events/:id/reminders`

### creator.service.ts (creator flows)
- `createEvent()` → **POST** `/api/events` then **POST** `/api/assets/upload` then **PATCH** `/api/events/:id`
- `uploadEventThumbnail()` → **POST** `/api/assets/upload`
- `createPost()` → **POST** `/api/posts` (if exists) / assets upload
- `addProduct()` → **POST** `/api/stores/:storeId/products`
- `goLive()` → **POST** `/api/events`, **POST** `/api/events/:id/phase/transition`, **POST** `/api/streaming/session/:eventId`
- `followEntity()` → **POST** `/api/follow/:entityId`
- `unfollowEntity()` → **DELETE** `/api/follow/:entityId`
- `manageFan()` → **POST** `/api/fans/manage` (if exists)

### registrations.service.ts
- `register()` → **POST** `/api/events/:eventId/registrations/register`
- `listInvitations()` → **GET** `/api/events/:eventId/registrations/invitations`
- `getAccessCode()` → **GET** `/api/events/:eventId/registrations/access-code`
- `searchUsers()` → **GET** `/api/events/:eventId/registrations/search-users`

### mailbox.service.ts
- `getMailbox()` → **GET** `/api/mailbox`

### streaming.service.ts
- `createSession()` → **POST** `/api/streaming/session/:eventId`
- `getToken()` → **POST** `/api/streaming/:eventId/token`
- `endSession()` → **POST** `/api/streaming/session/:id/end`
- `getActiveSessions()` → **GET** `/api/streaming/active`
- `getSession()` → **GET** `/api/streaming/:id`
- `updateMetrics()` → **POST** `/api/streaming/:id/metrics`

### tickets.service.ts
- `getMyTickets()` → **GET** `/api/tickets/my`

### store.service.ts
- `create()` → **POST** `/api/stores`
- `getAll()` → **GET** `/api/stores`
- `getById()` → **GET** `/api/stores/:id`
- `getByEntityId()` → **GET** `/api/stores/entity/:entityId`
- `update()` → **PATCH** `/api/stores/:id`
- `delete()` → **DELETE** `/api/stores/:id`
- `addProduct()` → **POST** `/api/stores/:storeId/products`
- `updateProduct()` → **PATCH** `/api/stores/products/:id`
- `deleteProduct()` → **DELETE** `/api/stores/products/:id`

### tours.service.ts
- `getTours()` → **GET** `/api/tours`
- `getBySlug()` → **GET** `/api/tours/slug/:slug`

### clips.service.ts
- `getTrending()` → **GET** `/api/clips/trending`
- `getById()` → **GET** `/api/clips/:clipId`
- `getByEventId()` → **GET** `/api/events/:eventId/clips`
- `create()` → **POST** `/api/events/:eventId/clips`
- `delete()` → **DELETE** `/api/clips/:clipId`

### chat.service.ts
- `getMessages()` → **GET** `/api/chat/:eventId`
- `sendMessage()` → **POST** `/api/chat/:eventId`

### fan-interaction.service.ts
- `getFans()` → **GET** `/api/events/:eventId/fans`
- `getRankings()` → **GET** `/api/events/:eventId/rankings`

### engagement.service.ts
- `getEnergy()` → **GET** `/api/events/:eventId/energy`
- `getHighlights()` → **GET** `/api/events/:eventId/highlights`

### follow.service.ts
- `followEntity()` → **POST** `/api/follow/:entityId`
- `unfollowEntity()` → **DELETE** `/api/follow/:entityId`
- `getFollowers()` → **GET** `/api/follow/:entityId/followers`
- `getFollowing()` → **GET** `/api/follow/user/:userId`
- `getFollowStatus()` → **GET** `/api/follow/status/:entityId`
- `getCounts()` → **GET** `/api/follow/counts/entity/:entityId` or `/api/follow/counts/user/:userId`
- `followEvent()` → **POST** `/api/follow/event/:eventId`
- `unfollowEvent()` → **DELETE** `/api/follow/event/:eventId`
- `getEventFollowStatus()` → **GET** `/api/follow/event/status/:eventId`
- `setEventNotify()` → **PATCH** `/api/follow/event/:eventId/notify`

### analytics.service.ts
- `getEntityMetrics()` → **GET** `/api/analytics/entity/:entityId`
- `getEventAnalytics()` → **GET** `/api/analytics/event/:eventId`
- `getUserEngagement()` → **GET** `/api/analytics/user/:userId`
- `getOverview()` → **GET** `/api/analytics/overview`
- `getRecommendations()` → **GET** `/api/analytics/recommendations/:userId`

### assets.service.ts
- `upload()` → **POST** `/api/assets/upload`
- `getAll()` → **GET** `/api/assets`
- `getById()` → **GET** `/api/assets/:id`
- `getUrl()` → **GET** `/api/assets/:id/url`
- `delete()` → **DELETE** `/api/assets/:id`

### notifications.service.ts
- `getAll()` → **GET** `/api/notifications`
- `getUnreadCount()` → **GET** `/api/notifications/unread-count`
- `markRead()` → **PATCH** `/api/notifications/:id/read`
- `clear()` → **DELETE** `/api/notifications/clear`

### payments.service.ts
- `createCheckout()` → **POST** `/api/payments/checkout`
- `getOrders()` → **GET** `/api/payments/orders`
- `getOrder()` → **GET** `/api/payments/orders/:id`
- `createRefund()` → **POST** `/api/payments/refund`

### admin.service.ts
- `suspendUser()` → **PATCH** `/api/admin/users/:id/suspend`
- `reinstateUser()` → **PATCH** `/api/admin/users/:id/reinstate`
- `disableEntity()` → **PATCH** `/api/admin/entities/:id/disable`
- `reinstateEntity()` → **PATCH** `/api/admin/entities/:id/reinstate`
- `terminateEvent()` → **POST** `/api/admin/events/:id/terminate`
- `getReports()` → **GET** `/api/admin/reports`
- `resolveReport()` → **PATCH** `/api/admin/reports/:id/resolve`
- `getUsers()` → **GET** `/api/admin/users`
- `getEntities()` → **GET** `/api/admin/entities`
- `suspendEntity()` → **PATCH** `/api/admin/entities/:id/suspend`
- `rejectEntity()` → **PATCH** `/api/admin/entities/:id/reject`
- `promoteToAdmin()` → **PATCH** `/api/admin/users/:id/promote-to-admin`
- `demoteAdmin()` → **PATCH** `/api/admin/users/:id/demote-admin`
- `disableUser()` → **PATCH** `/api/admin/users/:id/disable`
- `enableUser()` → **PATCH** `/api/admin/users/:id/enable`
- `getEntityApplications()` → **GET** `/api/admin/entity-applications`
- `getEntityApplication()` → **GET** `/api/admin/entity-applications/:id`
- `acceptEntityApplication()` → **PATCH** `/api/admin/entity-applications/:id/accept`
- `rejectEntityApplication()` → **PATCH** `/api/admin/entity-applications/:id/reject`
- `banEntityApplication()` → **PATCH** `/api/admin/entity-applications/:id/ban`

### event-activities.service.ts
- `getActivities()` → **GET** `/api/events/:eventId/activities`
- `createActivity()` → **POST** `/api/events/:eventId/activities`
- `launchActivity()` → **POST** `/api/activities/:activityId/launch` (or complete)

### meet-greet.service.ts
- `getQueue()` → **GET** `/api/events/:eventId/meet-greet/queue`
- `getCurrentSession()` → **GET** `/api/events/:eventId/meet-greet/current`
- `startNext()` → **POST** `/api/events/:eventId/meet-greet/start-next`
- `completeSession()` → **POST** `/api/meet-greet/sessions/:sessionId/complete`
- `missSession()` → **POST** `/api/meet-greet/sessions/:sessionId/miss`
- `joinVip()` → **POST** `/api/events/:eventId/meet-greet/join-vip` (and fan join-vip)

### moderation.service.ts
- `createReport()` → **POST** `/api/events/:eventId/reports`
- `getEventReports()` → **GET** `/api/events/:eventId/reports`
- `getMyReports()` → **GET** `/api/me/reports`
- `updateReportStatus()` → **PATCH** `/api/reports/:reportId/status`

### Hooks / other (direct apiClient or fetch)
- `useStreaming`: **GET** `/api/streaming/active`, **POST** `/api/streaming/session/:eventId`, **POST** `/api/streaming/session/:id/end`
- `StudioLayout`: **GET** `/api/registrations/mailbox` or **GET** `/api/mailbox` (mailbox)
- `useTours`: **GET** `/api/tours`, **GET** `/api/tours/slug/:slug`
- `useEntities`: **PATCH** `/api/entities/:id`, **DELETE** via entitiesService

---

## 3. Service APIs — Realtime (`/services/realtime`)

**Stack:** Express + Socket.IO. **Port:** 3001 (default). No HTTP REST routes; only **Socket.IO events**.

### Lobby gateway (event lobby + chat)
| Socket event | Direction | Description |
|--------------|-----------|-------------|
| `join_event_lobby` | Client → Server | Payload: `eventId`. Joins socket to event lobby; routes to EventEngine. |
| `send_message` | Client → Server | Payload: `{ eventId, ... }`. Sends chat message; handled by EventEngine. |
| `disconnect` | Client → Server | Cleans up socket from EngineManager. |

### Events gateway
- Placeholder; no events registered. Intended for event-level realtime (e.g. reactions, viewer count).

### Stream gateway
- Placeholder; no events registered. Intended for stream-related realtime (e.g. live state, quality).

### Connection flow
1. Frontend connects to **realtime service** (e.g. `ws://localhost:3001`).
2. Frontend emits **`join_event_lobby`** with `eventId` → backend adds socket to that event’s engine.
3. Frontend emits **`send_message`** with `eventId` and message → backend broadcasts to event room.
4. On **disconnect**, backend removes socket from engine and cleans up.

---

## 4. How the APIs Connect

- **Frontend → Backend:** All browser calls use `apiClient` (base `/api`). Each frontend service method maps to one or more backend REST routes as in the tables above.
- **Frontend → Realtime:** Event/client code (e.g. `EventSocket`) connects to the Socket.IO server and uses `join_event_lobby` and `send_message` for live event chat and lobby.
- **Backend ↔ Realtime:** Backend does not call the realtime service in this audit; it persists data (e.g. chat, events) and the realtime service may read/write DB or caches separately.
- **Workflows:** See **API-Audit-By-Method.md** for flows by HTTP method and workflow (e.g. event creation, checkout, go-live).
