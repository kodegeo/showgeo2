# Frontend API Architecture

## Overview
This document defines the API integration architecture between the **frontend (Vite + React)** and the **backend (NestJS)** for Showgeo 2.0. It ensures consistent communication, secure authentication handling, and environment-based configuration.

---

## API Client Configuration

**Location:** `src/services/api.ts`

### Axios Instance
The frontend uses Axios for HTTP communication with the backend API.

```ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### Key Notes
- **`VITE_API_URL`** must be defined in `.env` (frontend).
- **`withCredentials`** ensures cookies and JWT tokens are sent correctly.
- Errors are globally intercepted for token expiration handling.

---

## Environment Variables

**File:** `.env` (frontend root)

```bash
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Showgeo
```

---

## Authentication Flow Integration

All protected requests include an access token via:
- **Bearer header**: If tokens are stored in memory/localStorage.
- **HTTP-only cookies**: If tokens are stored securely on the backend.

```ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## Folder Structure

```
src/
 ├── services/
 │    ├── api.ts
 │    ├── authService.ts
 │    ├── userService.ts
 │    └── eventService.ts
 ├── contexts/
 │    ├── AuthContext.tsx
 │    └── EntityContext.tsx
 ├── hooks/
 │    ├── useAuth.ts
 │    ├── useEntityContext.ts
 │    └── useAxios.ts
 ├── pages/
 │    ├── LoginPage.tsx
 │    ├── SignupPage.tsx
 │    └── HomePage.tsx
```

---

## Integration Points

| Feature | Endpoint | Method | Auth | Description |
|----------|-----------|--------|------|--------------|
| Login | `/auth/login` | POST | ❌ | Authenticate user |
| Signup | `/auth/register` | POST | ❌ | Create new user |
| Refresh Token | `/auth/refresh` | POST | ✅ | Refresh access token |
| Get Profile | `/auth/me` | GET | ✅ | Fetch authenticated user |
| Convert to Entity | `/users/:id/convert-to-entity` | POST | ✅ | Convert user to entity |
| Upload Asset | `/assets/upload` | POST | ✅ | Upload asset |
