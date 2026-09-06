/**
 * frontend/src/components/dashboard/StatCard.jsx
 *
 * A single dashboard statistic: value + label, with an optional
 * accent variant (default amber, "critical" red, "safe" teal).
 */

import React from 'react';

export default function StatCard({ label, value, variant = 'default' }) {
  const variantClass =
    variant === 'critical' ? 'stat-critical' : variant === 'safe' ? 'stat-safe' : '';

  return (
    <div className={`stat-card ${variantClass}`}>
      <div className="stat-value mono">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
