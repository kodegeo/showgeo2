# React Hooks

Custom React hooks for Showgeo 2.0 frontend using React Query for data fetching and state management.

## Overview

This directory contains all custom React hooks for interacting with the API services. Hooks use React Query for caching, refetching, and optimistic updates.

## Structure

```
hooks/
├── useAuth.ts              # Authentication hooks
├── useUsers.ts             # User management hooks
├── useEntities.ts          # Entity management hooks
├── useEvents.ts            # Event management hooks
├── useFollow.ts            # Follow functionality hooks
├── useStore.ts             # Store management hooks
├── useStreaming.ts         # Streaming hooks
├── useNotifications.ts     # Notifications hooks (with WebSocket)
├── useAnalytics.ts         # Analytics hooks
├── usePayments.ts          # Payment hooks
├── useDebounce.ts          # Utility hook
├── useLocalStorage.ts       # Utility hook
└── index.ts                # Barrel exports
```

## Authentication Hooks

### `useAuth()`

Main authentication hook that manages user state and authentication methods.

```typescript
import { useAuth } from "@/hooks";

function MyComponent() {
  const {
    user,
    isLoading,
    isAuthenticated,
    login,
    loginAsync,
    loginLoading,
    loginError,
    register,
    registerAsync,
    registerLoading,
    registerError,
    logout,
    refetchUser,
  } = useAuth();

  const handleLogin = async () => {
    try {
      await loginAsync({ email: "user@example.com", password: "password123" });
    } catch (error) {
      console.error(loginError);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>Welcome, {user?.email}!</div>
      ) : (
        <button onClick={handleLogin} disabled={loginLoading}>
          Login
        </button>
      )}
    </div>
  );
}
```

## User Hooks

### `useUsers(params?)`

Get paginated list of users.

```typescript
const { data, isLoading, error } = useUsers({ page: 1, limit: 20 });
```

### `useUser(id)`

Get user by ID.

```typescript
const { data: user, isLoading } = useUser("user-123");
```

### `useUserByUsername(username)`

Get user by username.

```typescript
const { data: user } = useUserByUsername("johndoe");
```

### `useCreateUserProfile()`

Create user profile mutation.

```typescript
const createProfile = useCreateUserProfile();

createProfile.mutate({
  userId: "user-123",
  data: {
    username: "johndoe",
    firstName: "John",
    lastName: "Doe",
  },
});
```

### `useUpdateUserProfile()`

Update user profile mutation.

```typescript
const updateProfile = useUpdateUserProfile();

updateProfile.mutate({
  id: "user-123",
  data: {
    bio: "Updated bio",
    location: "New York",
  },
});
```

## Entity Hooks

### `useEntities(params?)`

Get paginated list of entities.

```typescript
const { data, isLoading } = useEntities({
  page: 1,
  limit: 20,
  type: "INDIVIDUAL",
});
```

### `useEntity(id)`

Get entity by ID.

```typescript
const { data: entity } = useEntity("entity-123");
```

### `useEntityBySlug(slug)`

Get entity by slug.

```typescript
const { data: entity } = useEntityBySlug("my-entity");
```

### `useCreateEntity()`

Create entity mutation.

```typescript
const createEntity = useCreateEntity();

createEntity.mutate({
  name: "My Entity",
  slug: "my-entity",
  type: "INDIVIDUAL",
});
```

### `useAddCollaborator()`

Add collaborator to entity.

```typescript
const addCollaborator = useAddCollaborator();

addCollaborator.mutate({
  entityId: "entity-123",
  data: {
    userId: "user-456",
    role: "MANAGER",
  },
});
```

## Event Hooks

### `useEvents(params?)`

Get paginated list of events.

```typescript
const { data, isLoading } = useEvents({
  page: 1,
  limit: 20,
  entityId: "entity-123",
  phase: "PRE_LIVE",
});
```

### `useEvent(id)`

Get event by ID.

```typescript
const { data: event } = useEvent("event-123");
```

### `useTransitionEventPhase()`

Transition event phase mutation.

```typescript
const transitionPhase = useTransitionEventPhase();

transitionPhase.mutate({
  id: "event-123",
  phase: "LIVE",
});
```

### `useEventMetrics(eventId)`

Get event metrics (auto-refetches every 30 seconds).

```typescript
const { data: metrics } = useEventMetrics("event-123");
```

### `useUpdateEventMetrics()`

Update event metrics mutation.

```typescript
const updateMetrics = useUpdateEventMetrics();

updateMetrics.mutate({
  id: "event-123",
  data: {
    viewers: 100,
    messages: 50,
    reactions: 200,
  },
});
```

## Follow Hooks

### `useFollowers(entityId, page, limit)`

Get followers of an entity.

```typescript
const { data, isLoading } = useFollowers("entity-123", 1, 20);
```

### `useFollowing(userId, page, limit)`

Get entities followed by a user.

```typescript
const { data, isLoading } = useFollowing("user-123", 1, 20);
```

### `useIsFollowing(entityId)`

Check if current user is following an entity.

```typescript
const { data: isFollowing } = useIsFollowing("entity-123");
```

### `useFollowEntity()`

Follow entity mutation.

```typescript
const followEntity = useFollowEntity();

followEntity.mutate("entity-123");
```

### `useUnfollowEntity()`

Unfollow entity mutation.

```typescript
const unfollowEntity = useUnfollowEntity();

unfollowEntity.mutate("entity-123");
```

## Store Hooks

