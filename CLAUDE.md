# CLAUDE.md

# Claude Instructions

This file defines constraints and rules for all AI-generated code.

All implementations must align with:
- /docs/REALTIME_ARCHITECTURE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**Showgeo 2.0** is a next-generation live streaming platform connecting fans, creators ("Entities"), and managers. The project is a monorepo containing a React frontend, NestJS backend, WebSocket realtime service, and shared TypeScript types.

**Repository:** https://github.com/kodegeo/showgeo2.git

---

## Project Structure

```
showgeo-2/
├── backend/              # NestJS API (Node.js + TypeScript)
│   ├── src/
│   │   ├── main.ts       # Application entry point
│   │   ├── app.module.ts # Root module with 33 feature modules
│   │   ├── modules/      # Feature modules (auth, events, entities, streaming, etc.)
│   │   └── common/       # Decorators, guards, filters, helpers
│   ├── prisma/
│   │   ├── schema.prisma # Database schema (multi-schema: auth + public)
│   │   ├── migrations/   # Prisma migrations
│   │   └── seed-streaming.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile        # Multi-stage build for Node 20
│   └── .env              # Local environment variables
│
├── frontend/             # React + Vite + TypeScript
│   ├── src/
│   │   ├── features/     # Feature-based folders (auth, events, entities, streaming, etc.)
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page-level routes
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API integration (Axios, React Query)
│   │   ├── assets/       # Static images and logos
│   │   └── App.tsx
│   ├── vite.config.ts
│   ├── package.json
│   ├── .env              # Frontend environment variables
│   └── tailwind.config.js
│
├── services/
│   └── realtime/         # WebSocket server (Express + Socket.io)
│       ├── src/server.ts
│       └── package.json
│
├── packages/
│   ├── shared/           # @showgeo/shared - Shared TypeScript types
│   │   └── types/        # Common interfaces for frontend and backend
│   └── types/
│
├── docs/                 # System documentation and requirements
├── package.json          # Root monorepo config (minimal)
└── README.md
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-------------|----------|
| **Frontend** | React 18.3.1 + Vite 4 + TypeScript | User and entity web experience |
| **Backend** | NestJS 10 + Node.js + TypeScript | REST/WebSocket APIs, business logic |
| **Database** | PostgreSQL + Prisma 5.15 | Primary relational store (2 schemas: auth, public) |
| **Streaming** | LiveKit Cloud | Real-time WebRTC video/audio |
| **Realtime** | Express + Socket.io 4.7 | Event lobbies and chat |
| **Payments** | Stripe | Ticketing and store monetization |
| **Storage** | Supabase + S3 | Media assets and recordings |
| **Auth** | Supabase + JWT + Google OAuth | Authentication and authorization |
| **Hosting** | Render (Docker) | Backend and database deployment |
| **Styling** | TailwindCSS 3.3 | Frontend styling |

---

## Backend Commands

All backend commands assume you are in the `backend/` directory.

### Setup
```bash
npm install
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run pending migrations
npm run prisma:seed        # Run seed script (if available)
```

### Development
```bash
npm run start:dev          # Watch mode with hot reload (port 3000)
npm run start:debug        # Debug mode with inspection
```

### Production
```bash
npm run build              # Compile TypeScript to dist/
npm run start:prod         # Run compiled code
```

### Code Quality
```bash
npm run lint               # Run ESLint with auto-fix
npm run format             # Format with Prettier
```

### Database
```bash
npm run prisma:studio     # Open Prisma Studio (GUI)
npm run prisma:seed:streaming  # Seed streaming test data
```

### Testing
```bash
npm test                   # Run Jest tests
npm run test:watch         # Watch mode
npm run test:cov          # Coverage report
npm run test:e2e          # End-to-end tests
```

### API Documentation
The backend generates OpenAPI/Swagger docs at:
- **Development:** http://localhost:3000/api/docs
- **Annotations:** Use `@nestjs/swagger` decorators (`@ApiOperation`, `@ApiResponse`, etc.)

---

## Frontend Commands

All frontend commands assume you are in the `frontend/` directory.

### Setup
```bash
npm install
```

### Development
```bash
npm run dev                # Vite dev server (port 5173, proxies /api to backend:3000)
```

### Production
```bash
npm run build              # Build optimized production bundle
npm run preview            # Preview production build locally
```

### Code Quality
```bash
npm run lint               # Run ESLint
npm run format             # Format with Prettier
```

---

## Realtime Service Commands

All realtime commands assume you are in the `services/realtime/` directory.

### Setup
```bash
npm install
```

### Development
```bash
npm run dev                # Watch mode with tsx (port 3001)
```

### Production
```bash
npm run build              # Compile TypeScript
npm start                  # Run compiled code
```

---

## Environment Variables

### Backend (.env)
Critical variables for development/production:
- `DATABASE_URL` – PostgreSQL connection with PgBouncer (production)
- `DIRECT_DATABASE_URL` – Direct PostgreSQL connection (migrations only)
- `JWT_SECRET` – Secret for JWT signing
- `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` – Auth and storage
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` – Streaming service
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` – Payment processing
- `SENDGRID_API_KEY`, `EMAIL_FROM` – Email notifications
- `FRONTEND_URL` – Frontend origin for CORS (default: http://localhost:5173)
- `PORT` – API port (default: 3000)

### Frontend (.env)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` – Supabase client
- `VITE_LIVEKIT_URL`, `VITE_LIVEKIT_API_KEY`, `VITE_LIVEKIT_API_SECRET` – LiveKit
- `VITE_APP_NAME` – Application display name

