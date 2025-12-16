# Showgeo System Architecture

## Overview

**Showgeo 2.0** is a next-generation live LIVE and event streaming platform that connects fans, creators (“Entities”), and managers through immersive, real-time experiences.  
This rebuild is designed for stability, scalability, and maintainability while preserving the original vision of live, social, and monetized events.

---

## 🧩 Architecture Summary

| Layer | Technology | Purpose |
|-------|-------------|----------|
| **Frontend** | React (Vite + TypeScript) | User and entity web experience (auth, events, chat, store, streaming). |
| **Backend API** | NestJS (Node.js + TypeScript) | Core business logic, REST & WebSocket APIs, auth, payments, and integrations. |
| **Database** | PostgreSQL (managed on Render) | Primary relational store for users, entities, events, tours, stores, follows, etc. |
| **ORM / Data Layer** | Prisma | Type-safe schema and query interface for PostgreSQL. |
| **Streaming Engine** | LiveKit Cloud | Real-time WebRTC-based video/audio streaming, presence, and recording. |
| **Payments** | Stripe | Ticketing and store monetization. |
| **Storage** | Supabase or S3 | Event media, thumbnails, recordings, and digital downloads. |
| **Hosting** | Render | Unified deployment for frontend, backend, and database. |
| **AI Layer (optional)** | OpenAI / HuggingFace APIs | Personalized recommendations, event tagging, hashtag prediction. |

---

## 🖥️ Backend (NestJS)

### Structure
```
src/
├── main.ts
├── app.module.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── entities/
│   ├── events/
│   ├── tours/
│   ├── store/
│   ├── follow/
│   ├── streaming/
│   ├── notifications/
│   ├── analytics/
│   ├── payments/
│   └── assets/
├── common/
│   ├── decorators/
│   ├── filters/
│   └── guards/
└── prisma/
    └── schema.prisma
```

### Core Modules

| Module | Purpose |
|---------|----------|
| **Auth** | JWT-based login for Users, Entities, and Admins. Supports Google OAuth. |
| **Users** | Manages profiles, roles, and follow relationships. |
| **Entities** | Represents artists, organizations, or event owners. |
| **Events** | CRUD for live and prerecorded events; links to Tours, Stores, and Streaming sessions. |
| **Tours** | Groups events into thematic series. |
| **Store** | Digital storefront tied to an Entity, Event, or Tour. |
| **Follow** | Follow/Unfollow logic, notifications, and engagement tracking. |
| **Streaming** | Token generation for LiveKit rooms, phase management, viewership analytics. |
| **Notifications** | Event lifecycle alerts, chat messages, system updates. |
| **Analytics** | Insights, metrics aggregation, engagement scores, and AI recommendations. |
| **Payments** | Stripe integration for ticketing and store monetization. |
| **Assets** | File upload and management (images, audio, video, documents). |

---

## ⚡ Frontend (React + Vite + TypeScript)

### Folder Structure
```
src/
├── features/
│   ├── auth/
│   ├── events/
│   ├── entities/
│   ├── tours/
│   ├── store/
│   ├── follow/
│   ├── streaming/
│   └── notifications/
├── components/
├── pages/
├── hooks/
├── services/ (axios or react-query for API)
└── styles/
```

### Key UI Components
- **Event Discovery** – browse by location, genre, or Entity.
- **Event Page** – video stream + chat + merch.
- **Storefront** – cart, checkout, and Stripe payment UI.
- **Profile Pages** – user and entity public pages.
- **Dashboard** – entity management and analytics.
- **Chat & Notifications** – WebSocket-enabled updates.
- **Streaming Interface** – LiveKit SDK integrated for host and viewer.

---

## 📡 Streaming (LiveKit Integration)

### Architecture
```
Frontend (React SDK)
   ↕
Backend (NestJS Streaming Module)
   ↕
LiveKit Cloud (SFU WebRTC)
```

### Flow
1. **Coordinator/Entity** requests a session token from backend.
2. **Backend** generates a signed token via LiveKit server SDK.
3. **Frontend** connects to LiveKit room using WebRTC.
4. **Viewers** join as subscribers; Entities stream as publishers.
5. **Backend** monitors room events (join, leave, analytics).
6. Optionally, **recordings** are stored in S3 or Supabase.

### Features
- Multi-participant video rooms (Entity + Guests)
- Public or private audience access
- Geo-restricted event access
- Phase-based lifecycle: Pre, Live, Post
- Real-time chat, emojis, and polls
- Stream recording and replay

---

## 🗃️ Database Schema (Simplified)

```
User ── 1:1 ── UserProfile
User ── N:M ── Entity (via roles)
Entity ── 1:N ── Event
Entity ── 1:N ── Tour
Entity ── 1:N ── Store
Entity ── N:M ── Follows (User follows Entity)
Event ── 1:N ── Tickets
Event ── 1:1 ── Geofencing
Event ── 1:N ── ChatRooms
Event ── 1:N ── StreamingSessions
Tour ── 1:N ── Events
Store ── 1:N ── Products
User/Entity ── N:1 ── Asset (polymorphic via ownerType)
```

---

## 🔐 Authentication & Authorization

- JWT + Refresh tokens for web and mobile.
- Roles: `User`, `Entity`, `Manager`, `Coordinator`, `Admin`.
- Fine-grained permissions per model.

---

## 💸 Payments (Stripe)

- Checkout sessions created server-side via NestJS.
- Products tied to: `Store` items or `Events` (tickets).
- Webhooks handle: Payment success/failure, Ticket issuance, Wallet credit updates.

---

## ☁️ Deployment on Render

| Service | Type | Description |
|----------|------|-------------|
| **showgeo-ui** | Static site | React/Vite frontend (deployed from GitHub). |
| **showgeo-api** | Web service | NestJS backend, connects to PostgreSQL and LiveKit SDK. |
| **showgeo-db** | Managed database | PostgreSQL instance. |
| **showgeo-storage** | External | Supabase or AWS S3 for files and media. |
| **showgeo-streaming** | External | LiveKit Cloud (recommended). |

---

## ✅ Summary

> React (Vite) + NestJS + Prisma + PostgreSQL + LiveKit + Stripe + Supabase  
> hosted on Render for a unified deployment pipeline.

**Author:** Auto (Cursor AI) with guidance from Khalid Morris  
**Last Updated:** November 2025  
**Version:** 2.0.0
