{\rtf1\ansi\ansicpg1252\cocoartf2821
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Showgeo Requirements & Development Plan\
\
## Executive Summary\
Showgeo is a live LIVE streaming platform that empowers Entity, fans, and managers to connect through shared digital events. It offers live events, chat, virtual commerce, fan management, and AI-based recommendations to enrich every event experience.\
\
## Core Objectives\
- Unite: Create shared experiences between fans, Entity, and audiences.\
- Lift: Add monetization through subscriptions, merch, sponsorships, and data insights.\
- Extend: Expand access to remote audiences via live or scheduled streaming.\
\
---\
\
## System Overview\
\
### Frontend (React)\
- User and Entity login/sign-up\
- Event discovery and filtering (Free, Paid, Nearby, Genre-based)\
- Live event page with chat and media\
- Entity and Fan profile pages\
- Store/Cart for merchandise\
- Discussion boards, notifications, and user engagement tools\
\
### Backend (Ruby on Rails)\
- API services for user auth, events, store, streaming metadata, discussion\
- Admin and manager control panels\
- Secure streaming service integration (Agora, Zoom)\
- Payment processing (Stripe)\
- AI integrations (recommendations, hashtag usage, event predictions)\
\
---\
\
## Key Features (Combined from CSV, PDFs, and Docs)\
\
### Entity & Admin Tools\
- Entity Screening Portal\
- Entity Packages + Store creation\
- Event Planning Tools\
- Admin Portal with Analytics, Region/Location/Event management\
- AI-based Post and Pre-Event Optimization Tools\
- Entity Profile: For creators/organizations, includes branding, bio, events, tours
- Entity Admin: A type of Manager with full permissions, or use only "Manager" for all variations and define permission levels (e.g., Manager (Full), Manager (Limited)).

\
### Streaming & Events\
- Live event streaming (Agora, Zoom, Webcam support)\
- Phased event launch
	- Pre-LIVE testing and entertainment launch
	- Stream phase lifecycle and coordinator controls
	- Post-event fan meetups
- Real-time event viewer count & chat\
- Join via time-based launch or event schedule\
- Countdown and trailer system before event phase launch\
- Event landing pages (Live, Upcoming, Past)\
- API services for geographic stream filtering and restrictions (per event)


\
### User & Fan Experience\
- Sign-up, Sign-in, Forgot Password\
- Search Entity, events, or fans\
- Chat & Inbox (Direct Messaging, Groups, Read receipts)\
- Notifications & Discussion Rooms\
- Wallet system for buying, sending, or receiving credits\
- Users can follow Entities to receive notifications about events, tours, or announcements.
- User Profile: For attendees, followers, general users
- User Profile Management (edit bio, interests, image, etc.).


\
### E-Commerce\
- Store by Event, Entity, or Category\
- Product Search, Filters, and Scheduled Posts\
- Discount engine\
- Scheduled product availability\
\
### AI & Recommendation\
- Event suggestion by age, genre, interest\
- Hashtag popularity prediction + recommendation\
- Song suggestion engine\
- Nearby event detection based on user data\
\
### Mobile App Goals\
- Improve mobile layout and interaction\
- Redesign home and sign-in flow\
- Enhance usability vs. web mirroring\
\
---\
\
## Milestones Summary\
\
### \uc0\u9989  Phase 1: Core Platform Features\
- Basic UI for event and store\
- Auth system\
- Event creation (Virtual, In-Person)\
- Store and cart setup\
- Payments via Stripe sandbox\
- Live streaming integration (Zoom/Agora)\
\
### \uc0\u55357 \u56580  Phase 2: Advanced Features & AI\
- Wallet implementation\
- AI suggestion systems\
- Account screening bots\
- Entity/Fan chat\
- Event recording + playback\
- User profile redesign\
\
### \uc0\u55357 \u56604  Phase 3: Scalability & Performance\
- Security improvements\
- AWS infrastructure\
- CI/CD pipelines\
- Ongoing QA and testing\
- Production deployment support\
\
---\
\
## Technical Stack\
- **Frontend:** React (JavaScript)\
- **Backend:** Ruby on Rails\
- **Database:** PostgreSQL\
- **Streaming APIs:** Agora, Zoom\
- **Payments:** Stripe\
- **Hosting:** AWS\
- **AI/ML:** Recommendation Engines, Trend Predictors\
\
---\
\
## Known Issues / Enhancements Needed\
- Stripe integration is incomplete (credit card saving not working)\
- Sign-in UX is confusing (requires redesign)\
- Mobile app is not fully responsive\
- Some endpoints are hard-coded and need dynamic configuration\
\
---\

### Entity-Based Model Enhancements

- All creator roles (previously "Artist") are now called **Entities**.
- An Entity may be an individual or organization.
- Entities can:
  - Create Events and Tours
  - Collaborate with other Entities
  - Launch Stores tied to Events, Tours, or general merchandise
  - Assign Event Coordinators or serve as their own

### Event Lifecycle Additions

- Events progress through structured **phases**:
  - Pre-Event (testing, hangouts, warmups)
  - Live LIVE (streaming, interaction, performance)
  - Post-Event (attendee chat, meet-and-greet)
- Coordinators can launch, delay, or extend each phase.

### User Follow System

- Users can follow Entities and receive:
  - Event/Tour notifications
  - Messages or promotions
  - Updates from discussion boards


\
## Next Steps\
1. Audit existing features vs. requirements\
2. Identify technical gaps\
3. Use AI in Cursor to:\
   - Refactor old code\
   - Build new endpoints\
   - Create missing UI flows\
4. Design milestone-based sprints\
}