### Realtime (services/realtime/.env)
- `PORT` – WebSocket server port (default: 3001)

**Note:** Actual credentials are in `.env` files. Never commit secrets. Use Fly.io or Render secrets for production.

---

## Database Architecture

### Schema Overview
The Prisma schema uses PostgreSQL with **two schemas**:
- `auth` – Supabase Auth tables (users, sessions, identities, MFA, OAuth)
- `public` – Application domain models (entities, events, tours, stores, etc.)

### Key Models
- **app_users** – Application user profiles (not Supabase users)
- **entities** – Creators/organizations (INDIVIDUAL or ORGANIZATION)
- **events** – Live or prerecorded events (LIVE, PRERECORDED)
- **streaming_sessions** – LiveKit room sessions tied to events
- **tours** – Groups of events
- **stores** – Digital storefronts for entities or events
- **tickets** – Event access (FREE, PAID, GIFTED)
- **followers** – User-to-entity follow relationships
- **orders, payments** – E-commerce and payments
- **notifications, messages** – User communication
- **moderation_reports** – User behavior moderation

**Important:** The schema has two connection URLs:
- `DATABASE_URL` with `pgbouncer=true` for runtime (application queries)
- `DIRECT_DATABASE_URL` for Prisma migrations (no connection pooling)

### Enums
Key enums include: `EntityStatus`, `EventPhase`, `EventStatus`, `UserRole`, `StreamingAccessLevel`, `TicketType`, `OrderStatus`, and many more. Check `prisma/schema.prisma` for the full list.

---

## Backend Architecture

### Module Organization (33 modules)
The backend uses NestJS's modular pattern. Key modules include:

**Core Services:**
- `auth` – JWT + OAuth (Google) authentication
- `users` – User profile and role management
- `entities` – Creator/organization management
- `events` – Event CRUD, phases, and lifecycle
- `streaming` – LiveKit token generation, room management
- `notifications` – Event and user notifications
- `analytics` – Metrics, engagement scoring

**Commerce & Interaction:**
- `store` – Storefront and product management
- `payments` – Stripe integration for orders and payouts
- `tickets` – Ticketing and access control
- `gift_baskets` – Gift item management
- `registrations` – Event registration system
- `escrow` – Payment escrow for creators

**Engagement & Moderation:**
- `fan_interaction` – Reactions, rankings, signals
- `engagement_engine` – Energy scoring and recommendations
- `moderation` – User behavior reporting
- `chat` – Real-time chat (via Socket.io)
- `clips` – Event clip creation and management
- `meet_greet` – VIP meet-and-greet sessions

**Supporting Services:**
- `tours` – Tour management
- `follow` – Follow/unfollow logic
- `admin` – Admin operations
- `admin_reports` – Admin moderation reports
- `assets` – File upload and management
- `supabase` – Supabase SDK integration
- `upload` – Multipart upload handling
- `location` – Geofencing and location services
- `email` – Email notifications (SendGrid)
- `health` – Health check endpoints

### Common Patterns
- **Guards** in `src/common/guards/` – JWT authentication, role-based access
- **Decorators** in `src/common/decorators/` – Custom parameter and method decorators
- **Filters** in `src/common/filters/` – Exception handling
- **Helpers** in `src/common/helpers/` – Utility functions

