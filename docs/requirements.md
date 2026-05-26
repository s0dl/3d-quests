# 3D Quests — Features & Requirements

## Overview

3D Quests is a browser-based 3D virtual tabletop (VTT) platform for tabletop RPG sessions. Game Masters (GMs) can build and share 3D maps, place tokens, and run live sessions with players in real time. A community library allows users to share and discover maps built by others.

---

## Architecture Summary

| Service | Tech | Deployment |
|---|---|---|
| web | Next.js, R3F, Drei | GCP Cloud Run |
| room-server | Node.js, Socket.IO | GCP Compute Engine VM |
| community-service | Node.js, Fastify | GCP Cloud Run |
| notification-service | Node.js, SSE | GCP Cloud Run |
| PostgreSQL | Prisma ORM | GCP Cloud SQL |
| Redis | ioredis | GCP Memorystore |
| Asset Storage | — | GCP Cloud Storage + Cloudflare CDN |
| Events | — | Kafka |

---

## MVP Features

### Authentication
- Email/password sign up and login via Better Auth
- Email verification on registration
- Password reset via email (Resend)
- Session management with JWT

### Campaign System
- GM creates a persistent campaign with a name and description
- Invite players via shareable campaign invite link or code
- Players join the campaign roster — membership persists across sessions
- GM can start a live session from the campaign dashboard, which spins up a WebSocket room on room-server
- All players in the campaign roster can join an active session
- Session ends when GM closes it — final state persists back to the campaign
- Player disconnect and reconnect handling with state resynchronization
- Campaign stores saved maps, session history, and player roster

### 3D Map Builder (GM only)
- 3D canvas powered by React Three Fiber and Drei
- Real 3D geometry — walls, floors, and terrain are actual meshes with collision, not painted tiles
- Place, move, rotate, and delete map tiles and terrain objects (walls, pillars, trees, rocks, etc.)
- Walls block movement and occlusion natively via 3D geometry
- Grid overlay toggle
- GM camera — orbit, pan, zoom (top-down view)
- Save map state to PostgreSQL
- Load a previously saved map into a session

### Permission Model
- GM controls: place/move/delete all map geometry, place/move all tokens, load maps, end session
- Player controls: move their own token only, ruler/distance measurement tool, location ping
- All permission checks enforced server-side on room-server — client UI hides unavailable controls but server is the source of truth
- Role (GM or player) is stored per campaign membership in PostgreSQL

### Token System
- Place player and NPC tokens on the map
- Move tokens in real time — all connected clients see movement live
- Token ownership — players can only move their own token, GM can move all
- Token labels (character name)

### Camera and Visibility
- Default view: top-down orbit camera for all players
- Occlusion handled naturally by 3D geometry — walls block line of sight without a separate fog of war system
- Player camera locked to their token's position and perspective in first-person mode (post-MVP)
- GM always retains top-down orbit view regardless of mode
- Lighting — point lights for torches and environmental light sources cast real shadows via 3D geometry

### Real-Time Sync (room-server)
- WebSocket connection per live session via Socket.IO
- Sync token position updates to all connected players
- Sync map geometry changes made by GM during session
- Sync player join/leave events
- Redis for live session state
- Session spun up when GM starts from campaign dashboard, torn down on session end

### Asset Management
- Default tile, terrain, and token asset library included
- GM can upload custom 3D assets (GLTF/GLB format)
- Presigned URL upload flow — client uploads directly to Cloud Storage
- Assets stored in GCP Cloud Storage, served via Cloudflare CDN

---

## Post-MVP Features

### Community Maps
- GM can publish a saved map to the community library
- Browse and search community maps by name, tags, and game system
- Preview a map before importing
- Import a community map into a session
- Rate and review community maps
- Map metadata stored in PostgreSQL (community-service)
- Map files stored in Cloud Storage

### Notifications (notification-service)
- In-app notifications via Server-Sent Events
- Notify user when their map receives a rating or comment
- Notify GM when a player joins their room
- Kafka events from community-service → notification-service → SSE → browser
- Notification read/unread state persisted in PostgreSQL

