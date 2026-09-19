# Architecture

## Overview

The system follows a classic three-tier architecture, chosen deliberately for
clarity in a viva setting over a more complex microservices approach, which
would be unjustified at this scale.

```
┌───────────────────────┐
│   React + Vite SPA      │   frontend/
│   (browser)              │
└───────────┬─────────────┘
            │ REST over HTTPS (JSON)
┌───────────▼─────────────┐
│   Express.js API          │   backend/
│   routes → controllers    │
│   → services → Prisma     │
└───────────┬─────────────┘
            │ SQL (via Prisma Client)
┌───────────▼─────────────┐
│   PostgreSQL               │   prisma/schema.prisma
└───────────────────────────┘
```

## Backend layering

```
backend/src/
├── routes/         Defines URL paths + middleware chains, delegates to controllers
├── controllers/    Thin HTTP layer: parse request, call a service, shape the response
├── services/        ALL business logic lives here. Controllers never touch Prisma directly.
├── middleware/      Cross-cutting concerns: auth, validation, rate limiting, error handling
├── config/          Environment loading, Prisma client singleton, logger
├── constants/       Detection thresholds (env-derived) and severity bands
└── utils/            Pure helper functions: distance calculation, API response shaping, validators
```

**Why this layering?** It keeps each file's responsibility obvious and
testable in isolation — the detection algorithm (`services/`) can be unit
tested with zero HTTP or database mocking beyond Prisma, and controllers stay
so thin they rarely need their own tests.

## The core orchestrator: `accident.service.js`

This is the single place where a sensor reading becomes (or doesn't become)
an accident record. Every other piece of business logic — the rolling sensor
buffer, the rule-based detector, the geo lookup, the notification dispatcher
— is a focused, independently-testable module that `accident.service.js`
composes together. This composition-over-inheritance approach is what lets
the simulator and a future real ESP32 device share **exactly the same**
detection code path: both ultimately call
`accidentService.processSensorReading()`.

## Data flow for a single sensor reading

```
POST /api/sensor-data (or Simulator "Run" button)
        │
        ▼
sensor.controller.js → accidentService.processSensorReading()
        │
        ├── 1. Persist raw SensorReading (always, unconditionally)
        ├── 2. Push into sensorBuffer.service.js (in-memory rolling window)
        ├── 3. accidentDetection.service.js → analyzeReading()
        │        └── severity.service.js → classifySeverity()
        │
        ├── 4. If NOT an accident → return early
        ├── 5. If in cooldown (accident.service.js → isInCooldown()) → skip (dedup)
        │
        └── 6. createAccidentRecord()
                 ├── sensorBuffer.service.js → getAccidentTimeline() (before/impact/after)
                 ├── geoLookup.service.js → findNearestPoliceStation() + findNearestHospital()
                 ├── Persist Accident + AccidentSensorSnapshot rows
                 └── notification.service.js → sendAccidentNotifications()
                          ├── console.provider.js / email.provider.js (+ optional sms.provider.js)
                          └── Persist Notification rows (PENDING → SENT/FAILED)
```

## Why an in-memory sensor buffer (and its trade-off)

The rolling buffer (`sensorBuffer.service.js`) is a `Map<vehicleId, reading[]>`
held in server memory rather than in the database, because it needs to be
read and written on every single incoming reading with minimal latency, and
it only needs to hold a few seconds of recent history. The trade-off,
documented explicitly: this doesn't survive a server restart, and doesn't
scale across multiple server instances without a shared store like Redis.
For a single-instance academic prototype this is an acceptable, explainable
simplification — and every reading is still durably persisted to
`SensorReading` in PostgreSQL regardless, so no data is lost, only the
"recent context" window is memory-local.

## Frontend structure

```
frontend/src/
├── api/            axios client with JWT interceptor
├── context/        AuthContext (login/logout/session)
├── components/      Reusable UI: layout shell, dashboard widgets, accident widgets
├── pages/           One file per route (see README's page list)
└── styles/           Design system (CSS custom properties + utility classes)
```

Pages fetch data directly via the axios client in `useEffect` — no separate
state-management library was introduced, since the data needs of this
prototype (mostly read-heavy dashboard/list/detail views) don't justify one.

## Security layers (mapped to code)

| Concern | Where |
|---|---|
| Password hashing | `auth.service.js` (bcrypt) |
| JWT issuing/verification | `auth.service.js`, `middleware/auth.middleware.js` |
| Role-based access | `middleware/auth.middleware.js` → `requireRole()` |
| Input validation | `utils/validators.js` + `middleware/validate.middleware.js` |
| Rate limiting | `middleware/rateLimit.middleware.js` |
| CORS | `app.js` |
| Security headers | `app.js` (helmet) |
| Centralized error handling | `middleware/error.middleware.js` |
| Secrets | `.env` files only, never committed (`.gitignore`) |

## Deployment topology

```
┌──────────────┐      ┌───────────────────┐      ┌────────────────────┐
│ Static host    │      │ Node host            │      │ Managed PostgreSQL  │
│ (frontend/dist)│─────▶│ (backend/, Express)   │─────▶│                       │
└──────────────┘      └───────────────────┘      └────────────────────┘
```

Frontend and backend are deployed independently and communicate purely over
REST — there is no server-side rendering or shared process, which keeps the
deployment story simple to explain and simple to actually do on free-tier
hosting during a student project.
