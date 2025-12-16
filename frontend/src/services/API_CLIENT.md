# Showgeo API Client Documentation

This document provides comprehensive documentation for all API endpoints available in the Showgeo frontend API client.

## Overview

The API client is organized into service modules, each handling a specific domain:

- `authService` - Authentication and authorization
- `usersService` - User management and profiles
- `entitiesService` - Entity (creators/organizations) management
- `eventsService` - Event lifecycle management
- `followService` - Follow relationships
- `storeService` - Digital storefronts and products
- `streamingService` - Live streaming sessions
- `notificationsService` - User notifications
- `analyticsService` - Analytics and recommendations
- `paymentsService` - Payment processing
- `assetsService` - File uploads and asset management

## Base Configuration

All requests use the `apiClient` from `./api.ts`, which:

- Automatically includes authentication tokens
- Handles token refresh on 401 errors
- Provides error handling utilities
- Uses base URL from `VITE_API_URL` env variable (defaults to `http://localhost:3000/api`)

## Authentication

### `authService.register(data: RegisterRequest)`
Register a new user account.

**Request:**
```typescript
{
  email: string;
  password: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}
```

**Response:** `AuthResponse` with access and refresh tokens

---

### `authService.login(email: string, password: string)`
Login with email and password.

**Response:** `AuthResponse` with access and refresh tokens

---

### `authService.refresh()`
Refresh access token using stored refresh token.

**Response:** New access token string

---

### `authService.getCurrentUser()`
Get current authenticated user and profile.

**Response:** `User & { profile?: UserProfile }`

---

### `authService.logout()`
Clear authentication tokens from localStorage.

---

## Users

### `usersService.getAll(params?: QueryParams)`
Get all users (Admin only).

**Query Params:**
- `page?: number`
- `limit?: number`
- `search?: string`

**Response:** `PaginatedResponse<User & { profile?: UserProfile }>`

---

### `usersService.getById(id: string)`
Get user by ID.

**Response:** `User & { profile?: UserProfile }`

---

### `usersService.getByUsername(username: string)`
Get user by username.

**Response:** `User & { profile?: UserProfile }`

---

### `usersService.createProfile(userId: string, data: CreateUserProfileRequest)`
Create user profile.

**Request:**
```typescript
{
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
}
```

**Response:** `UserProfile`

---

### `usersService.updateProfile(id: string, data: UpdateUserProfileRequest)`
Update user profile.

**Response:** `User & { profile?: UserProfile }`

---

### `usersService.delete(id: string)`
Delete user (Admin only).

---

### `usersService.getEntities(id: string)`
Get user's entities (owned, managed, followed).

**Response:** `UserEntitiesResponse`

---

### `usersService.convertToEntity(userId: string, data: ConvertToEntityRequest)`
Convert user to entity (create first entity).

**Response:** `Entity`

---

## Entities

### `entitiesService.create(data: CreateEntityRequest)`
Create new entity.

**Request:**
```typescript
{
  type: "INDIVIDUAL" | "ORGANIZATION";
  name: string;
  slug: string;
  bio?: string;
  tags?: string[];
  thumbnail?: string;
  bannerImage?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  isPublic: boolean;
  defaultCoordinatorId?: string;
}
```

**Response:** `Entity`

---

### `entitiesService.getAll(params?: EntityQueryParams)`
Get all entities with filters.

**Query Params:**
- `type?: "INDIVIDUAL" | "ORGANIZATION"`
- `isVerified?: boolean`
- `isPublic?: boolean`
- `search?: string`
- `page?: number`
- `limit?: number`

**Response:** `PaginatedResponse<Entity>`

---

### `entitiesService.getById(id: string)`
Get entity by ID.

**Response:** `Entity`

---

### `entitiesService.getBySlug(slug: string)`
Get entity by slug.

**Response:** `Entity`

---

### `entitiesService.update(id: string, data: UpdateEntityRequest)`
Update entity.

