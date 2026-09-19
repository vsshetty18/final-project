# API Documentation

Base URL: `http://localhost:5000/api` (development) or your deployed backend
URL + `/api`.

All responses follow this envelope:
```json
{ "success": true, "message": "...", "data": { ... }, "meta": { ... } }
```
or on error:
```json
{ "success": false, "message": "...", "errors": [ { "field": "...", "message": "..." } ] }
```

Authenticated endpoints require header: `Authorization: Bearer <token>`.

---

## Auth

### `POST /api/auth/register`
Body: `{ name, email, password, role? }` (`role`: `ADMIN` | `OPERATOR`, default `OPERATOR`)
Response: `201` with the created user (no password).

### `POST /api/auth/login`
Body: `{ email, password }`
Response: `200` with `{ user, token }`.

### `GET /api/auth/me` 🔒
Response: `200` with the current authenticated user.

---

## Vehicles 🔒

### `POST /api/vehicles` (ADMIN only)
Body: `{ registrationNumber, model, ownerName, ownerPhone, deviceId?, status? }`

### `GET /api/vehicles`
Query: `page?, limit?, status?, search?`
Response: paginated list (`meta` has `page, limit, total, totalPages`).

### `GET /api/vehicles/:id`
Response: vehicle + its 10 most recent accidents.

### `GET /api/vehicles/:id/sensor-readings`
Query: `limit?` (default 50)

### `PUT /api/vehicles/:id` (ADMIN only)
### `DELETE /api/vehicles/:id` (ADMIN only)

---

## Sensor data (hardware-ready, no JWT)

### `POST /api/sensor-data`
The single endpoint used by both the Simulator and (in future) real ESP32
hardware.

Body:
```json
{
  "vehicleId": "uuid",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "speed": 45.5,
  "accelerationX": 0.1,
  "accelerationY": 0.05,
  "accelerationZ": 0.98,
  "gyroscopeX": 2,
  "gyroscopeY": 1,
  "gyroscopeZ": 1,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "source": "SIMULATION"
}
```
`timestamp`, `latitude`, `longitude`, `source` are optional.

Response `201`:
```json
{
  "success": true,
  "message": "Sensor data processed successfully",
  "data": {
    "sensorReadingId": "uuid",
    "detection": { "isAccident": false, "confidenceScore": 0.12, "severity": null, "reasons": [] },
    "accident": null,
    "notifications": null
  }
}
```
If an accident is detected, `accident` and `notifications` are populated.

Rate limit: a more permissive limiter than general API routes (tuned for
frequent device telemetry).

---

## Accidents 🔒

### `GET /api/accidents`
Query: `page?, limit?, severity?, status?, vehicleId?, from?, to?`

### `GET /api/accidents/:id`
Returns full accident detail including `vehicle`, `nearestPoliceStation`,
`nearestHospital`, `notifications`, and `sensorSnapshots` (each with its
linked `sensorReading`), ordered by `offsetMs`.

### `PATCH /api/accidents/:id/status`
Body: `{ status }` — one of `DETECTED | NOTIFIED | ACKNOWLEDGED | RESOLVED | FALSE_ALARM`

---

## Police stations 🔒

### `GET /api/police-stations`
### `GET /api/police-stations/:id`
### `POST /api/police-stations` (ADMIN only)
Body: `{ name, address, phone?, latitude, longitude }`

## Hospitals 🔒

### `GET /api/hospitals`
### `GET /api/hospitals/:id`
### `POST /api/hospitals` (ADMIN only)
Body: `{ name, address, phone?, latitude, longitude }`

---

## Notifications 🔒

### `GET /api/notifications`
Query: `accidentId?, status?, recipientType?`

### `GET /api/notifications/:id`

### `PATCH /api/notifications/:id/acknowledge`
Marks the notification `ACKNOWLEDGED`. If both the police and hospital
notifications for the parent accident are acknowledged, the accident's
`status` is automatically updated to `ACKNOWLEDGED`.

---

## Dashboard 🔒

### `GET /api/dashboard/stats`
Returns: `totalVehicles, totalAccidents, accidentsToday, criticalAccidents,
pendingNotifications, policeNotificationsSent, hospitalNotificationsSent,
recentAccidents` (last 10, with `vehicle`, station, hospital, notifications
included).

### `GET /api/dashboard/severity-breakdown`
Returns: `{ MINOR, MODERATE, SEVERE, CRITICAL }` counts.

### `GET /api/dashboard/trend?days=7`
Returns: `[{ date, count }, ...]` accidents-per-day for the last N days.

---

## Simulation 🔒

### `POST /api/simulation/run`
Body: `{ vehicleId, scenario, latitude?, longitude? }`
`scenario`: `NORMAL | SUDDEN_BRAKING | MINOR_COLLISION | SEVERE_COLLISION`

Runs a realistic sequence of sensor readings through the exact same
`/api/sensor-data` pipeline, sequentially, then returns the final result
(same shape as the sensor-data response, plus `readingsProcessed`).

---

## Health check (no auth)

### `GET /api/health`
Returns service status, environment, and timestamp. Useful for uptime
monitors on deployment platforms.
