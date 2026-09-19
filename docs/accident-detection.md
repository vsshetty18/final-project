# Accident Detection Algorithm

This document explains the rule-based accident detection algorithm
implemented in `backend/src/services/accidentDetection.service.js`, in enough
detail to present and defend during a viva.

## Why not just use speed?

A vehicle can be involved in an accident while stationary (rear-ended at a
red light), and a vehicle can decelerate hard without any accident at all
(emergency braking for a pedestrian). Speed and deceleration alone are
therefore both necessary but insufficient signals. The algorithm instead
combines **three independent physical signals**.

## The three signals

### 1. Deceleration (g)
Computed from the change in speed between two consecutive sensor readings,
converted to units of g (9.81 m/s²):

```
decelerationG = ((previousSpeed - currentSpeed) / 3.6) / timeDeltaSeconds / 9.81
```

A large positive value means the vehicle slowed down very quickly.

### 2. Resultant acceleration spike (g)
The magnitude of the full 3-axis accelerometer vector:

```
|a| = sqrt(ax² + ay² + az²)
```

Normal driving forces (cornering, braking) rarely produce a resultant
magnitude much above 1-2g on a single reading. A genuine impact — the vehicle
striking or being struck by something — produces a sharp spike well above
that.

### 3. Abnormal gyroscopic movement (deg/s)
The magnitude of the full 3-axis gyroscope vector:

```
|g| = sqrt(gx² + gy² + gz²)
```

A collision typically causes the vehicle body to rotate, spin, or roll in a
way ordinary driving does not. This signal is what distinguishes "hard
braking" from "actual crash" — braking alone produces almost no rotation.

## Decision rule

```
ruleTriggered =
     ( decelerationG ≥ DECELERATION_THRESHOLD_G
       OR resultantAcceleration ≥ ACCELERATION_SPIKE_THRESHOLD_G )
     AND resultantGyro ≥ GYRO_ABNORMAL_THRESHOLD_DPS
   OR
     resultantAcceleration ≥ ACCELERATION_SPIKE_THRESHOLD_G × 1.5   (extreme-spike override)
```

The extreme-spike override exists because some impacts (e.g. a straight-on
rear-end collision at a stoplight) may not produce significant rotation, yet
are unambiguously a crash based on acceleration alone.

An event is only classified as an accident if `ruleTriggered` is true **AND**
the computed confidence score meets the minimum bar (see below) — this is a
belt-and-braces design: the boolean rule catches the physical pattern, the
confidence score guards against borderline/noisy single-signal triggers.

## Confidence score (0.0 – 1.0)

Each signal is normalized against its threshold (1.0 = exactly at threshold,
capped at 1.0 beyond):

```
accelScore = min(1, resultantAcceleration / ACCELERATION_SPIKE_THRESHOLD_G)
decelScore = min(1, decelerationG / DECELERATION_THRESHOLD_G)
gyroScore  = min(1, resultantGyro / GYRO_ABNORMAL_THRESHOLD_DPS)

confidenceScore = 0.45 × accelScore + 0.30 × decelScore + 0.25 × gyroScore
```

Acceleration is weighted highest because it is the most direct physical
evidence of impact; deceleration next; gyroscope last, since rotational noise
is more common from potholes/uneven roads than the other two signals.

## Severity classification

Severity is derived from the resultant peak acceleration magnitude in bands:

| Resultant acceleration | Base severity |
|---|---|
| ≤ 4.0g | MINOR |
| ≤ 7.0g | MODERATE |
| ≤ 10.0g | SEVERE |
| > 10.0g | CRITICAL |

If the confidence score is only marginally above `MIN_CONFIDENCE_TO_FLAG`
(within 0.1), the severity is downgraded one band, floored at MINOR — this
avoids labeling a borderline detection as CRITICAL just because one noisy
reading happened to have a high acceleration value.

## Worked example — Severe collision

Given a reading with:
- `accelerationX = -8`, `accelerationY = 5`, `accelerationZ = 3` → resultant ≈ 9.85g
- `gyroscopeX = 300`, `gyroscopeY = -280`, `gyroscopeZ = 260` → resultant ≈ 483 deg/s
- default thresholds: `ACCELERATION_SPIKE_THRESHOLD_G = 6.0`, `GYRO_ABNORMAL_THRESHOLD_DPS = 250`

```
accelScore = min(1, 9.85 / 6.0) = 1.0
gyroScore  = min(1, 483 / 250)  = 1.0
```

Both exceed threshold, rule triggers, confidence is high (≈0.75+ even with a
modest deceleration score) → classified as an accident, SEVERE or CRITICAL
depending on the exact acceleration value.

## Worked example — Sudden braking (correctly NOT an accident)

Given a reading with:
- `accelerationX = -3.8` (only X-axis, others near zero) → resultant ≈ 3.8g,
  below the 6.0g threshold
- `gyroscopeX/Y/Z` all under 10 deg/s → well below the 250 deg/s threshold

The rule requires `(decel OR accel) AND gyro`. Gyro is not exceeded, and
acceleration is not "extreme" (1.5× threshold = 9.0g), so the extreme-spike
override does not fire either. **Result: correctly not classified as an
accident** — this is deliberately demonstrated by the Simulator's "Sudden
braking" scenario.

## Configurability

All thresholds are environment variables (see root `.env.example`), so they
can be tuned without touching code — useful both for a viva demo (showing
you can adjust sensitivity live) and for future calibration against real
hardware.