### Subscriptions (Stripe)
- Free tier with limited rooms and storage
- Pro tier ($5-7/month) — unlimited rooms, asset uploads, private maps, higher player limits
- Stripe Checkout and webhook handling in Next.js API routes
- Subscription status stored in PostgreSQL

### First Person Mode
- Player camera attaches to their token at eye level
- Same world geometry — collision and occlusion already handled, camera change is the only delta
- Torchlight and darkvision radius limits visibility via point lighting
- GM retains top-down orbit view at all times
- Top-down remains available as a toggle for players who prefer it

### Social
- User profiles with published maps and session history
- Follow other creators
- Map collections / favourites

---

## Non-Functional Requirements

### Performance
- Token movement sync latency under 100ms for sessions under 8 players
- 3D canvas target 60fps on mid-range hardware
- Asset delivery via CDN for fast global load times

### Reliability
- Player disconnect handled gracefully — state preserved in Redis, resync on reconnect
- Room state persisted to PostgreSQL on session end
- Sentry error tracking on all services

### Observability
- Pino structured JSON logging on room-server and community-service
- Posthog product analytics on web (map creation funnels, session starts, community engagement)
- GCP Cloud Logging for aggregated log access

### Security
- All API routes authenticated via Better Auth session
- Presigned URLs expire after 15 minutes
- GM-only actions enforced server-side on room-server
- Input validation via Zod on all WebSocket payloads and API routes

### Developer Experience
- Monorepo with pnpm workspaces and Turborepo
- Shared TypeScript types and Zod schemas in packages/shared
- Docker Compose for local PostgreSQL and Redis
- GitHub Actions CI/CD — lint, typecheck, build, deploy on merge to main
- Terraform for all GCP infrastructure

---

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js (App Router), React Three Fiber, Drei |
| Auth | Better Auth |
| ORM | Prisma |
| Validation | Zod (shared package) |
| WebSockets | Socket.IO |
| Logging | Pino |
| Error tracking | Sentry |
| Analytics | Posthog |
| Email | Resend |
| Payments | Stripe |
| Database | PostgreSQL (Cloud SQL) |
| Cache / Room state | Redis (Memorystore) |
| Asset storage | GCP Cloud Storage + Cloudflare CDN |
| Async events | Kafka |
| Containerisation | Docker + Docker Compose (local) |
| Infrastructure | Terraform |
| CI/CD | GitHub Actions |

---

## Monorepo Structure

```
3d-quests/
├── apps/
│   ├── web/                    # Next.js app
│   │   ├── src/
│   │   │   ├── pages/            # Pages Router pages and API routes
│   │   │   ├── components/
│   │   │   │   ├── ui/         # Generic UI components
│   │   │   │   └── canvas/     # R3F/Drei components
│   │   │   └─ lib/            # Auth config, utilities
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.ts
│   │
│   ├── server/            # WebSocket server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── rooms/          # Room state management
│   │   │   ├── handlers/       # Socket event handlers
│   │   │   └── lib/            # Redis client, Pino logger
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── community/      # Maps, assets, ratings
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   ├── handlers/
│   │   │   └── lib/            # Cloud Storage client, Kafka producer
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── notification/   # SSE + Kafka consumer
│       ├── src/
│       │   ├── index.ts
│       │   ├── consumers/      # Kafka consumers
│       │   └── lib/            # SSE connection manager
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── events.ts       # Zod WebSocket event schemas
│       │   ├── types.ts        # Shared TypeScript types
│       │   └── constants.ts
│       ├── package.json
│       └── tsconfig.json
│
├── infra/
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Build Order

1. Monorepo scaffold — Turborepo, pnpm workspaces, shared package, Docker Compose
2. Auth — Better Auth, PostgreSQL schema for users and sessions
3. Campaign system — create campaign, invite players, roster management
4. 3D canvas — R3F map builder with real geometry and collision, local state only
5. Map persistence — save/load maps via Next.js API and PostgreSQL
6. Session system — room-server WebSocket, Redis state, GM starts/ends session
7. Token sync — real-time token movement with permission enforcement
8. Asset uploads — Cloud Storage presigned URL flow
9. Community service — publish, browse, import maps
10. Notification service — Kafka + SSE
11. Stripe — subscription tiers and gating
12. First person mode — attach player camera to token
13. Social — profiles, follows, favourites