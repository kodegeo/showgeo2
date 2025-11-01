# Frontend API Documentation

**Showgeo 2.0 API Reference**  
**Base URL:** `http://localhost:3000/api` (development)  
**API Version:** 2.0.0  
**Swagger Docs:** `http://localhost:3000/api/docs`

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Client Setup](#api-client-setup)
3. [Endpoints Reference](#endpoints-reference)
4. [WebSocket Integration](#websocket-integration)
5. [Error Handling](#error-handling)
6. [TypeScript Types](#typescript-types)
7. [Code Examples](#code-examples)

---

## Authentication

### Overview

Showgeo 2.0 uses JWT (JSON Web Token) authentication with access and refresh tokens.

### Flow

1. **Register/Login** → Get `accessToken` and `refreshToken`
2. **Store tokens** → `localStorage` or secure storage
3. **Include token** → `Authorization: Bearer <accessToken>` header
4. **Refresh token** → Use `refreshToken` when `accessToken` expires
5. **Logout** → Clear tokens from storage

### Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "USER",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "USER",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as Register

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** Same as Register

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "role": "USER",
  "profile": {
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## API Client Setup

### Axios Configuration

The frontend uses `axios` with interceptors for automatic token handling.

**Location:** `frontend/src/services/api.ts`

```typescript
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor - Adds token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handles token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken } = response.data;
          localStorage.setItem("accessToken", accessToken);
          // Retry original request
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return axios.request(error.config);
        } catch (refreshError) {
          // Refresh failed - logout user
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
        }
      } else {
        // No refresh token - logout
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Endpoints Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/auth/register` | No | Register new user |
| `POST` | `/auth/login` | No | Login user |
| `POST` | `/auth/refresh` | No | Refresh access token |
| `GET` | `/auth/me` | Yes | Get current user |

### Users (`/api/users`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/users` | Yes (Admin) | List all users |
| `GET` | `/users/:id` | No | Get user profile |
| `GET` | `/users/username/:username` | No | Get user by username |
| `GET` | `/users/:id/entities` | No | Get user's entities |
| `PATCH` | `/users/:id` | Yes | Update user profile |
| `DELETE` | `/users/:id` | Yes (Admin) | Delete user |

### Entities (`/api/entities`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/entities` | Yes (Entity/Admin) | Create entity |
| `GET` | `/entities` | No | List entities |
| `GET` | `/entities/:id` | No | Get entity |
| `GET` | `/entities/slug/:slug` | No | Get entity by slug |
| `PATCH` | `/entities/:id` | Yes (Owner/Admin) | Update entity |
| `DELETE` | `/entities/:id` | Yes (Owner/Admin) | Delete entity |
| `POST` | `/entities/:id/collaborators` | Yes (Owner/Admin) | Add collaborator |
| `DELETE` | `/entities/:id/collaborators/:userId` | Yes (Owner/Admin) | Remove collaborator |
| `GET` | `/entities/:id/collaborators` | No | List collaborators |

### Events (`/api/events`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/events` | Yes (Entity/Admin) | Create event |
| `GET` | `/events` | No | List events |
| `GET` | `/events/:id` | No | Get event |
| `PATCH` | `/events/:id` | Yes (Owner/Admin) | Update event |
| `DELETE` | `/events/:id` | Yes (Owner/Admin) | Delete event |
| `POST` | `/events/:id/phase/transition` | Yes (Coordinator/Admin) | Transition phase |
| `POST` | `/events/:id/phase/extend` | Yes (Coordinator/Admin) | Extend phase |
| `GET` | `/events/:id/metrics` | No | Get event metrics |
| `POST` | `/events/:id/metrics` | Yes (Coordinator/Admin) | Update metrics |
| `POST` | `/events/:id/test-results` | Yes (Coordinator/Admin) | Log test results |

### Follow (`/api/follow`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/follow/:entityId` | Yes | Follow entity |
| `DELETE` | `/follow/:entityId` | Yes | Unfollow entity |
| `GET` | `/follow/:entityId/followers` | No | Get followers |
| `GET` | `/follow/user/:userId` | No | Get following |
| `GET` | `/follow/status/:entityId` | Yes | Check follow status |

### Store (`/api/stores`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/stores` | Yes (Entity/Admin) | Create store |
| `GET` | `/stores` | No | List stores |
| `GET` | `/stores/:id` | No | Get store |
| `GET` | `/stores/entity/:entityId` | No | Get entity store |
| `PATCH` | `/stores/:id` | Yes (Owner/Admin) | Update store |
| `DELETE` | `/stores/:id` | Yes (Owner/Admin) | Delete store |
| `POST` | `/stores/:id/products` | Yes (Owner/Admin) | Add product |
| `PATCH` | `/stores/products/:id` | Yes (Owner/Admin) | Update product |
| `DELETE` | `/stores/products/:id` | Yes (Owner/Admin) | Delete product |

### Streaming (`/api/streaming`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/streaming/session/:eventId` | Yes (Entity/Coordinator/Admin) | Create streaming session |
| `POST` | `/streaming/token/:eventId` | Yes | Generate LiveKit token |
| `POST` | `/streaming/session/:id/end` | Yes (Entity/Coordinator/Admin) | End session |
| `GET` | `/streaming/active` | No | List active sessions |
| `GET` | `/streaming/:id` | No | Get session details |
| `POST` | `/streaming/:id/metrics` | Yes (Coordinator/Admin) | Update metrics |

### Notifications (`/api/notifications`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/notifications` | Yes | Get notifications |
| `GET` | `/notifications/unread-count` | Yes | Get unread count |
| `PATCH` | `/notifications/:id/read` | Yes | Mark as read |
| `DELETE` | `/notifications/clear` | Yes | Clear notifications |
| `POST` | `/notifications/test` | Yes (Admin) | Send test notification |

### Analytics (`/api/analytics`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/analytics/entity/:entityId` | Yes (Owner/Admin) | Get entity analytics |
| `GET` | `/analytics/event/:eventId` | No | Get event analytics |
| `GET` | `/analytics/user/:userId` | Yes (Self/Admin) | Get user analytics |
| `GET` | `/analytics/overview` | Yes (Admin) | Platform overview |
| `GET` | `/analytics/recommendations/:userId` | Yes | Get recommendations |

### Payments (`/api/payments`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/payments/checkout` | Yes | Create checkout session |
| `POST` | `/payments/webhook` | No (Stripe) | Stripe webhook handler |
| `GET` | `/payments/orders` | Yes | List orders |
| `GET` | `/payments/orders/:id` | Yes | Get order details |
| `POST` | `/payments/refund` | Yes | Create refund |

---

## WebSocket Integration

### Overview

Real-time notifications are delivered via WebSocket using Socket.io.

**Namespace:** `/notifications`  
**URL:** `ws://localhost:3000/notifications` (development)

### Connection

```typescript
import { io } from "socket.io-client";

const token = localStorage.getItem("accessToken");
const socket = io("http://localhost:3000/notifications", {
  auth: {
    token,
  },
  transports: ["websocket"],
});

// Connection events
socket.on("connect", () => {
  console.log("Connected to notifications");
});

socket.on("connected", (data) => {
  console.log("Authenticated:", data.userId);
});

socket.on("disconnect", () => {
  console.log("Disconnected from notifications");
});

// Notification events
socket.on("notification", (notification) => {
  console.log("New notification:", notification);
  // Handle notification
});

socket.on("unread_count", (data) => {
  console.log("Unread count:", data.count);
  // Update UI
});

// Ping/Pong for keepalive
socket.on("pong", (data) => {
  console.log("Pong:", data.timestamp);
});

socket.emit("ping");
```

### React Hook Example

```typescript
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const newSocket = io("http://localhost:3000/notifications", {
      auth: { token },
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("notification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    newSocket.on("unread_count", (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, notifications, unreadCount, isConnected };
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | Process response |
| `201` | Created | Process response |
| `400` | Bad Request | Show validation errors |
| `401` | Unauthorized | Refresh token or redirect to login |
| `403` | Forbidden | Show permission error |
| `404` | Not Found | Show not found message |
| `409` | Conflict | Show conflict message |
| `500` | Server Error | Show error message |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "errors": [
    {
      "property": "email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    }
  ]
}
```

### Error Handling Utility

```typescript
import { AxiosError } from "axios";

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  errors?: Array<{
    property: string;
    constraints: Record<string, string>;
  }>;
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
    
    if (apiError?.errors) {
      return apiError.errors
        .map((e) => Object.values(e.constraints).join(", "))
        .join(", ");
    }
    
    return error.message || "An error occurred";
  }
  
  return "An unexpected error occurred";
}
```

---

## TypeScript Types

### Using Shared Types

The `shared/` directory contains TypeScript types used across frontend and backend.

```typescript
import {
  User,
  UserProfile,
  UserRole,
  Entity,
  Event,
  Store,
  Product,
  Follow,
  Notification,
} from "@shared/types";
```

### API Response Types

```typescript
// Auth responses
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Paginated responses
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Event response
interface EventResponse extends Event {
  entity: Entity;
  coordinator?: User;
  tour?: Tour;
  collaborators: Entity[];
  tickets: Ticket[];
}

// Store response
interface StoreResponse extends Store {
  entity: Entity;
  products: Product[];
}

// Notification response
interface NotificationResponse extends Notification {
  entity?: Entity;
}
```

---

## Code Examples

### Authentication Service

```typescript
import { apiClient } from "@/services/api";

export const authService = {
  async register(data: {
    email: string;
    password: string;
    role?: string;
    firstName?: string;
    lastName?: string;
  }) {
    const response = await apiClient.post("/auth/register", data);
    const { accessToken, refreshToken, user } = response.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    return { user, accessToken, refreshToken };
  },

  async login(email: string, password: string) {
    const response = await apiClient.post("/auth/login", { email, password });
    const { accessToken, refreshToken, user } = response.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    return { user, accessToken, refreshToken };
  },

  async refresh() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token");
    
    const response = await apiClient.post("/auth/refresh", { refreshToken });
    const { accessToken } = response.data;
    localStorage.setItem("accessToken", accessToken);
    return accessToken;
  },

  async getCurrentUser() {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};
```

### Events Service

```typescript
import { apiClient } from "@/services/api";
import type { Event } from "@shared/types";

export const eventsService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    entityId?: string;
    phase?: string;
    status?: string;
  }) {
    const response = await apiClient.get("/events", { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },

  async create(data: Partial<Event>) {
    const response = await apiClient.post("/events", data);
    return response.data;
  },

  async update(id: string, data: Partial<Event>) {
    const response = await apiClient.patch(`/events/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await apiClient.delete(`/events/${id}`);
    return response.data;
  },

  async transitionPhase(id: string, phase: string) {
    const response = await apiClient.post(`/events/${id}/phase/transition`, {
      phase,
    });
    return response.data;
  },
};
```

### Follow Service

```typescript
import { apiClient } from "@/services/api";

export const followService = {
  async followEntity(entityId: string) {
    const response = await apiClient.post(`/follow/${entityId}`);
    return response.data;
  },

  async unfollowEntity(entityId: string) {
    const response = await apiClient.delete(`/follow/${entityId}`);
    return response.data;
  },

  async getFollowers(entityId: string, page = 1, limit = 20) {
    const response = await apiClient.get(`/follow/${entityId}/followers`, {
      params: { page, limit },
    });
    return response.data;
  },

  async getFollowing(userId: string, page = 1, limit = 20) {
    const response = await apiClient.get(`/follow/user/${userId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  async isFollowing(entityId: string) {
    const response = await apiClient.get(`/follow/status/${entityId}`);
    return response.data.isFollowing;
  },
};
```

### Notifications Service

```typescript
import { apiClient } from "@/services/api";

export const notificationsService = {
  async getAll(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const response = await apiClient.get("/notifications", { params });
    return response.data;
  },

  async getUnreadCount() {
    const response = await apiClient.get("/notifications/unread-count");
    return response.data.count;
  },

  async markAsRead(id: string) {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  async clearAll(markAsRead = false) {
    const response = await apiClient.delete("/notifications/clear", {
      params: { markAsRead },
    });
    return response.data;
  },
};
```

### Payments Service

```typescript
import { apiClient } from "@/services/api";

export const paymentsService = {
  async createCheckout(data: {
    type: "TICKET" | "PRODUCT";
    eventId?: string;
    storeId?: string;
    items: Array<{
      name: string;
      unitPrice: number;
      quantity: number;
    }>;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    const response = await apiClient.post("/payments/checkout", data);
    return response.data;
  },

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const response = await apiClient.get("/payments/orders", { params });
    return response.data;
  },

  async getOrder(id: string) {
    const response = await apiClient.get(`/payments/orders/${id}`);
    return response.data;
  },

  async createRefund(orderId: string, reason?: string) {
    const response = await apiClient.post("/payments/refund", {
      orderId,
      reason,
    });
    return response.data;
  },
};
```

---

## Environment Variables

### Frontend `.env`

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
VITE_FRONTEND_URL=http://localhost:5173
```

### Production

```env
VITE_API_URL=https://api.showgeo.com/api
VITE_WS_URL=wss://api.showgeo.com
VITE_FRONTEND_URL=https://showgeo.com
```

---

## Best Practices

1. **Token Management**
   - Store tokens securely (use `httpOnly` cookies in production)
   - Refresh tokens automatically on 401 errors
   - Clear tokens on logout

2. **Error Handling**
   - Use consistent error handling utility
   - Show user-friendly error messages
   - Log errors for debugging

3. **Type Safety**
   - Use shared TypeScript types
   - Type all API responses
   - Validate responses with Zod or similar

4. **Request Optimization**
   - Use React Query for caching and refetching
   - Implement request debouncing where needed
   - Use pagination for large datasets

5. **WebSocket**
   - Reconnect on disconnect
   - Handle connection errors gracefully
   - Clean up socket connections on unmount

---

**Last Updated:** 2025-01-01  
**API Version:** 2.0.0