**Response:** `Entity`

---

### `entitiesService.delete(id: string)`
Delete entity.

---

### `entitiesService.addCollaborator(id: string, data: AddCollaboratorRequest)`
Add collaborator to entity.

**Request:**
```typescript
{
  userId: string;
  role: "ADMIN" | "MANAGER" | "COORDINATOR";
}
```

---

### `entitiesService.removeCollaborator(id: string, userId: string)`
Remove collaborator from entity.

---

### `entitiesService.getCollaborators(id: string)`
Get entity collaborators.

**Response:** `Array<{ id: string; userId: string; role: string }>`

---

## Events

### `eventsService.create(data: CreateEventRequest)`
Create new event.

**Request:**
```typescript
{
  entityId: string;
  name: string;
  description?: string;
  thumbnail?: string;
  eventType: "LIVE" | "PRERECORDED";
  startTime: string;
  endTime?: string;
  location?: string;
  phase?: "PRE_LIVE" | "LIVE" | "POST_LIVE";
  status?: "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  tourId?: string;
  collaboratorEntityIds?: string[];
  isVirtual?: boolean;
  streamUrl?: string;
  videoUrl?: string;
  ticketRequired?: boolean;
  ticketTypes?: Array<{ type: string; price: number; currency: string; availability: number }>;
}
```

**Response:** `Event`

---

### `eventsService.getAll(params?: EventQueryParams)`
Get all events with filters.

**Query Params:**
- `entityId?: string`
- `eventType?: "LIVE" | "PRERECORDED"`
- `phase?: "PRE_LIVE" | "LIVE" | "POST_LIVE"`
- `status?: "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED"`
- `search?: string`
- `page?: number`
- `limit?: number`

**Response:** `PaginatedResponse<Event>`

---

### `eventsService.getById(id: string)`
Get event by ID.

**Response:** `Event`

---

### `eventsService.update(id: string, data: UpdateEventRequest)`
Update event.

**Response:** `Event`

---

### `eventsService.delete(id: string)`
Delete event.

---

### `eventsService.transitionPhase(id: string, data: PhaseTransitionRequest)`
Transition event to new phase.

**Request:**
```typescript
{
  phase: "PRE_LIVE" | "LIVE" | "POST_LIVE";
}
```

**Response:** `Event`

---

### `eventsService.extendPhase(id: string, hours: number)`
Extend current phase duration.

**Response:** `Event`

---

### `eventsService.updateMetrics(id: string, data: UpdateEventMetricsRequest)`
Update event metrics.

**Request:**
```typescript
{
  viewers?: number;
  messages?: number;
  reactions?: number;
  participants?: number;
}
```

**Response:** `Event`

---

### `eventsService.submitTestResults(id: string, data: TestResultsRequest)`
Submit test results for event.

**Request:**
```typescript
{
  results: Array<{
    timestamp: string;
    status: string;
    notes?: string;
  }>;
}
```

**Response:** `Event`

---

### `eventsService.getMetrics(id: string)`
Get event metrics.

**Response:** `Record<string, unknown>`

---

## Follow

### `followService.follow(entityId: string)`
Follow an entity.

---

### `followService.unfollow(entityId: string)`
Unfollow an entity.

---

### `followService.getFollowers(entityId: string, params?: QueryParams)`
Get entity followers.

**Response:** `PaginatedResponse<Follower>`

---

### `followService.getFollowing(userId: string, params?: QueryParams)`
Get user's following list.

**Response:** `PaginatedResponse<Following>`

---

### `followService.isFollowing(entityId: string)`
Check if user is following entity.

**Response:** `{ isFollowing: boolean }`

---

### `followService.getFollowCounts(entityId: string)`
Get follow counts for entity.

**Response:** `{ followers: number; following: number }`

---

## Store

### `storeService.create(data: CreateStoreRequest)`
Create new store.

