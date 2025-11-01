# API Endpoints Reference

**Complete endpoint reference for Showgeo 2.0 API**

---

## Base Information

- **Base URL:** `http://localhost:3000/api`
- **API Prefix:** `/api`
- **Content-Type:** `application/json`
- **Authentication:** JWT Bearer Token (except public endpoints)

---

## Authentication Endpoints

### Register
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "USER",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": { "id": "string", "email": "string", "role": "USER" }
}
```

---

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`

---

### Refresh Token
```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response:** `200 OK`

---

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

## User Endpoints

### List Users (Admin)
```http
GET /api/users?page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `role` (string, optional)
- `search` (string, optional)

**Response:** `200 OK`
```json
{
  "data": [User],
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

---

### Get User by ID
```http
GET /api/users/:id
```

**Response:** `200 OK`

---

### Get User by Username
```http
GET /api/users/username/:username
```

**Response:** `200 OK`

---

### Get User Entities
```http
GET /api/users/:id/entities
```

**Response:** `200 OK`
```json
{
  "owned": [Entity],
  "followed": [Entity]
}
```

---

### Update User Profile
```http
PATCH /api/users/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "bio": "string",
  "avatarUrl": "string",
  "location": "string"
}
```

**Response:** `200 OK`

---

### Delete User (Admin)
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

## Entity Endpoints

### Create Entity
```http
POST /api/entities
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "slug": "string",
  "type": "ARTIST",
  "description": "string",
  "isPublic": true
}
```

**Response:** `201 Created`

---

### List Entities
```http
GET /api/entities?page=1&limit=20&type=ARTIST&search=string
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `type` (string, optional)
- `search` (string, optional)
- `isVerified` (boolean, optional)

**Response:** `200 OK`

---

### Get Entity by ID
```http
GET /api/entities/:id
```

**Response:** `200 OK`

---

### Get Entity by Slug
```http
GET /api/entities/slug/:slug
```

**Response:** `200 OK`

---

### Update Entity
```http
PATCH /api/entities/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "isPublic": true
}
```

**Response:** `200 OK`

---

### Delete Entity
```http
DELETE /api/entities/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### Add Collaborator
```http
POST /api/entities/:id/collaborators
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "string",
  "role": "MANAGER"
}
```

**Response:** `201 Created`

---

### Remove Collaborator
```http
DELETE /api/entities/:id/collaborators/:userId
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### List Collaborators
```http
GET /api/entities/:id/collaborators
```

**Response:** `200 OK`

---

## Event Endpoints

### Create Event
```http
POST /api/events
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "entityId": "string",
  "name": "string",
  "description": "string",
  "type": "LIVE",
  "startTime": "2025-01-01T00:00:00.000Z",
  "endTime": "2025-01-01T23:59:59.000Z",
  "phase": "PRE_CONCERT",
  "status": "SCHEDULED"
}
```

**Response:** `201 Created`

---

### List Events
```http
GET /api/events?page=1&limit=20&entityId=string&phase=PRE_CONCERT&status=SCHEDULED
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `entityId` (string, optional)
- `phase` (string, optional)
- `status` (string, optional)
- `type` (string, optional)
- `startDate` (string, optional)
- `endDate` (string, optional)

**Response:** `200 OK`

---

### Get Event by ID
```http
GET /api/events/:id
```

**Response:** `200 OK`

---

### Update Event
```http
PATCH /api/events/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "startTime": "2025-01-01T00:00:00.000Z"
}
```

**Response:** `200 OK`

---

### Delete Event
```http
DELETE /api/events/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### Transition Event Phase
```http
POST /api/events/:id/phase/transition
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "phase": "CONCERT"
}
```

**Response:** `200 OK`

---

### Extend Event Phase
```http
POST /api/events/:id/phase/extend
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "duration": 3600
}
```

**Response:** `200 OK`

---

### Get Event Metrics
```http
GET /api/events/:id/metrics
```

**Response:** `200 OK`

---

### Update Event Metrics
```http
POST /api/events/:id/metrics
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "viewers": 100,
  "messages": 50,
  "reactions": 200
}
```

**Response:** `200 OK`

---

### Log Test Results
```http
POST /api/events/:id/test-results
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "audioLevel": 0.5,
  "videoQuality": "HD",
  "bitrate": 2000,
  "latency": 100
}
```

**Response:** `200 OK`

---

## Follow Endpoints

### Follow Entity
```http
POST /api/follow/:entityId
Authorization: Bearer <token>
```

**Response:** `201 Created`

---

