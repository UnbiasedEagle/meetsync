# MeetSync — WebRTC Video Conferencing

A real-time video conferencing application built with Next.js and Spring Boot. Authenticated hosts create rooms and invite participants via email. Guests join through a public invite link with no account required. Audio and video stream directly between browsers using WebRTC.

---

## Features

### Required by the assignment
- Host registration and JWT-based login
- Room creation with a unique, hard-to-guess invite token
- Email invites sent by the host (via Spring Boot Mail / Mailtrap)
- Public room join via invite link — no guest authentication required
- Real-time audio and video using WebRTC (peer-to-peer, no media server)
- Mute / unmute own audio
- Enable / disable own video
- Host can mute or unmute any participant
- Host can kick participants
- Leave room at any time — host leaving does not close the room

### Beyond the spec
- **TURN server integration** — dynamic credentials from [metered.ca](https://www.metered.ca) for cross-network calls (mobile, strict NAT)
- **Guest lobby** — guests wait on a lobby screen until the host joins; after 30 seconds the message updates to indicate the host may not be available
- **Host-left banner** — if the host disconnects mid-meeting, guests see a notice but stay in the room
- **Participant toasts** — join and leave events shown as toasts
- **Room management** — hosts can rename or delete rooms from the dashboard

---

## Architecture

### WebRTC — Mesh Topology

MeetSync uses a **mesh (peer-to-peer) topology**. Every participant connects directly to every other participant. There is no media server — audio and video bytes never touch the Spring Boot backend.

This was chosen over an SFU (Selective Forwarding Unit) because:
- It requires no media infrastructure
- It has lower latency (one fewer hop)
- It is the right fit for small group calls (the use case here)

```
  [Browser A] ──────────────── [Browser B]
       │                            │
       └──────── [Browser C] ───────┘

  Spring Boot handles only signaling (SDP + ICE).
  Media flows directly between browsers.
```

### Signaling Flow

The Spring Boot backend acts as a signaling relay over STOMP/WebSocket. It receives a signal message and broadcasts it to everyone in the room topic. Each browser filters by the `to` field.

```
1. Peer A joins  → broadcasts "join" to /topic/room/{roomId}
2. Peer B (already in room) receives "join"
   → creates RTCPeerConnection, adds local tracks
   → creates SDP offer, sends "offer" to Peer A
3. Peer A receives "offer"
   → creates RTCPeerConnection, adds local tracks
   → sets remote description, creates SDP answer
   → sends "answer" to Peer B
4. Peer B receives "answer" → sets remote description
5. Both peers exchange ICE candidates → browser negotiates best path
6. ICE connects → media flows peer-to-peer
```

### ICE — STUN vs TURN

WebRTC uses ICE (Interactive Connectivity Establishment) to find a network path between two browsers.

- **STUN** — tells a browser its public IP address. Works for most home and office networks. Free, no relay involved.
- **TURN** — a relay server used when a direct path cannot be established (e.g. mobile networks, symmetric NAT, corporate firewalls). Media is relayed through the TURN server.

For local testing or same-network calls, STUN is sufficient and TURN is not needed. For cross-network calls (e.g. one person on Wi-Fi, another on mobile data), TURN is required. MeetSync fetches short-lived TURN credentials from metered.ca on each room join and falls back to STUN-only if the fetch fails.

### Key Design Decisions

**Per-tab UUID for signaling identity**
Each browser tab generates a random UUID (`sessionId`) on mount rather than using the authenticated `userId`. This allows the same user to open two tabs (e.g. to monitor their own stream) without the signaling layer confusing the two sessions.

**ICE candidate buffering**
ICE candidates can arrive via STOMP before `setRemoteDescription()` has completed. Adding a candidate without a remote description throws an error, so candidates are buffered in a `pendingCandidates` ref and flushed immediately after the remote description is set.

**`hostEverPresent` latch**
Two separate states track host presence:
- `hostPresent` — reflects whether the host is currently connected. Resets to `false` when the host leaves.
- `hostEverPresent` — latches to `true` the first time the host joins and never resets.

This distinction is what separates the two UX states cleanly: a guest who has never seen the host shows the lobby screen; a guest who was already in a call with the host shows the "host has left" banner instead of being thrown back to the lobby.

**WebSocket endpoint is unauthenticated**
`/ws/**` is permitted without a JWT in Spring Security. This is intentional — guests do not have accounts and therefore have no token. The signaling layer is a stateless relay; it does not need to know who is speaking. Room-level access control (create, update, delete, invite) is enforced at the REST API level where a JWT is required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | Spring Boot 3, Kotlin |
| Database | PostgreSQL 16 + Spring Data JPA |
| Auth | Spring Security + JWT (jjwt) |
| Real-time | Spring WebSocket / STOMP (signaling) + WebRTC (media) |
| Email | Spring Boot Mail (Mailtrap sandbox) |
| Infrastructure | Docker Compose (PostgreSQL) |

---

## Prerequisites

- **Node.js** 18+
- **Java** 21+
- **Docker** (for running PostgreSQL via Docker Compose)
- A **Mailtrap** account for email — [sign up free](https://mailtrap.io)
- A **metered.ca** account for TURN — [sign up free](https://www.metered.ca) *(optional — only needed for cross-network calls)*

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd video-conference-app
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts a PostgreSQL 16 instance on port `5432` with database `meetsync`.

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in your values:

```env
DB_USERNAME=postgres
DB_PASSWORD=postgres
JWT_SECRET=        # generate with: openssl rand -hex 32
JWT_EXPIRATION=86400000
MAIL_USERNAME=     # from Mailtrap inbox SMTP credentials
MAIL_PASSWORD=     # from Mailtrap inbox SMTP credentials
FRONTEND_URL=http://localhost:3000
```

### 4. Run the backend

```bash
cd backend
./gradlew bootRun
```

The API is available at `http://localhost:8080`.

### 5. Configure the frontend

```bash
cp frontend/.env.local.example frontend/.env.local
```

Open `frontend/.env.local` and fill in your values:

```env
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_METERED_API_KEY=   # optional — leave blank for same-network testing
```

> **Note:** `NEXT_PUBLIC_METERED_API_KEY` is only required when participants are on different networks (e.g. one on Wi-Fi, another on mobile data). For local development with both browsers on the same machine or network, leave it blank — STUN is sufficient.

### 6. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The app is available at `http://localhost:3000`.

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Description | Required |
|---|---|---|
| `DB_USERNAME` | PostgreSQL username | Yes |
| `DB_PASSWORD` | PostgreSQL password | Yes |
| `JWT_SECRET` | Secret key for signing JWTs — generate with `openssl rand -hex 32` | Yes |
| `JWT_EXPIRATION` | Token expiry in milliseconds (default: `86400000` = 24 hours) | No |
| `MAIL_USERNAME` | SMTP username from Mailtrap (or any SMTP provider) | Yes |
| `MAIL_PASSWORD` | SMTP password from Mailtrap (or any SMTP provider) | Yes |
| `FRONTEND_URL` | Public URL of the frontend — used for CORS and invite email links | Yes |

### Frontend — `frontend/.env.local`

| Variable | Description | Required |
|---|---|---|
| `BACKEND_URL` | Backend base URL used in server-side data fetchers and Server Actions | Yes |
| `NEXT_PUBLIC_BACKEND_URL` | Backend base URL used in the browser for WebSocket connection | Yes |
| `NEXT_PUBLIC_APP_URL` | Public URL of this frontend — used to build invite links on room cards | Yes |
| `NEXT_PUBLIC_METERED_API_KEY` | metered.ca API key for TURN credentials — enables cross-network calls | No |

---

## Project Structure

```
video-conference-app/
├── docker-compose.yml              # PostgreSQL service
├── backend/
│   ├── .env                        # Local secrets (gitignored)
│   ├── .env.example                # Template — copy to .env
│   └── src/main/kotlin/com/meetsync/
│       ├── config/
│       │   ├── SecurityConfig.kt   # CORS, JWT filter, auth rules
│       │   └── WebSocketConfig.kt  # STOMP broker + /ws endpoint
│       ├── controller/
│       │   ├── AuthController.kt   # POST /api/auth/register, /login
│       │   ├── RoomController.kt   # Room CRUD + invite endpoint
│       │   └── SignalingController.kt  # WebSocket signal relay
│       ├── dto/                    # Request / response data classes
│       ├── entity/                 # User, Room JPA entities
│       ├── repository/             # Spring Data JPA interfaces
│       ├── security/
│       │   ├── JwtAuthFilter.kt    # Validates JWT on every request
│       │   └── JwtUtil.kt          # Token generation and validation
│       └── service/
│           ├── AuthService.kt      # Register, login
│           ├── RoomService.kt      # Room business logic
│           ├── EmailService.kt     # Invite email sender
│           └── UserDetailsServiceImpl.kt
└── frontend/
    ├── .env.local                  # Local secrets (gitignored)
    ├── .env.local.example          # Template — copy to .env.local
    ├── app/
    │   ├── (auth)/                 # Login and register pages
    │   ├── (host)/dashboard/       # Protected dashboard (host only)
    │   └── room/[roomId]/          # Public room page
    ├── components/
    │   └── rooms/
    │       ├── RoomView.tsx        # Main room UI — video grid, controls
    │       ├── VideoTitle.tsx      # Single video tile with overlays
    │       ├── RoomCard.tsx        # Dashboard room card (rename, delete)
    │       ├── RoomList.tsx        # Dashboard room grid
    │       ├── CreateRoomDialog.tsx
    │       ├── CreateRoomForm.tsx
    │       └── InviteForm.tsx      # Email invite dialog
    ├── hooks/
    │   └── useWebRTC.ts            # All WebRTC logic — connections, signaling, media
    ├── lib/
    │   ├── actions/                # Next.js Server Actions (auth, rooms)
    │   ├── data/                   # Server-side data fetchers
    │   └── config.ts               # Shared backend URL constant
    └── types/
        └── room.ts                 # Room type shared across frontend
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new host account |
| `POST` | `/api/auth/login` | No | Login and receive a JWT |
| `POST` | `/api/rooms` | JWT | Create a new room |
| `GET` | `/api/rooms/me` | JWT | List all rooms owned by the authenticated host |
| `GET` | `/api/rooms/{inviteToken}` | No | Get room details by invite token (used by guests) |
| `PUT` | `/api/rooms/{inviteToken}` | JWT | Rename a room (host only) |
| `DELETE` | `/api/rooms/{inviteToken}` | JWT | Delete a room (host only) |
| `POST` | `/api/rooms/{inviteToken}/invite` | JWT | Send an email invite (host only) |

---

## WebSocket Signaling Reference

All messages are sent to `/app/signal` and broadcast to `/topic/room/{roomId}`. Each client filters messages by the `to` field — messages without a `to` are broadcasts to the whole room.

| Signal type | Direction | Purpose |
|---|---|---|
| `join` | Peer → Room | Announce arrival; existing peers respond with an offer |
| `offer` | Peer → Peer | SDP offer initiating a WebRTC connection |
| `answer` | Peer → Peer | SDP answer completing the handshake |
| `ice-candidate` | Peer → Peer | ICE candidate for NAT traversal |
| `host-online` | Host → Room | Announces host presence; releases guests from the lobby |
| `leave` | Peer → Room | Announces departure so peers can close the connection |
| `kick` | Host → Peer | Forces the target peer to leave the room |
| `toggle-audio` | Host → Peer | Host remotely mutes or unmutes a participant |
| `media-state` | Peer → Room | Broadcasts current audio/video toggle state for UI indicators |

---

## Assumptions & Design Decisions

| Decision | Reasoning |
|---|---|
| Mesh topology over SFU | No media infrastructure required; lower latency; appropriate for small group calls |
| Per-tab UUID for signaling identity | Using `userId` would break if the same user opens two tabs; a per-tab UUID gives each session a distinct identity in the signaling layer |
| WebSocket endpoint unauthenticated | Guests have no JWT — requiring one would block them from the signaling layer entirely. Room-level auth is enforced at the REST layer |
| TURN credentials fetched dynamically | TURN credentials from metered.ca are time-limited; fetching on each join ensures they are always valid |
| Host leaving does not close the room | Per the assignment spec — guests can remain after the host leaves |
| `active` field on Room entity | Included in the schema for future soft-delete or room lifecycle management; currently all rooms are active |
| Email sending is real | Spring Boot Mail is wired to a Mailtrap sandbox — emails are sent and visible in the Mailtrap inbox, not silently dropped |
