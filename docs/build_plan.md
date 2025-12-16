# 🧭 Showgeo 2.0 Build Plan
**Comprehensive Developer Blueprint — Modular NestJS + React + Prisma Architecture**

---

## 🚀 Overview

**Showgeo 2.0** is a modular, event-driven, AI-assisted platform that integrates **live streaming, commerce, social engagement, and analytics** into one cohesive system.  
The platform architecture is built on **NestJS (Backend)**, **React + Vite (Frontend)**, and **Prisma (ORM)** with a shared TypeScript model layer and consistent `.cursorrules` for Cursor automation.

---

## 📂 Project Structure

/backend
  ├── src/modules/
  │     ├── auth/
  │     ├── users/
  │     ├── entities/
  │     ├── follow/
  │     ├── store/
  │     ├── events/
  │     ├── streaming/
  │     ├── notifications/
  │     ├── analytics/
  │     ├── payments/
  │     └── assets/
  ├── prisma/
  ├── main.ts
  ├── app.module.ts
  ├── .env.example
  └── package.json

/frontend
  ├── src/features/
  │     ├── auth/
  │     ├── events/
  │     ├── entities/
  │     ├── follow/
  │     ├── store/
  │     ├── streaming/
  │     ├── notifications/
  │     ├── analytics/
  ├── components/
  ├── hooks/
  ├── pages/
  ├── services/
  ├── vite.config.ts
  └── package.json

/shared
  ├── types/
  ├── index.ts
  └── package.json

---

## 🧩 Core Modules Summary

| # | Module | Description | Key Features |
|---|---------|--------------|---------------|
| 1️⃣ | **AuthModule** | Identity and access management | JWT Auth, refresh tokens, roles, guards, decorators |
| 2️⃣ | **UsersModule** | Profile and user management | Public/private profiles, entity associations |
| 3️⃣ | **EntitiesModule** | Creator & organization accounts | Ownership, collaborators, verification, roles |
| 4️⃣ | **FollowModule** | Engagement tracking | Follow/unfollow, counts, followers, notifications hooks |
| 5️⃣ | **StoreModule** | Commerce for creators | Products, digital/physical sales, visibility control |
| 6️⃣ | **EventsModule** | Core event lifecycle management | Phase transitions (PRE, LIVE, POST), ticket hooks |
| 7️⃣ | **StreamingModule** | Live video/audio experiences | LiveKit integration, access levels, geofencing, metrics |
| 8️⃣ | **NotificationsModule** | Real-time communication | WebSocket gateway, unread counts, broadcasts |
| 9️⃣ | **AnalyticsModule** | Insights, metrics, and AI | Aggregation, engagement scores, recommendations |
| 🔟 | **PaymentsModule** | Ticketing and commerce | Stripe integration, checkout sessions, refunds, webhooks |
| 1️⃣1️⃣ | **AssetsModule** | File upload and management | Multi-type uploads (image/audio/video/doc), storage abstraction, access control |

---

## ⚙️ Integration Relationships

| Source | Target | Purpose |
|--------|---------|----------|
| **FollowModule** | NotificationsModule | Broadcast updates to followers |
| **StoreModule** | NotificationsModule | Send “NEW_DROP” notifications |
| **StreamingModule** | NotificationsModule | Send “LIVE_NOW” updates |
| **EventsModule** | NotificationsModule | Send “PHASE_UPDATE” alerts |
| **AnalyticsModule** | All | Aggregate metrics across modules |
| **AuthModule** | All | Provides JWT-based authentication |
| **EntitiesModule** | All | Ownership validation and scoping |
| **AssetsModule** | Users, Entities | File uploads for profiles, galleries, events |
| **PaymentsModule** | Store, Events | Checkout processing, order management |

---

## 🧠 Analytics Architecture

The **AnalyticsModule** centralizes system intelligence:

- **Data Inputs:** Events, Store, Streaming, Follow, Notifications  
- **Stored Outputs:** Aggregated summaries (Entity, Event, User, Platform)  
- **Engagement Score Formula:**  
  (Followers * 0.3) + (Viewers * 0.25) + (StoreRevenue * 0.2) + (TicketsSold * 0.15) + (NotificationsSent * 0.1)
- **AI Recommendations:**
  - Cosine similarity between user & entity interaction vectors
  - Personalized entity and event suggestions
- **Scheduling:**
  - Daily cron job (`@Cron(CronExpression.EVERY_DAY_AT_2AM)`)
  - Recomputes analytics for all entities and users