### Entry Point
`src/main.ts` bootstraps the NestJS app with:
- CORS configuration (conditional based on `NODE_ENV`)
- Global validation pipes (DTO validation with class-validator)
- Swagger/OpenAPI documentation
- Global exception filter

---

## Frontend Architecture

### Feature-Based Organization
The frontend is organized by feature, not by type (e.g., `features/auth/`, `features/events/`). Each feature typically contains:
- Components specific to that feature
- Hooks for feature logic
- API service calls
- Feature-specific types and utilities

### Key Directories
- **features/** – Feature-based modules
- **components/** – Shared UI components (buttons, modals, cards, etc.)
- **pages/** – Top-level page components (often routable)
- **hooks/** – Custom React hooks for state, API calls, effects
- **services/** – Axios/React Query integration for API calls
- **contexts/** – React Context providers (state management)
- **layouts/** – Layout wrappers (navigation, sidebar, etc.)
- **lib/** – Utility functions and helpers
- **assets/** – Static images and SVGs

### State Management
- **Zustand** – Lightweight state store (preferred over Redux)
- **React Context** – For theme, auth, or feature-specific state
- **React Query** – Server state and caching for API calls

### Styling
- **TailwindCSS** – Utility-first CSS framework
- **Lucide React** – Icon library
- **Sonner** – Toast notifications
- **React Toastify** – Alternative notifications

### API Integration
- **Axios** – HTTP client for backend requests
- **React Query** – Data fetching, caching, and synchronization
- **Socket.io Client** – WebSocket communication with realtime service

---

## Shared Types

The `packages/shared/` directory exports TypeScript interfaces used by both frontend and backend:
```
@showgeo/shared
├── types/
│   ├── auth.ts
│   ├── entities.ts
│   ├── events.ts
│   ├── users.ts
│   ├── store.ts
│   ├── payments.ts
│   ├── tours.ts
│   ├── streaming.ts
│   └── ...
└── index.ts
```

**Backend reference:**
```typescript
import { User, Entity, Event } from "@showgeo/shared";
```

**Frontend reference:**
```typescript
import { User, Entity, Event } from "@shared";
```

---

## Realtime Service

The WebSocket server in `services/realtime/` handles:
- **Event lobbies** – Join `event_${eventId}` rooms
- **Messaging** – Broadcast messages within a room
- **Presence** – Track active participants

**Key events:**
- `join_event_lobby(eventId)` – Join an event's lobby
- `send_message(payload)` – Broadcast message to room

The frontend connects via Socket.io client:
```typescript
const socket = io(process.env.VITE_WS_URL || "http://localhost:3001");
socket.emit("join_event_lobby", eventId);
socket.on("message", handleMessage);
```

---

## Code Style and Conventions

### From .cursorrules
- **Components:** `PascalCase` (e.g., `EventCard.tsx`)
- **Files:** `kebab-case` (e.g., `event-card.tsx`)
- **Folders:** `kebab-case` (e.g., `src/features/event-details/`)
- **Database tables:** `snake_case` (e.g., `event_revenue_splits`)
- **Prisma models:** `PascalCase` (e.g., `EventRevenueSplits`)
- **Variables:** `camelCase` (e.g., `eventId`)

### Formatting
- **Prettier:** `line_length: 100`, `indentation: 2`, `trailing_commas: all`
- **ESLint:** Configured in both backend and frontend
- **TypeScript:** Strict mode enabled in tsconfig

### Backend-Specific
- Use NestJS service + controller pattern
- Use DTOs with `class-validator` for request validation
- Use `@nestjs/swagger` decorators for API documentation
- Prefer async/await over callbacks
- Use environment variables for all secrets

### Frontend-Specific
- Functional components with hooks (no class components)
- Use React Router for page-level routing
- Prefer composition over inheritance
- Extract reusable logic into custom hooks

---

## Deployment

### Hosting Platform
The application is deployed on **Render**:
- **Frontend:** Static site (React build)
- **Backend:** Web service (Docker container, Node 20)
- **Database:** PostgreSQL managed by Render or Supabase

### Docker Build
The `backend/Dockerfile` uses a single-stage build:
1. Installs Node 20 + OpenSSL
2. Installs dependencies
3. Generates Prisma Client
4. Builds NestJS app
5. Runs `node dist/src/main.js` on port 3000

### Database Connection
**Development:**
- Direct PostgreSQL connection (no pooling)

**Production (Fly.io + Supabase):**
- `DATABASE_URL` with PgBouncer (statement_cache_size=0)
- `DIRECT_DATABASE_URL` for migrations only
- Manage secrets via `fly secrets set`

---

## Key Files and Documentation

- **README.md** – Quick start and project overview
- **docs/system_architecture.md** – Detailed architecture documentation
- **docs/cursorrules** – Coding standards and AI guidance
- **backend/prisma/schema.prisma** – Complete database schema (1,500+ lines)
- **backend/src/app.module.ts** – Module imports and configuration
- **backend/src/main.ts** – Application bootstrap and middleware setup
- **frontend/vite.config.ts** – Build config with React deduplication
- **services/realtime/README.md** – WebSocket server documentation

---

## Common Development Tasks

### Adding a New API Endpoint
1. Create a DTO file in the module (e.g., `src/modules/events/dto/create-event.dto.ts`)
2. Add a service method in `*.service.ts`
3. Add a controller method in `*.controller.ts` with Swagger decorators
4. Test with `npm run test`
5. Document in Swagger (`/api/docs`)

### Adding a Database Model
1. Update `backend/prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:generate` to regenerate Prisma Client
4. Create corresponding service and controller if needed

### Adding a Frontend Page
1. Create feature folder in `frontend/src/features/` if not exists
2. Add page component in `frontend/src/pages/`
3. Set up routing in `frontend/src/router/` or `App.tsx`
4. Create API service in `frontend/src/services/`
5. Use custom hooks for state and data fetching

### Running Database Migrations
```bash
cd backend
npm run prisma:migrate    # Interactive migration creation
npm run prisma:generate   # Regenerate client after migrations
```

### Setting Up Local Development
```bash
# Backend
cd backend
npm install
npm run prisma:generate
npm run start:dev         # Runs on port 3000

# Frontend (in new terminal)
cd frontend
npm install
npm run dev               # Runs on port 5173, proxies /api to backend

# Realtime service (optional, in new terminal)
cd services/realtime
npm install
npm run dev               # Runs on port 3001
```

---

## Important Notes

1. **Multi-Schema Database:** The Prisma schema spans two PostgreSQL schemas (auth and public). Ensure migrations handle both.

2. **Connection Pooling:** Production uses PgBouncer. Always use `DIRECT_DATABASE_URL` for migrations, never the pooled connection.

3. **Supabase Auth:** User authentication is handled by Supabase, but application user profiles live in `app_users` table. Both must stay in sync.

4. **LiveKit Integration:** Streaming requires valid LiveKit credentials. Tokens are generated by the backend and passed to the frontend.

5. **Stripe Keys:** The backend has test Stripe keys in `.env`. Replace with live keys in production.

6. **Frontend Proxy:** The Vite dev server proxies `/api` requests to `http://localhost:3000`. Update the proxy target if the backend runs on a different port.

7. **React Deduplication:** The `vite.config.ts` includes a `dedupe` config for React and React-DOM to prevent version conflicts. Do not remove this.

8. **Realtime Service:** The Socket.io server is separate from the NestJS backend. Update `VITE_WS_URL` in frontend `.env` to point to the correct realtime server.

---

## Architecture Patterns

### Modular Backend
Each module (e.g., `events`) typically contains:
- `*.module.ts` – Module definition with providers and imports
- `*.service.ts` – Business logic
- `*.controller.ts` – HTTP endpoints
- `dto/` – Data transfer objects for request/response validation
- `entities/` – Database entity types (usually from Prisma)

### API Routes
The backend uses a global `/api` prefix. Controllers register routes relative to this:
```typescript
@Controller("events")  // → /api/events
export class EventsController { ... }
```

Some controllers use no prefix to handle legacy routes without `/api`.

### Authentication Flow
1. User logs in via Google OAuth or email/password through Supabase
2. Supabase returns JWT and user metadata
3. Frontend stores JWT in localStorage or secure storage
4. Frontend includes JWT in `Authorization: Bearer <token>` header
5. Backend validates JWT in guards and decorators
6. Endpoint returns 401 Unauthorized if token is invalid

### LiveKit Streaming
1. Backend generates a LiveKit token for a specific room and user
2. Frontend receives token and connects to LiveKit via `livekit-client`
3. Participants publish/subscribe to tracks (audio, video, screen share)
4. LiveKit Cloud handles WebRTC signaling and media relay

---

This CLAUDE.md should provide sufficient context for future instances of Claude Code to operate effectively in this repository. Refer to specific files in `docs/` for deeper architectural details or feature specifications.
