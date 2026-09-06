/**
 * frontend/src/pages/Settings.jsx
 *
 * /settings — displays the current operator's profile and a
 * read-only summary of the system's configuration mode (detection
 * thresholds, notification mode, geo lookup mode), sourced from the
 * backend health/env-derived info where available. Kept intentionally
 * simple for an academic prototype.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <div className="panel mb-4">
        <div className="panel-title">Operator profile</div>
        <div className="grid grid-cols-3">
          <div>
            <div className="text-xs text-muted">Name</div>
            <div>{user?.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Email</div>
            <div className="mono">{user?.email}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Role</div>
            <div>{user?.role}</div>
          </div>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="panel-title">System mode</div>
        <p className="text-sm mb-4">
          This is an academic prototype. Accident detection thresholds, notification
          channel (console/email/SMS), and geo-lookup mode (mock/live) are configured
          via environment variables on the backend (see <span className="mono">backend/.env</span>)
          and are not editable from this UI in the current version.
        </p>
        <p className="text-sm">
          See <span className="mono">docs/architecture.md</span> and{' '}
          <span className="mono">docs/hardware-integration.md</span> for details on how to
          reconfigure detection sensitivity or connect real ESP32 hardware.
        </p>
      </div>

      <div className="panel">
        <div className="panel-title">Disclaimer</div>
        <p className="text-sm">
          This system is a final-year engineering academic prototype. It is <strong>not</strong>{' '}
          certified or suitable for real-world life-critical deployment. Accident detection is
          simulated by default; real vehicle sensor integration is a documented future
          enhancement, not a production-ready safety feature.
        </p>
      </div>
    </div>
  );
}