### Unfollow Entity
```http
DELETE /api/follow/:entityId
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### Get Followers
```http
GET /api/follow/:entityId/followers?page=1&limit=20
```

**Response:** `200 OK`

---

### Get Following
```http
GET /api/follow/user/:userId?page=1&limit=20
```

**Response:** `200 OK`

---

### Check Follow Status
```http
GET /api/follow/status/:entityId
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "isFollowing": true
}
```

---

## Store Endpoints

### Create Store
```http
POST /api/stores
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "slug": "string",
  "description": "string",
  "status": "ACTIVE",
  "visibility": "PUBLIC"
}
```

**Response:** `201 Created`

---

### List Stores
```http
GET /api/stores?page=1&limit=20&entityId=string&isActive=true
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `entityId` (string, optional)
- `isActive` (boolean, optional)
- `visibility` (string, optional)

**Response:** `200 OK`

---

### Get Store by ID
```http
GET /api/stores/:id
```

**Response:** `200 OK`

---

### Get Store by Entity
```http
GET /api/stores/entity/:entityId
```

**Response:** `200 OK`

---

### Update Store
```http
PATCH /api/stores/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "status": "ACTIVE"
}
```

**Response:** `200 OK`

---

### Delete Store
```http
DELETE /api/stores/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### Add Product
```http
POST /api/stores/:id/products
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "price": 99.99,
  "currency": "USD",
  "isDigital": false,
  "isAvailable": true
}
```

**Response:** `201 Created`

---

### Update Product
```http
PATCH /api/stores/products/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "price": 99.99,
  "isAvailable": true
}
```

**Response:** `200 OK`

---

### Delete Product
```http
DELETE /api/stores/products/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

## Streaming Endpoints

### Create Streaming Session
```http
POST /api/streaming/session/:eventId
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "accessLevel": "PUBLIC",
  "geoRegions": ["US", "CA"]
}
```

**Response:** `201 Created`

---

### Generate LiveKit Token
```http
POST /api/streaming/token/:eventId
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "role": "publisher",
  "country": "US",
  "state": "CA",
  "city": "Los Angeles",
  "timezone": "America/Los_Angeles"
}
```

**Response:** `200 OK`
```json
{
  "token": "string",
  "roomName": "string",
  "url": "string"
}
```

---

### End Streaming Session
```http
POST /api/streaming/session/:id/end
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### List Active Sessions
```http
GET /api/streaming/active
```

**Response:** `200 OK`

---

### Get Session Details
```http
GET /api/streaming/:id
```

**Response:** `200 OK`

---

### Update Session Metrics
```http
POST /api/streaming/:id/metrics
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "viewers": 100,
  "participants": 10,
  "messages": 50
}
```

**Response:** `200 OK`

---

## Notification Endpoints

### Get Notifications
```http
GET /api/notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `unreadOnly` (boolean, optional)

**Response:** `200 OK`

---

### Get Unread Count
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "count": 5
}
```

---

### Mark as Read
```http
PATCH /api/notifications/:id/read
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### Clear Notifications
```http
DELETE /api/notifications/clear?markAsRead=false
Authorization: Bearer <token>
```

**Query Parameters:**
- `markAsRead` (boolean, default: false)

**Response:** `200 OK`

---

### Send Test Notification (Admin)
```http
POST /api/notifications/test
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "string",
  "type": "CUSTOM",
  "message": "string"
}
```

**Response:** `201 Created`

---

## Analytics Endpoints

### Get Entity Analytics
```http
GET /api/analytics/entity/:entityId
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### Get Event Analytics
```http
GET /api/analytics/event/:eventId
```

**Response:** `200 OK`

---

### Get User Analytics
```http
GET /api/analytics/user/:userId
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### Get Platform Overview (Admin)
```http
GET /api/analytics/overview
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### Get Recommendations
```http
GET /api/analytics/recommendations/:userId
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "entities": [Entity],
  "events": [Event]
}
```

---

## Payment Endpoints

### Create Checkout Session
```http
POST /api/payments/checkout
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "type": "TICKET",
  "eventId": "string",
  "items": [
    {
      "name": "VIP Ticket",
      "unitPrice": 99.99,
      "quantity": 2
    }
  ],
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Response:** `201 Created`
```json
{
  "sessionId": "string",
  "url": "https://checkout.stripe.com/..."
}
```

---

### Stripe Webhook
```http
POST /api/payments/webhook
```

**Note:** This endpoint is called by Stripe, not by the frontend.

---

### List Orders
```http
GET /api/payments/orders?page=1&limit=20&status=COMPLETED
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `status` (string, optional)
- `type` (string, optional)

**Response:** `200 OK`

---

### Get Order Details
```http
GET /api/payments/orders/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### Create Refund
```http
POST /api/payments/refund
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "orderId": "string",
  "reason": "string"
}
```

**Response:** `201 Created`

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Resource already exists",
  "error": "Conflict"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

**Last Updated:** 2025-01-01  
**API Version:** 2.0.0

