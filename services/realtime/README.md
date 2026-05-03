# showgeo-realtime

WebSocket server for event lobbies and realtime features.

## Setup

```bash
cd services/realtime
npm install
```

## Run

```bash
npm run dev    # development (tsx watch)
npm run build && npm start   # production
```

Server listens on port **3001** by default. Set `PORT` to override.

## Frontend

Set in `.env`:

```
VITE_WS_URL=http://localhost:3001
```

Lobby page: `/events/:eventId/lobby` — joins the event lobby room and can send/receive messages.

## Events

- **join_event_lobby** (eventId) — join room `event_${eventId}`
- **send_message** (payload) — broadcast to room `event_${payload.eventId}`; payload is emitted as **message** to the room
