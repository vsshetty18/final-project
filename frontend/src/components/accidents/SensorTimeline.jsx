/**
 * frontend/src/components/accidents/SensorTimeline.jsx
 *
 * Small speed/sensor timeline chart around the accident moment
 * (req #10). Plots speed (km/h) across the BEFORE -> IMPACT -> AFTER
 * sensor snapshots recorded for the accident.
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export default function SensorTimeline({ sensorSnapshots = [] }) {
  if (!sensorSnapshots || sensorSnapshots.length === 0) {
    return (
      <div className="panel">
        <p>No sensor snapshot timeline is available for this accident.</p>
      </div>
    );
  }

  const data = sensorSnapshots
    .slice()
    .sort((a, b) => a.offsetMs - b.offsetMs)
    .map((snap) => ({
      offsetSec: (snap.offsetMs / 1000).toFixed(1),
      speed: snap.sensorReading.speed,
      position: snap.relativePosition,
    }));

  return (
    <div className="panel">
      <div className="panel-title">Speed timeline around impact</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="offsetSec"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 12 }}
            label={{ value: 'Seconds from impact', position: 'insideBottom', offset: -2, fill: 'var(--color-text-muted)', fontSize: 12 }}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 12 }}
            label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text)',
            }}
          />
          <ReferenceLine x="0.0" stroke="var(--color-critical)" strokeDasharray="4 4" label={{ value: 'Impact', fill: 'var(--color-critical)', fontSize: 12, position: 'top' }} />
          <Line type="monotone" dataKey="speed" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