**Request:**
```typescript
{
  name: string;
  slug: string;
  description?: string;
  bannerImage?: string;
  logoUrl?: string;
  currency?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  collaborators?: string[];
  tags?: string[];
  eventId?: string;
  tourId?: string;
}
```

**Response:** `Store`

---

### `storeService.getAll(params?: StoreQueryParams)`
Get all stores with filters.

**Query Params:**
- `entityId?: string`
- `eventId?: string`
- `tourId?: string`
- `status?: "ACTIVE" | "INACTIVE" | "ARCHIVED"`
- `visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED"`
- `search?: string`
- `page?: number`
- `limit?: number`

**Response:** `PaginatedResponse<Store>`

---

### `storeService.getById(id: string)`
Get store by ID.

**Response:** `Store`

---

### `storeService.update(id: string, data: UpdateStoreRequest)`
Update store.

**Response:** `Store`

---

### `storeService.delete(id: string)`
Delete store.

---

### `storeService.getEntityStore(entityId: string)`
Get entity's store.

**Response:** `Store`

---

### `storeService.addProduct(storeId: string, data: CreateProductRequest)`
Add product to store.

**Request:**
```typescript
{
  name: string;
  description?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  isDigital: boolean;
  isAvailable: boolean;
}
```

**Response:** `Product`

---

### `storeService.updateProduct(storeId: string, productId: string, data: UpdateProductRequest)`
Update product.

**Response:** `Product`

---

### `storeService.removeProduct(storeId: string, productId: string)`
Remove product from store.

---

## Streaming

### `streamingService.createSession(eventId: string, data: CreateSessionRequest)`
Create streaming session for event.

**Request:**
```typescript
{
  accessLevel?: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
  geoRegions?: string[];
  metadata?: Record<string, unknown>;
}
```

**Response:** `StreamingSession`

---

### `streamingService.generateToken(eventId: string, data: GenerateTokenRequest)`
Generate LiveKit access token.

**Request:**
```typescript
{
  participantRole?: "PUBLISHER" | "SUBSCRIBER";
  participantName?: string;
}
```

**Response:** `LivekitTokenResponse`

---

### `streamingService.endSession(id: string)`
End streaming session.

---

### `streamingService.getActiveSessions(params?: QueryParams)`
Get active streaming sessions.

**Response:** `PaginatedResponse<StreamingSession>`

---

### `streamingService.getSessionDetails(id: string)`
Get streaming session details.

**Response:** `StreamingSession`

---

### `streamingService.updateMetrics(id: string, data: UpdateStreamingMetricsRequest)`
Update streaming session metrics.

**Request:**
```typescript
{
  viewers?: number;
  participants?: number;
  messages?: number;
  reactions?: number;
  customMetrics?: Record<string, unknown>;
}
```

**Response:** `StreamingSession`

---

### `streamingService.validateGeofence(data: { eventId: string; latitude: number; longitude: number })`
Validate geofence access for location.

**Response:** `{ allowed: boolean; reason?: string }`

---

## Notifications

### `notificationsService.getAll(params?: NotificationQueryParams)`
Get user notifications.

**Query Params:**
- `isRead?: boolean`
- `type?: string`
- `page?: number`
- `limit?: number`

**Response:** `PaginatedResponse<NotificationResponse>`

---

### `notificationsService.getUnreadCount()`
Get unread notification count.

**Response:** `{ count: number }`

---

### `notificationsService.markAsRead(id: string)`
Mark notification as read.

**Response:** `NotificationResponse`

---

### `notificationsService.clearAll()`
Clear all notifications.

---

## Analytics

### `analyticsService.getEntityMetrics(entityId: string)`
Get entity analytics metrics.

**Response:** `EntityMetrics`

---

### `analyticsService.getEventPerformance(eventId: string)`
Get event performance metrics.

**Response:** `EventPerformance`

---

### `analyticsService.getUserEngagement(userId: string)`
Get user engagement metrics.

