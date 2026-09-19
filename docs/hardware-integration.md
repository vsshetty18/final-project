# Hardware Integration Plan

This document describes how to connect real vehicle hardware — an ESP32 +
MPU6050/MPU9250 (accelerometer + gyroscope) + a GPS module — to this system,
**without changing any backend code**. The backend was deliberately designed
so the simulator and real hardware are two interchangeable data sources for
the exact same pipeline.

> This describes a future extension. It is not implemented or tested against
> physical hardware as part of this academic submission.

## Bill of materials (suggested)

| Component | Example part | Purpose |
|---|---|---|
| Microcontroller | ESP32 DevKit v1 | Wi-Fi-capable MCU to read sensors and POST to the API |
| Accelerometer + gyroscope | MPU6050 (or MPU9250 for added magnetometer) | 3-axis acceleration + 3-axis angular velocity |
| GPS module | NEO-6M / NEO-M8N | Latitude/longitude |
| Power | 5V USB or vehicle 12V-to-5V regulator | — |

## Wiring overview

```
ESP32                 MPU6050
  3.3V  ───────────────  VCC
  GND   ───────────────  GND
  GPIO21 (SDA) ─────────  SDA
  GPIO22 (SCL) ─────────  SCL

ESP32                 GPS module (NEO-6M)
  5V / 3.3V ────────────  VCC
  GND   ───────────────  GND
  GPIO16 (RX2) ─────────  TX
  GPIO17 (TX2) ─────────  RX
```

## Firmware responsibilities (pseudocode)

```cpp
// Pseudocode — not compiled/tested as part of this submission.
setup():
  connect to Wi-Fi
  init MPU6050 over I2C
  init GPS over UART

loop():
  read accelX, accelY, accelZ from MPU6050 (convert to g)
  read gyroX, gyroY, gyroZ from MPU6050 (convert to deg/s)
  read speed (from GPS-derived speed, or a wheel-speed sensor if available)
  read latitude, longitude from GPS (skip if no fix)

  payload = {
    vehicleId: DEVICE_VEHICLE_ID,   // provisioned per device
    timestamp: currentISOTime(),
    speed: speed,
    accelerationX: accelX, accelerationY: accelY, accelerationZ: accelZ,
    gyroscopeX: gyroX, gyroscopeY: gyroY, gyroscopeZ: gyroZ,
    latitude: latitude, longitude: longitude,
    source: "HARDWARE"
  }

  HTTP POST https://<backend-url>/api/sensor-data
    Content-Type: application/json
    body: payload

  delay(SAMPLE_INTERVAL_MS)   // e.g. 200-500ms for meaningful crash resolution
```

## Why this requires zero backend changes

The `POST /api/sensor-data` endpoint (`backend/src/routes/sensor.routes.js`
→ `sensor.controller.js` → `accidentService.processSensorReading()`) already
accepts exactly this payload shape and doesn't care whether the caller is the
browser-based Simulator or a real device — the only difference is the
`source` field (`SIMULATION` vs `HARDWARE`), which is stored for traceability
but does not change detection logic.

## Sample interval considerations

A crash event typically unfolds over 50-150ms. A 200-500ms sampling interval
(as used by the simulator's staged readings) is a reasonable academic
approximation; a production system would sample the accelerometer/gyroscope
at a much higher rate (potentially 100Hz+) with an on-device pre-filter, and
only report a reading to the backend when it's a meaningful change or
periodically for the rolling buffer — this refinement is called out as a
future enhancement rather than implemented here.

## Provisioning a device to a vehicle

Each `Vehicle` row has an optional `deviceId` field
(`vehicle.deviceId`). The current prototype does not enforce a match between
the device that sends data and the `vehicleId` in the payload — the
`vehicleId` is trusted as sent. For a hardened version:

1. Give each ESP32 a unique `deviceId` (e.g. its MAC address or a
   provisioned string, matching `Vehicle.deviceId`).
2. Add a shared-secret header (e.g. `X-Device-Key`) to firmware requests.
3. In `sensor.routes.js`, add a lightweight middleware that resolves the
   `deviceId`/key to a `vehicleId` server-side, rather than trusting the
   client-supplied `vehicleId` directly.

This is intentionally left undone in the academic version to keep the
demoable path (simulator, no device provisioning needed) simple, while the
extension point is clearly documented here.

## GPS accuracy note

Consumer GPS modules like the NEO-6M typically have 2.5m CEP accuracy and can
take 30s+ to get a cold-start fix. The backend already handles missing GPS
gracefully (`latitude`/`longitude` are optional on `SensorReading`, and
`accident.service.js` logs a warning and skips geo lookup rather than
failing when coordinates are unavailable) — this was designed with real GPS
module limitations in mind from the start.
