# Frontend Integration Guide

**Complete guide for integrating with Showgeo 2.0 API**

---

## Quick Start

### 1. Install Dependencies

```bash
npm install axios socket.io-client
```

### 2. Setup API Client

```typescript
// src/services/api.ts
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 3. Setup WebSocket Client

```typescript
// src/services/websocket.ts
import { io } from "socket.io-client";

export function createSocket(token: string) {
  return io("http://localhost:3000/notifications", {
    auth: { token },
    transports: ["websocket"],
  });
}
```

---

## React Integration Examples

### Authentication Hook

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from "react";
import { authService } from "@/services/auth";
import { User } from "@shared/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      const { user } = await authService.login(email, password);
      setUser(user);
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      throw err;
    }
  }

  async function logout() {
    authService.logout();
    setUser(null);
  }

  return { user, loading, error, login, logout, refresh: loadUser };
}
```

### Events List Component

```typescript
// src/components/EventsList.tsx
import { useEffect, useState } from "react";
import { eventsService } from "@/services/events";
import { Event } from "@shared/types";

export function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadEvents();
  }, [page]);

  async function loadEvents() {
    try {
      setLoading(true);
      const response = await eventsService.getAll({ page, limit: 20 });
      setEvents(response.data);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {events.map((event) => (
        <div key={event.id}>
          <h3>{event.name}</h3>
          <p>{event.description}</p>
        </div>
      ))}
      <button onClick={() => setPage(page + 1)}>Load More</button>
    </div>
  );
}
```

### Notifications Hook with WebSocket

```typescript
// src/hooks/useNotifications.ts
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { notificationsService } from "@/services/notifications";
import { Notification } from "@shared/types";

export function useNotifications() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // Initialize WebSocket connection
    const newSocket = io("http://localhost:3000/notifications", {
      auth: { token },
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to notifications");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from notifications");
    });

    newSocket.on("notification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    newSocket.on("unread_count", (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    setSocket(newSocket);

    // Load initial notifications
    loadNotifications();

    return () => {
      newSocket.close();
    };
  }, []);

  async function loadNotifications() {
    try {
      const response = await notificationsService.getAll({ page: 1, limit: 20 });
      setNotifications(response.data);
      const countResponse = await notificationsService.getUnreadCount();
      setUnreadCount(countResponse);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  async function markAsRead(id: string) {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    refresh: loadNotifications,
  };
}
```

### Follow Button Component

```typescript
// src/components/FollowButton.tsx
import { useState } from "react";
import { followService } from "@/services/follow";

interface FollowButtonProps {
  entityId: string;
  initialFollowing?: boolean;
}

export function FollowButton({ entityId, initialFollowing = false }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function handleFollow() {
    try {
      setLoading(true);
      if (following) {
        await followService.unfollowEntity(entityId);
        setFollowing(false);
      } else {
        await followService.followEntity(entityId);
        setFollowing(true);
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleFollow} disabled={loading}>
      {following ? "Unfollow" : "Follow"}
    </button>
  );
}
```

### Payment Checkout Component

```typescript
// src/components/Checkout.tsx
import { useState } from "react";
import { paymentsService } from "@/services/payments";

interface CheckoutProps {
  eventId?: string;
  storeId?: string;
  items: Array<{ name: string; unitPrice: number; quantity: number }>;
}

export function Checkout({ eventId, storeId, items }: CheckoutProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    try {
      setLoading(true);
      const response = await paymentsService.createCheckout({
        type: eventId ? "TICKET" : "PRODUCT",
        eventId,
        storeId,
        items,
        successUrl: `${window.location.origin}/success`,
        cancelUrl: `${window.location.origin}/cancel`,
      });

      // Redirect to Stripe checkout
      window.location.href = response.url;
    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? "Processing..." : "Checkout"}
    </button>
  );
}
```

### Streaming Integration Example

```typescript
// src/components/StreamPlayer.tsx
import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteParticipant } from "livekit-client";
import { streamingService } from "@/services/streaming";

interface StreamPlayerProps {
  eventId: string;
}

export function StreamPlayer({ eventId }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    connectToStream();

    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [eventId]);

  async function connectToStream() {
    try {
      // Get LiveKit token from backend
      const tokenResponse = await streamingService.generateToken(eventId, {
        role: "subscriber",
        country: "US",
        state: "CA",
        city: "Los Angeles",
        timezone: "America/Los_Angeles",
      });

      // Connect to LiveKit room
      const newRoom = new Room({
        adaptiveStream: true,
      });

      await newRoom.connect(tokenResponse.url, tokenResponse.token);

      // Handle remote tracks
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === "video" && videoRef.current) {
          track.attach(videoRef.current);
        }
      });

      setRoom(newRoom);
      setIsConnected(true);
    } catch (error) {
      console.error("Failed to connect to stream:", error);
    }
  }

  return (
    <div>
      {isConnected ? (
        <video ref={videoRef} autoPlay playsInline />
      ) : (
        <div>Connecting...</div>
      )}
    </div>
  );
}
```

---

## React Query Integration

### Setup React Query

```bash
npm install @tanstack/react-query
```

```typescript
// src/App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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

### Events Query Hook

```typescript
// src/hooks/useEvents.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsService } from "@/services/events";
import { Event } from "@shared/types";

export function useEvents(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["events", params],
    queryFn: () => eventsService.getAll(params),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => eventsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Event>) => eventsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) =>
      eventsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["events", id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
```

---

## Error Handling

### Error Boundary Component

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Error Handling Utility

```typescript
// src/utils/errorHandler.ts
import { AxiosError } from "axios";

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError;

    if (apiError?.message) {
      if (Array.isArray(apiError.message)) {
        return apiError.message.join(", ");
      }
      return apiError.message;
    }

    return error.message || "An error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}
```

---

## TypeScript Types

### Using Shared Types

```typescript
import {
  User,
  UserProfile,
  Entity,
  Event,
  Store,
  Product,
  Notification,
} from "@shared/types";
```

### API Response Types

```typescript
// src/types/api.ts
import { User, Event, Entity } from "@shared/types";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventResponse extends Event {
  entity: Entity;
  collaborators: Entity[];
  tickets: Ticket[];
}
```

---

## Testing Examples

### Mock API Client

```typescript
// src/__mocks__/api.ts
export const apiClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};
```

### Test Component

```typescript
// src/components/__tests__/EventsList.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { EventsList } from "../EventsList";
import { apiClient } from "@/services/api";

jest.mock("@/services/api");

describe("EventsList", () => {
  it("displays events", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          { id: "1", name: "Event 1", description: "Description 1" },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });

    render(<EventsList />);

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });
  });
});
```

---

## Best Practices

1. **Centralize API Calls**
   - Use service files for API calls
   - Don't call API directly from components

2. **Error Handling**
   - Use error boundaries for UI errors
   - Show user-friendly error messages
   - Log errors for debugging

3. **Loading States**
   - Show loading indicators
   - Use skeleton screens for better UX

4. **Caching**
   - Use React Query for automatic caching
   - Invalidate cache on mutations

5. **WebSocket**
   - Reconnect on disconnect
   - Clean up connections on unmount
   - Handle connection errors gracefully

6. **Type Safety**
   - Use TypeScript for all API calls
   - Type all responses
   - Use shared types where possible

---

**Last Updated:** 2025-01-01  
**API Version:** 2.0.0