**Response:** `UserEngagement`

---

### `analyticsService.getPlatformOverview()`
Get platform overview metrics (Admin only).

**Response:** `PlatformOverview`

---

### `analyticsService.getRecommendations(userId: string)`
Get personalized recommendations for user.

**Response:** `Recommendations`

---

## Payments

### `paymentsService.createCheckout(data: CreateCheckoutRequest)`
Create Stripe checkout session.

**Request:**
```typescript
{
  type: "TICKET" | "PRODUCT";
  items: Array<{
    type: "TICKET" | "PRODUCT";
    id: string;
    quantity: number;
    unitPrice: number;
  }>;
  successUrl?: string;
  cancelUrl?: string;
}
```

**Response:** `CheckoutResponse`

---

### `paymentsService.handleWebhook(payload: unknown)`
Handle Stripe webhook (server-side only).

---

### `paymentsService.createRefund(data: CreateRefundRequest)`
Create refund for order.

**Request:**
```typescript
{
  orderId: string;
  amount?: number;
  reason?: string;
}
```

**Response:** `RefundResponse`

---

### `paymentsService.getOrders(params?: PaymentQueryParams)`
Get orders with filters.

**Query Params:**
- `userId?: string`
- `entityId?: string`
- `eventId?: string`
- `storeId?: string`
- `status?: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED"`
- `page?: number`
- `limit?: number`

**Response:** `PaginatedResponse<Order>`

---

### `paymentsService.getOrder(id: string)`
Get order by ID with items and payments.

**Response:** `Order & { items: OrderItem[]; payments: Payment[] }`

---

## Assets

### `assetsService.upload(data: UploadAssetRequest)`
Upload asset file.

**Request:**
```typescript
{
  file: File;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  ownerType: "USER" | "ENTITY";
  ownerId: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}
```

**Response:** `Asset`

---

### `assetsService.getAll(params?: AssetQueryParams)`
Get all assets with filters.

**Query Params:**
- `type?: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT"`
- `ownerType?: "USER" | "ENTITY"`
- `ownerId?: string`
- `isPublic?: boolean`
- `page?: number`
- `limit?: number`

**Response:** `PaginatedResponse<Asset>`

---

### `assetsService.getById(id: string)`
Get asset by ID.

**Response:** `Asset`

---

### `assetsService.getUrl(id: string)`
Get asset URL for download/viewing.

**Response:** `string`

---

### `assetsService.delete(id: string)`
Delete asset.

---

## Type Exports

All request and response types are exported from the service files and can be imported from `@/services`:

```typescript
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  CreateEventRequest,
  Event,
  // ... etc
} from "@/services";
```

## Error Handling

All API calls can throw errors. Use the `handleApiError` utility to extract error messages:

```typescript
import { handleApiError } from "@/services";

try {
  await authService.login(email, password);
} catch (error) {
  const message = handleApiError(error);
  console.error(message);
}
```

## Examples

### Login and get current user

```typescript
import { authService } from "@/services";

// Login
await authService.login("user@example.com", "password123");

// Get current user
const user = await authService.getCurrentUser();
console.log(user.email);
```

### Create event

```typescript
import { eventsService } from "@/services";

const event = await eventsService.create({
  entityId: "entity-123",
  name: "Summer LIVE 2025",
  eventType: "LIVE",
  startTime: "2025-07-15T20:00:00Z",
  isVirtual: true,
  ticketRequired: true,
  ticketTypes: [
    {
      type: "VIP",
      price: 150,
      currency: "USD",
      availability: 100,
    },
  ],
});
```

### Upload asset

```typescript
import { assetsService } from "@/services";

const file = document.querySelector('input[type="file"]').files[0];
const asset = await assetsService.upload({
  file,
  type: "IMAGE",
  ownerType: "USER",
  ownerId: "user-123",
  isPublic: true,
});
```













