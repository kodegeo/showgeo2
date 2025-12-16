# Authentication Flow Reference

## Overview
Defines the complete authentication process for Showgeo 2.0, including signup, login, token handling, and logout.

---

## Endpoints

| Endpoint | Method | Auth | Description |
|-----------|--------|------|--------------|
| `/auth/register` | POST | ❌ | Register new user |
| `/auth/login` | POST | ❌ | Login existing user |
| `/auth/refresh` | POST | ✅ | Refresh access token |
| `/auth/me` | GET | ✅ | Get authenticated user |
| `/auth/logout` | POST | ✅ | Logout user |

---

## Signup Flow

1. User submits email and password.
2. Backend hashes password and creates record.
3. Access and refresh tokens returned.
4. Tokens stored in localStorage or cookies.

---

## Login Flow

1. User enters credentials.
2. Backend validates and returns JWTs.
3. Tokens stored locally.
4. Redirect to dashboard.

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

---

## Token Refresh Flow

- Auto-triggered when access token expires.
- Backend validates refresh token and issues new access token.

---

## Logout Flow

```ts
function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/";
}
```

---

## Navigation

| State | Redirect |
|--------|-----------|
| Guest | `/login` |
| Authenticated | `/dashboard` |
| Entity | `/entity/:id/dashboard` |
| Admin | `/admin` |

---

## Security
- Use HTTP-only cookies in production.
- Never log tokens.
- Always use HTTPS.
