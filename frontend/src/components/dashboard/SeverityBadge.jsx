/**
 * frontend/src/components/accidents/SeverityBadge.jsx
 *
 * Color-coded severity badge: MINOR (teal) / MODERATE (amber) /
 * SEVERE (orange) / CRITICAL (red). Used in the accidents table,
 * accident details page, and dashboard.
 */

import React from 'react';

const SEVERITY_CLASS = {
  MINOR: 'badge-minor',
  MODERATE: 'badge-moderate',
  SEVERE: 'badge-severe',
  CRITICAL: 'badge-critical',
};

const SEVERITY_LABEL = {
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  SEVERE: 'Severe',
  CRITICAL: 'Critical',
};

export default function SeverityBadge({ severity }) {
  if (!severity) return <span className="text-faint text-xs">—</span>;

  const className = SEVERITY_CLASS[severity] || 'badge-minor';
  const label = SEVERITY_LABEL[severity] || severity;

  return (
    <span className={`badge ${className}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}
