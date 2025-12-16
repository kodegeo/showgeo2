# API Services

API integration layer using axios and react-query hooks.

## Overview

This directory contains all API client services for interacting with the Showgeo 2.0 backend API. Services are organized by module and provide type-safe methods for all API endpoints.

## Structure

```
services/
├── api.ts                 # Base axios client with interceptors
├── types.ts               # Shared API types and interfaces
├── auth.service.ts        # Authentication service
├── users.service.ts       # Users service
├── entities.service.ts    # Entities service
├── events.service.ts      # Events service
├── follow.service.ts      # Follow service
├── store.service.ts       # Store service
├── streaming.service.ts    # Streaming service
├── notifications.service.ts # Notifications service
├── analytics.service.ts   # Analytics service
├── payments.service.ts    # Payments service
└── index.ts               # Barrel exports
```

## Base API Client

The `api.ts` file contains the base axios client with:

- **Automatic token injection**: Adds `Authorization: Bearer <token>` header to all requests
- **Token refresh**: Automatically refreshes access token on 401 errors
- **Request queuing**: Queues failed requests during token refresh
- **Error handling**: Consistent error handling across all services

### Usage

```typescript
import { apiClient, handleApiError } from "@/services/api";

// Direct API calls (if needed)
const response = await apiClient.get("/endpoint");
```

## Services

### Authentication (`auth.service.ts`)

```typescript
import { authService } from "@/services";

// Register new user
const result = await authService.register({
  email: "user@example.com",
  password: "password123",
  firstName: "John",
  lastName: "Doe",
});

// Login
const result = await authService.login("user@example.com", "password123");

// Get current user
const user = await authService.getCurrentUser();

// Logout
authService.logout();
```

### Users (`users.service.ts`)

```typescript
import { usersService } from "@/services";

// Get all users (Admin only)
const users = await usersService.getAll({ page: 1, limit: 20 });

// Get user by ID
const user = await usersService.getById("user-123");

// Get user by username
const user = await usersService.getByUsername("johndoe");

// Update profile
const updated = await usersService.updateProfile("user-123", {
  bio: "Updated bio",
  location: "New York",
});
```

### Entities (`entities.service.ts`)

```typescript
import { entitiesService } from "@/services";

// Create entity
const entity = await entitiesService.create({
  name: "My Entity",
  slug: "my-entity",
  type: "INDIVIDUAL",
});

// Get all entities
const entities = await entitiesService.getAll({ page: 1, limit: 20 });

// Get entity by slug
const entity = await entitiesService.getBySlug("my-entity");

// Add collaborator
await entitiesService.addCollaborator("entity-123", {
  userId: "user-456",
  role: "MANAGER",
});
```

### Events (`events.service.ts`)

```typescript
import { eventsService } from "@/services";

// Create event
const event = await eventsService.create({
  entityId: "entity-123",
  name: "My Event",
  eventType: "LIVE",
  startTime: "2025-01-01T00:00:00.000Z",
  phase: "PRE_LIVE",
});

// Get all events
const events = await eventsService.getAll({
  page: 1,
  limit: 20,
  entityId: "entity-123",
});

// Transition phase
await eventsService.transitionPhase("event-123", "LIVE");

// Update metrics
await eventsService.updateMetrics("event-123", {
  viewers: 100,
  messages: 50,
  reactions: 200,
});
```

### Follow (`follow.service.ts`)

```typescript
import { followService } from "@/services";

// Follow entity
await followService.followEntity("entity-123");

// Unfollow entity
await followService.unfollowEntity("entity-123");

// Get followers
const followers = await followService.getFollowers("entity-123", 1, 20);

// Check if following
const isFollowing = await followService.isFollowing("entity-123");
```

### Store (`store.service.ts`)

```typescript
import { storeService } from "@/services";

// Create store
const store = await storeService.create({
  name: "My Store",
  slug: "my-store",
  description: "Store description",
});

// Get store by ID
const store = await storeService.getById("store-123");

// Add product
const product = await storeService.addProduct("store-123", {
  name: "Product Name",
  price: 99.99,
  currency: "USD",
  isDigital: false,
});
```

### Streaming (`streaming.service.ts`)

```typescript
import { streamingService } from "@/services";

// Create streaming session
const session = await streamingService.createSession("event-123", {
  accessLevel: "PUBLIC",
});

// Generate LiveKit token
const tokenResponse = await streamingService.generateToken("event-123", {
  role: "subscriber",
  country: "US",
  state: "CA",
  city: "Los Angeles",
  timezone: "America/Los_Angeles",
});

// Get active sessions
const sessions = await streamingService.getActiveSessions();
```

### Notifications (`notifications.service.ts`)

```typescript
import { notificationsService } from "@/services";

// Get notifications
const notifications = await notificationsService.getAll({
  page: 1,
  limit: 20,
  unreadOnly: false,
});

// Get unread count
const count = await notificationsService.getUnreadCount();

// Mark as read
await notificationsService.markAsRead("notification-123");

// Clear all
await notificationsService.clearAll(true); // mark as read
```

### Analytics (`analytics.service.ts`)

```typescript
import { analyticsService } from "@/services";

// Get entity analytics
const metrics = await analyticsService.getEntityAnalytics("entity-123");

// Get event performance
const performance = await analyticsService.getEventPerformance("event-123");

// Get user engagement
const engagement = await analyticsService.getUserEngagement("user-123");

// Get recommendations
const recommendations = await analyticsService.getRecommendations("user-123");
```

### Payments (`payments.service.ts`)

```typescript
import { paymentsService } from "@/services";

// Create checkout session
const checkout = await paymentsService.createCheckout({
  type: "TICKET",
  eventId: "event-123",
  items: [
    {
      name: "VIP Ticket",
      unitPrice: 99.99,
      quantity: 2,
    },
  ],
});

// Redirect to Stripe checkout
window.location.href = checkout.url;

// Get orders
const orders = await paymentsService.getOrders({
  page: 1,
  limit: 20,
  status: "COMPLETED",
});

// Create refund
const refund = await paymentsService.createRefund({
  orderId: "order-123",
  reason: "Customer request",
});
```

## Error Handling

All services use the `handleApiError` utility for consistent error handling:

```typescript
import { handleApiError } from "@/services";

try {
  await authService.login("user@example.com", "password");
} catch (error) {
  const errorMessage = handleApiError(error);
  console.error(errorMessage);
}
```

## TypeScript Types

All services are fully typed. Import types from the services index:

```typescript
import type {
  AuthResponse,
  PaginatedResponse,
  User,
  Event,
  Entity,
  Store,
  Order,
  Notification,
} from "@/services";
```

## Best Practices

1. **Use services instead of direct API calls**: Services provide type safety and consistent error handling
2. **Import from index**: Use barrel exports for cleaner imports
3. **Handle errors**: Always wrap service calls in try/catch blocks
4. **Use React Query**: For data fetching, use React Query hooks instead of direct service calls
5. **Type everything**: Use TypeScript types for all requests and responses

## React Query Integration

For data fetching with caching and refetching, use React Query:

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { eventsService } from "@/services";

// Query hook
function useEvents(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["events", params],
    queryFn: () => eventsService.getAll(params),
  });
}

// Mutation hook
function useCreateEvent() {
  return useMutation({
    mutationFn: (data: CreateEventRequest) => eventsService.create(data),
  });
}
```

## Environment Variables

Configure the API base URL in `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

For production:

```env
VITE_API_URL=https://api.showgeo.com/api
```