---

## 📡 Real-Time Architecture

**NotificationsModule + StreamingModule** provide full-duplex communication:

- **WebSocket Gateway:** `/notifications`
- **Events:** `notification`, `unread_count`, `connected`
- **Authentication:** JWT via handshake query
- **Multi-socket Support:** Handles multiple user sessions/tabs
- **Integrations:**
  - Streaming events → followers
  - Product drops → store followers
  - Phase changes → event followers

---

## 🔐 Environment Variables

Store sensitive keys only in production `.env` or Render environment.

DATABASE_URL=postgres://...
JWT_SECRET=<strong_random_secret>
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
LIVEKIT_URL=wss://your-instance.livekit.cloud
STRIPE_SECRET_KEY=<key>
REDIS_URL=redis://...

> `.env.example` should remain in Git for onboarding, `.env` excluded via `.gitignore`.

---

## 🧱 Frontend Integration Plan

**React + Vite + Tailwind + React Query**

Feature-based architecture aligns directly with backend modules.

| Feature | Key UI Components |
|----------|-------------------|
| Auth | Login/Register, Token refresh, Session hooks |
| Events | Create/Edit events, Phase tracker, Analytics cards |
| Streaming | Live player, Join session, Viewer metrics |
| Store | Product cards, Checkout UI (Stripe-ready) |
| Notifications | WebSocket live toasts, Inbox page |
| Analytics | Dashboard, Charts (Recharts/Chart.js) |
| Follow | Follower list, Follow buttons, Stats badges |

**Real-time data:** via Socket.io  
**Async operations:** via React Query  
**State management:** via Context + Hooks  

---

## 🧰 Developer Commands

### Install & Bootstrap
cd backend && npm install
cd ../frontend && npm install
cd ../shared && npm install

### Database Setup
cd backend
cp .env.example .env
npx prisma generate
npx prisma migrate dev

### Start Development
# Backend (NestJS)
npm run start:dev

# Frontend (React/Vite)
npm run dev

---

## 🧩 Future Enhancements

### 1. PaymentsModule
- ✅ Stripe Checkout + Webhooks - **IMPLEMENTED**
- ✅ Order + Revenue tracking - **IMPLEMENTED**
- ✅ Analytics integration for revenue - **IMPLEMENTED**  

### 2. AI Assistant Integration
- Suggest content scheduling, event timing  
- Summarize analytics insights for creators  

### 3. Redis + Queueing
- Caching metrics, fan-out jobs, notification queue  

### 4. Media Services
- ✅ File uploads (S3/Supabase Storage) - **IMPLEMENTED**  
- ⏳ Image optimization pipeline (Sharp integration pending)  

### 5. Automated Testing
- Jest + Supertest API coverage  
- Cypress e2e for UI flows  

### 6. Deployment
- Dockerized services for Render or Railway  
- GitHub Actions for CI/CD  
- Health check endpoints  

---

## 🧭 Daily Operations

| Task | Command | Notes |
|------|----------|-------|
| Run backend | `npm run start:dev` | Port 3000 |
| Run frontend | `npm run dev` | Port 5173 |
| Run Prisma Studio | `npx prisma studio` | Inspect DB |
| Manual analytics update | `POST /analytics/update` | Admin only |
| WebSocket test | `ws://localhost:3000/notifications` | Auth via token |

---

## 🧠 Summary

Showgeo 2.0 is a **next-generation live-event and creator economy platform** designed for:

- **Creators** — to stream, sell, and engage followers  
- **Viewers** — to interact, purchase, and discover  
- **Analysts/Admins** — to monitor engagement and performance  

It combines:
- **Modular backend architecture** (NestJS + Prisma)
- **Reactive frontend experience** (React + Socket.io)
- **Real-time communication** (Notifications + Streaming)
- **Intelligent analytics layer** (AI + Cron aggregation)

---

## 🏁 Version Control Notes

- Commit `/docs/build_plan.md` and `.cursorrules` for architectural reference.  
- Keep `.env`, database dumps, and compiled files excluded via `.gitignore`.  
- Use feature branches per module: `feature/notifications`, `feature/analytics`, etc.  
- Tag stable releases:  
  git tag -a v2.0.0 -m "Showgeo 2.0 stable - all core modules complete"
  git push origin --tags

---

**Author:** Showgeo Engineering  
**Generated via GPT-5 Developer Integration (Cursor-Aware)**  
**Version:** 2.0.0  
**Date:** 2025-11-01
