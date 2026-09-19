# Smart Vehicle Accident Detection and Emergency Response System

A final-year engineering academic prototype that automatically detects vehicle
accidents from motion-sensor data and notifies the nearest police station and
hospital with structured accident details — with a live browser-based
simulator so the system can be demonstrated without any physical hardware.

> **Academic prototype disclaimer:** This system is built for a final-year
> engineering project and viva demonstration. It is **not** automotive-certified
> and **not** suitable for real-world life-critical deployment. Accident
> detection is simulation-first; real ESP32/MPU6050/GPS hardware integration is
> designed for and documented, but treated as a future extension.

---

## Table of contents

1. [Problem statement](#problem-statement)
2. [Objectives](#objectives)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Technology stack](#technology-stack)
6. [Database design](#database-design)
7. [Accident detection algorithm](#accident-detection-algorithm)
8. [Emergency notification workflow](#emergency-notification-workflow)
9. [API documentation](#api-documentation)
10. [Installation / deployment](#installation--deployment)
11. [Environment variables](#environment-variables)
12. [Simulation demo](#simulation-demo)
13. [Hardware integration plan](#hardware-integration-plan)
14. [Limitations](#limitations)
15. [Future enhancements](#future-enhancements)
16. [Screenshots](#screenshots)
17. [Viva explanation guide](#viva-explanation-guide)

---

## Problem statement

Road accidents often go unreported for critical minutes because no one at the
scene is able (or conscious) to call for help. A system that can automatically
detect a collision from a vehicle's own motion sensors, and immediately alert
the nearest police station and hospital with the vehicle's location and crash
details, can shrink emergency response time and improve outcomes.

This project builds that system as an academic, hardware-independent
prototype: a backend that runs a rule-based accident-detection algorithm over
streamed sensor data, a database that records full accident history, and a
dashboard that visualizes accidents on a map with live notification status.

## Objectives

- Detect a likely accident from acceleration, deceleration, and gyroscope
  signals — not from speed alone.
- Preserve the vehicle's speed **before**, **at**, and **after** impact, not
  just its post-crash "current" speed.
- Automatically identify the nearest police station and hospital to the
  accident location.
- Generate a structured emergency notification and deliver it through a
  pluggable channel (console/email/SMS), with graceful fallback if delivery
  fails.
- Maintain a full historical record of every accident for later review.
- Make the system demonstrable without hardware via a browser-based live
  simulator, while keeping the exact same detection pipeline hardware-ready
  for a real ESP32 + MPU6050/MPU9250 + GPS module.

## Features

- **Vehicle registration & management** — CRUD for vehicles with owner and
  device metadata.
- **Hardware-ready sensor ingestion** — a single `POST /api/sensor-data`
  endpoint that accepts the same payload shape from the simulator or a real
  device.
- **Rule-based accident detection** — combines deceleration, resultant
  acceleration spike, and abnormal gyroscopic movement into a confidence score
  and severity classification.
- **Speed-at-impact extraction** — a rolling in-memory sensor buffer per
  vehicle preserves the readings immediately before and after the trigger
  reading.
- **Nearest police station & hospital lookup** — an abstracted geo-lookup
  service (mock data by default, pluggable for a real Places API).
- **Emergency notifications** — console (always works), email (SMTP via
  nodemailer), and optional SMS, all behind one `NotificationService`
  abstraction with automatic fallback to a simulated send.
- **Duplicate accident prevention** — a configurable cooldown window per
  vehicle.
- **Dashboard** — vehicle/accident counts, severity breakdown chart, and a
  recent accidents table.
- **Accident details page** — map (accident + nearest police + nearest
  hospital with distance lines), full sensor snapshot timeline chart, and
  notification acknowledgement.
- **Live simulator** — Normal / Sudden braking / Minor collision / Severe
  collision buttons that drive the real detection pipeline.
- **JWT authentication**, role-based access, rate limiting, input validation,
  and centralized error handling.

## Architecture

```
┌─────────────────────┐        HTTPS/REST        ┌──────────────────────┐
│   React + Vite SPA   │ ───────────────────────▶ │   Express.js API     │
│  (frontend/)          │ ◀─────────────────────── │   (backend/)          │
└─────────────────────┘                           └──────────┬───────────┘
                                                               │ Prisma ORM
                                                               ▼
                                                     ┌──────────────────┐
                                                     │   PostgreSQL      │
                                                     │   (prisma/)       │
                                                     └──────────────────┘

Sensor sources (interchangeable, same endpoint):
  Live Simulator (dashboard) ──┐
                                ├──▶ POST /api/sensor-data ──▶ accident.service.js
  Real ESP32 + MPU6050 + GPS ──┘         (orchestrator: buffer → detect →
                                          geo lookup → persist → notify)
```

Backend layers: `routes` → `controllers` (thin HTTP layer) → `services`
(all business logic) → `Prisma` (database access). See
[`docs/architecture.md`](docs/architecture.md) for the full breakdown.

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev server, simple build, huge ecosystem — appropriate for a student project |
| Backend | Node.js + Express | Lightweight, widely taught, easy to explain in a viva |
| Database | PostgreSQL | Proper relational modeling for accidents/vehicles/notifications with strong indexing support |
| ORM | Prisma | Type-safe queries, readable schema, built-in migrations |
| Maps | Leaflet + OpenStreetMap | Free, no API key required, sufficient for demo needs |
| Auth | JWT + bcrypt | Standard, stateless, simple to reason about |
| Notifications | nodemailer (SMTP) + console fallback + optional SMS stub | Always demoable even without real credentials |

## Database design

Entities (see [`docs/database.md`](docs/database.md) for the full ER
diagram and rationale): `User`, `Vehicle`, `SensorReading`, `Accident`,
`AccidentSensorSnapshot`, `PoliceStation`, `Hospital`, `Notification`.

Key relationships:
- `Vehicle` 1—N `SensorReading`, `Vehicle` 1—N `Accident`
- `Accident` 1—N `AccidentSensorSnapshot` N—1 `SensorReading` (join table
  preserving the before/impact/after timeline)
- `Accident` N—1 `PoliceStation` (nullable), `Accident` N—1 `Hospital` (nullable)
- `Accident` 1—N `Notification` (one per recipient type: POLICE, HOSPITAL)

Indexes are placed on `vehicleId`, all timestamp columns, `severity`,
`status`, and `[latitude, longitude]` pairs.

## Accident detection algorithm

See [`docs/accident-detection.md`](docs/accident-detection.md) for the full
write-up. Summary:

1. Compute the resultant acceleration magnitude
   `sqrt(ax² + ay² + az²)` and resultant gyroscope magnitude
   `sqrt(gx² + gy² + gz²)`.
2. Compute deceleration from the speed delta between consecutive readings.
3. Rule: `(deceleration ≥ threshold OR acceleration ≥ threshold) AND gyro ≥ threshold`,
   OR acceleration is extreme (≥ 1.5× threshold) on its own.
4. Confidence score = weighted combination of how far each signal exceeds its
   threshold (`0.45·accel + 0.30·decel + 0.25·gyro`), capped at 1.0.
5. An event is only classified as an accident if the rule fires **and**
   confidence ≥ `MIN_CONFIDENCE_TO_FLAG`.
6. Severity is derived from peak acceleration magnitude, then downgraded one
   band if confidence is only marginally above the minimum.

All thresholds are environment-configurable (see
[Environment variables](#environment-variables)).

## Emergency notification workflow

1. `accident.service.js` persists the `Accident` row (and
   `AccidentSensorSnapshot`s) as soon as it's detected — **before** attempting
   any notification.
2. `geoLookup.service.js` finds the nearest police station and hospital.
3. `notification.service.js` builds the standardized `ACCIDENT ALERT` message
   and dispatches it to both recipients via the active channel
   (`NOTIFICATION_MODE`: console / email), with optional SMS layered on top.
4. Each dispatch is tracked as its own `Notification` row with status
   `PENDING` → `SENT`/`FAILED` → `ACKNOWLEDGED`.
5. If delivery fails for any reason, the failure is logged and the
   `Notification` row is marked `FAILED` — **the accident record itself is
   never lost or rolled back.**

## API documentation

Full endpoint reference: [`docs/api.md`](docs/api.md). Base path: `/api`.

Highlights:
- `POST /api/sensor-data` — hardware-ready sensor ingestion (no JWT; rate-limited)
- `POST /api/simulation/run` — trigger a simulated scenario
- `GET /api/dashboard/stats` — dashboard summary
- `GET /api/accidents/:id` — full accident detail with sensor timeline

## Installation / deployment

### Prerequisites
- Node.js ≥ 18
- A PostgreSQL database (local, Docker, or a managed cloud instance — e.g.
  Supabase, Neon, Railway, Render Postgres)

### 1. Clone and install
```bash
git clone <your-repo-url>
cd smart-vehicle-accident-system
npm run install:all
```

### 2. Configure environment variables
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit backend/.env — at minimum set DATABASE_URL and JWT_SECRET
```

### 3. Set up the database
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run in development
```bash
npm run dev:backend    # http://localhost:5000
npm run dev:frontend   # http://localhost:5173
```

Log in with the seeded demo account: `admin@smartvehicle.local` / `Admin@123`.

### 5. Deploying
- **Backend**: deploy `backend/` to any Node host (Render, Railway, Fly.io,
  a VPS). Set all `backend/.env` variables in the platform's environment
  settings. Run `npx prisma migrate deploy` as part of the build/release step.
- **Frontend**: `npm run build --workspace=frontend` produces `frontend/dist/`,
  deployable to any static host (Vercel, Netlify, Render static site). Set
  `VITE_API_BASE_URL` to the deployed backend's URL.
- **Database**: any managed PostgreSQL provider works; just point
  `DATABASE_URL` at it.

## Environment variables

See [`.env.example`](.env.example) (root, documents everything),
[`backend/.env.example`](backend/.env.example), and
[`frontend/.env.example`](frontend/.env.example) for the full list with
defaults and comments.

## Simulation demo

Go to **Simulator** in the sidebar, pick a vehicle, and click one of the four
scenario buttons:

| Scenario | Expected result |
|---|---|
| Normal driving | No accident |
| Sudden braking | No accident (high deceleration alone isn't enough — demonstrates why we don't rely on speed/braking alone) |
| Minor collision | Accident created, MINOR/MODERATE severity |
| Severe collision | Accident created, SEVERE/CRITICAL severity, notifications dispatched to nearest police + hospital |

Every scenario runs through the **exact same** `processSensorReading()`
pipeline a real device would use — the simulator is not a separate "fake"
code path.

## Hardware integration plan

See [`docs/hardware-integration.md`](docs/hardware-integration.md) for full
wiring, firmware pseudocode, and payload format. In short: an ESP32 +
MPU6050/MPU9250 (accelerometer/gyroscope) + GPS module (e.g. NEO-6M) would
periodically `POST` to `/api/sensor-data` with the same JSON shape the
simulator uses — no backend changes required.

## Limitations

- Detection thresholds are simplified and tuned for demo clarity, not
  validated against real crash-test data.
- Geo lookup defaults to seeded mock data, not a live Places API.
- The sensor rolling buffer is in-memory per server instance (fine for a
  single-instance academic deployment; would need Redis for multi-instance
  scaling).
- No real-time push (WebSocket) updates — the dashboard polls on page load.
- Not tested against adversarial/malicious sensor input beyond basic range
  validation.

## Future enhancements

- Real hardware integration (ESP32 + MPU6050/9250 + GPS) — architecture is
  already hardware-ready.
- Live Places API integration for geo lookup.
- WebSocket-based real-time dashboard updates.
- Machine-learning-based detection model as an alternative to the rule-based
  engine.
- Mobile app for vehicle owners with SOS override/cancel.
- Multi-language SMS/email templates.

## Screenshots

_Add screenshots here after running the app locally:_
- `docs/screenshots/dashboard.png`
- `docs/screenshots/simulator.png`
- `docs/screenshots/accident-details.png`

## Viva explanation guide

Suggested walkthrough order for a viva demo:
1. Explain the problem and objectives (this README's top sections).
2. Show the database schema (`prisma/schema.prisma`) and explain entity
   relationships, especially `AccidentSensorSnapshot`.
3. Open **Simulator**, run **Normal driving** (nothing happens), then
   **Sudden braking** (still nothing — explain why), then **Severe
   collision** — show the console log of the simulated notification.
4. Open the resulting accident's **details page** — walk through the map,
   speed timeline, and severity/confidence numbers.
5. Explain the detection algorithm from `docs/accident-detection.md` on the
   whiteboard/slide.
6. Close with the hardware integration plan and limitations — this shows
   engineering maturity and awareness of scope.