### `useStores(params?)`

Get paginated list of stores.

```typescript
const { data, isLoading } = useStores({
  page: 1,
  limit: 20,
  entityId: "entity-123",
});
```

### `useStore(id)`

Get store by ID.

```typescript
const { data: store } = useStore("store-123");
```

### `useStoreByEntity(entityId)`

Get store by entity ID.

```typescript
const { data: store } = useStoreByEntity("entity-123");
```

### `useAddProduct()`

Add product to store mutation.

```typescript
const addProduct = useAddProduct();

addProduct.mutate({
  storeId: "store-123",
  data: {
    name: "Product Name",
    price: 99.99,
    currency: "USD",
    isDigital: false,
  },
});
```

## Streaming Hooks

### `useActiveSessions()`

Get active streaming sessions (auto-refetches every 10 seconds).

```typescript
const { data: sessions } = useActiveSessions();
```

### `useStreamingSession(sessionId)`

Get streaming session details (auto-refetches every 15 seconds).

```typescript
const { data: session } = useStreamingSession("session-123");
```

### `useGenerateStreamingToken()`

Generate LiveKit token mutation.

```typescript
const generateToken = useGenerateStreamingToken();

generateToken.mutate({
  eventId: "event-123",
  data: {
    role: "subscriber",
    country: "US",
    state: "CA",
    city: "Los Angeles",
    timezone: "America/Los_Angeles",
  },
});
```

## Notification Hooks

### `useNotifications(params?)`

Get paginated list of notifications.

```typescript
const { data, isLoading } = useNotifications({
  page: 1,
  limit: 20,
  unreadOnly: false,
});
```

### `useUnreadCount()`

Get unread notification count (auto-refetches every 30 seconds).

```typescript
const { data: unreadCount } = useUnreadCount();
```

### `useMarkAsRead()`

Mark notification as read mutation.

```typescript
const markAsRead = useMarkAsRead();

markAsRead.mutate("notification-123");
```

### `useNotificationsSocket()`

Real-time notifications via WebSocket.

```typescript
function NotificationComponent() {
  const { notifications, unreadCount, isConnected, ping } = useNotificationsSocket();

  useEffect(() => {
    // Ping server every 30 seconds to keep connection alive
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [ping]);

  return (
    <div>
      {isConnected ? (
        <div>
          <div>Unread: {unreadCount}</div>
          {notifications.map((notification) => (
            <div key={notification.id}>{notification.message}</div>
          ))}
        </div>
      ) : (
        <div>Connecting...</div>
      )}
    </div>
  );
}
```

## Analytics Hooks

### `useEntityAnalytics(entityId)`

Get entity analytics.

```typescript
const { data: analytics } = useEntityAnalytics("entity-123");
```

### `useEventPerformance(eventId)`

Get event performance analytics.

```typescript
const { data: performance } = useEventPerformance("event-123");
```

### `useUserEngagement(userId)`

Get user engagement analytics.

```typescript
const { data: engagement } = useUserEngagement("user-123");
```

### `useRecommendations(userId)`

Get recommendations for user.

```typescript
const { data: recommendations } = useRecommendations("user-123");
```

## Payment Hooks

### `useOrders(params?)`

Get paginated list of orders.

```typescript
const { data, isLoading } = useOrders({
  page: 1,
  limit: 20,
  status: "COMPLETED",
});
```

### `useOrder(orderId)`

Get order details.

```typescript
const { data: order } = useOrder("order-123");
```

### `useCreateCheckout()`

Create Stripe checkout session mutation.

```typescript
const createCheckout = useCreateCheckout();

createCheckout.mutate(
  {
    type: "TICKET",
    eventId: "event-123",
    items: [
      {
        name: "VIP Ticket",
        unitPrice: 99.99,
        quantity: 2,
      },
    ],
  },
  {
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.url;
    },
  },
);
```

### `useCreateRefund()`

Create refund mutation.

```typescript
const createRefund = useCreateRefund();

createRefund.mutate({
  orderId: "order-123",
  reason: "Customer request",
});
```

## Utility Hooks

### `useDebounce(value, delay)`

Debounce a value.

```typescript
const [searchTerm, setSearchTerm] = useState("");
const debouncedSearchTerm = useDebounce(searchTerm, 500);

useEffect(() => {
  // Search with debounced value
  search(debouncedSearchTerm);
}, [debouncedSearchTerm]);
```

### `useLocalStorage(key, initialValue)`

Sync state with localStorage.

```typescript
const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");

// Use theme value
<div className={theme === "dark" ? "dark" : "light"}>Content</div>

// Update theme (automatically syncs to localStorage)
setTheme("dark");
```

## Best Practices

1. **Use hooks instead of direct service calls**: Hooks provide caching, refetching, and optimistic updates
2. **Handle loading states**: Always check `isLoading` before rendering data
3. **Handle errors**: Check `error` and display user-friendly messages
4. **Use mutations for updates**: Use mutation hooks for creating, updating, and deleting
5. **Invalidate queries**: Mutations automatically invalidate related queries
6. **Optimistic updates**: Set query data in `onSuccess` for instant UI updates
7. **Refetch intervals**: Some hooks auto-refetch for live data (events, notifications, streaming)

## React Query Configuration

Set up React Query in your app:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

## Environment Variables

Configure WebSocket URL in `.env`:

```env
VITE_WS_URL=ws://localhost:3000
```

For production:

```env
VITE_WS_URL=wss://api.showgeo.com
```
