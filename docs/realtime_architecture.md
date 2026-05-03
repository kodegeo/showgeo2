# Realtime Architecture (Source of Truth)

This document defines the realtime system architecture for the Showgeo platform.

It governs how live events, audience interaction, creator feedback, and coordinator controls are implemented and scaled.

All AI-generated code (Cursor / Claude) MUST comply with the rules derived from this document and enforced in CLAUDE.md.

---

# Core Principles

1. **Event-Scoped Isolation**
   - Every event operates in its own realtime namespace
   - No global broadcast channels

2. **Role-Based Consumption**
   - Audience, Creator, and Coordinator receive different data streams

3. **Aggregation Over Raw Events**
   - High-frequency signals (taps, typing) must NEVER be broadcast raw
   - Always aggregate before emitting

4. **Stateless Edge, Stateful Core**
   - Fly instances are stateless
   - Realtime state must not rely on in-memory node state

5. **Separation of Concerns**
   - Video streaming ≠ interaction system ≠ messaging system

---

# 🧠 System Overview

```text
Audience → Realtime Gateway → Aggregator → Broadcast
                                  ↓
                           Creator View
                                  ↓
                           Coordinator Control
# Core Systems
1. Event Room Model

Each event gets its own namespace:

event:{eventId}

Inside each event, we use topic-based channels:

event:{eventId}:event-state
event:{eventId}:audience-pulse
event:{eventId}:chat
event:{eventId}:typing
event:{eventId}:camera-control
event:{eventId}:moderation
event:{eventId}:creator-feedback

2. Role-Based Subscriptions
# Audience

Subscribes to:

event-state
audience-pulse (aggregated)
chat

Publishes:

taps
messages

🎤 Creator

Subscribes to:

event-state
audience-pulse (aggregated)
creator-feedback (filtered signals)
selected chat (optional)

Publishes:

optional signals (future)

🎛 Coordinator

Subscribes to:

ALL topics

Publishes:

camera-control
moderation
event-state changes

# Interaction System (Pulse Engine)
Input (high frequency)
tap events
typing signals
message sends
Rule

# DO NOT BROADCAST RAW INPUT EVENTS

Aggregation Model

Inputs are processed into time-windowed aggregates:

AudiencePulseAggregate = {
  eventId: string;
  windowMs: number;
  tapCount: number;
  activeUsers: number;
  energy: number;        // 0–100
  velocity: number;      // change rate
  dominantEmotion?: string;
  timestamp: number;
}

Broadcast Frequency
250ms–1000ms intervals
Never per-event emission

# Chat System
Channel
event:{eventId}:chat
Characteristics
lower frequency than taps
persisted in database
broadcast to subscribers
Typing Signals
event:{eventId}:typing

# Rules:

sampled (not per keystroke)
aggregated display:
"12 people are typing..."

# Video System

Separation Rule

Video streaming is NOT part of realtime interaction channels.

Responsibilities
LiveKit (or streaming provider)
video/audio transport
low-latency streaming
Backend Responsibilities
issue playback tokens
enforce access control
map event → stream

# Access Enforcement

Access must be enforced at:

1. Frontend (UX only)
show/hide player
2. Backend (REQUIRED)
playback token endpoint
chat access
interaction publishing
Rule

# NO ACCESS → NO TOKEN → NO STREAM

# Realtime Infrastructure

Fly.io Constraints
multiple instances across regions
no shared memory between instances

# Required Components

1. Realtime Gateway

Handles:

WebSocket connections
routing by eventId
topic subscriptions
2. Pub/Sub Layer

Recommended:

Redis (Upstash on Fly)
or NATS (future scale)

Used for:

fanout between instances
cross-region sync
3. Aggregator Service

Handles:

batching tap events
computing energy
emitting aggregate updates
Data Flow

# Client → Gateway → Pub/Sub → Aggregator → Pub/Sub → Clients

Event State Model
EventState = {
  isLive: boolean;
  activeCameraId: string;
  viewerCount: number;
  energyLevel: number;
}

Broadcast via:

event:{eventId}:event-state
🎛 Coordinator Control
Channel
event:{eventId}:camera-control
Example
{
  type: "SWITCH_CAMERA",
  cameraId: "cam_2"
}

# Moderation
Channel
event:{eventId}:moderation

Used for:

message removal
user mute
flagging
❌ Anti-Patterns (DO NOT DO)
❌ Global realtime channel
❌ Broadcasting raw taps
❌ Mixing video + interaction systems
❌ Relying on in-memory state
❌ Sending all topics to all users

# Scaling Strategy
Horizontal Scaling
scale Fly instances
use Redis/NATS for sync
Load Control
aggregate high-frequency signals
throttle client emission if needed
Regional Strategy (future)
route users to nearest region
keep event aggregation centralized

# Future Extensions
multi-camera switching UI
creator emotion dashboard
AI moderation
replay + highlights
sentiment analysis

# Summary
Event = isolated realtime room
Roles = filtered views of same system
Taps/comments = signals → aggregated → broadcast
Video = separate system
State = centralized + synchronized