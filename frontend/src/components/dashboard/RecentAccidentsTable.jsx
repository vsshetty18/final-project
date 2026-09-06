/**
 * frontend/src/components/dashboard/RecentAccidentsTable.jsx
 *
 * Table of recent accidents (req #9 dashboard, columns per req #9):
 * Accident ID, Vehicle, Date/time, Location, Speed, Severity,
 * Confidence, Police status, Hospital status.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import SeverityBadge from '../accidents/SeverityBadge.jsx';

function notificationStatusFor(notifications, recipientType) {
  const notif = (notifications || []).find((n) => n.recipientType === recipientType);
  return notif ? notif.status : 'PENDING';
}

function StatusBadge({ status }) {
  const classMap = {
    SENT: 'badge-sent',
    PENDING: 'badge-pending',
    FAILED: 'badge-failed',
    ACKNOWLEDGED: 'badge-acknowledged',
  };
  return <span className={`badge ${classMap[status] || 'badge-pending'}`}>{status}</span>;
}

export default function RecentAccidentsTable({ accidents = [] }) {
  const navigate = useNavigate();

  if (accidents.length === 0) {
    return (
      <div className="panel">
        <p>No accidents recorded yet. Run a scenario from the Simulator page to see one here.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Accident ID</th>
            <th>Vehicle</th>
            <th>Date / time</th>
            <th>Location</th>
            <th>Speed</th>
            <th>Severity</th>
            <th>Confidence</th>
            <th>Police</th>
            <th>Hospital</th>
          </tr>
        </thead>
        <tbody>
          {accidents.map((a) => (
            <tr key={a.id} onClick={() => navigate(`/accidents/${a.id}`)}>
              <td className="mono text-xs">{a.id.slice(0, 8)}</td>
              <td>{a.vehicle?.registrationNumber || '—'}</td>
              <td className="mono text-xs">{new Date(a.occurredAt).toLocaleString()}</td>
              <td className="mono text-xs">
                {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
              </td>
              <td className="mono">{a.impactSpeed} km/h</td>
              <td>
                <SeverityBadge severity={a.severity} />
              </td>
              <td className="mono">{(a.confidenceScore * 100).toFixed(0)}%</td>
              <td>
                <StatusBadge status={notificationStatusFor(a.notifications, 'POLICE')} />
              </td>
              <td>
                <StatusBadge status={notificationStatusFor(a.notifications, 'HOSPITAL')} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
