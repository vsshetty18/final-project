/**
 * frontend/src/pages/Accidents.jsx
 *
 * /accidents — full accident history with filters (req #9/#10).
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Loader from '../components/common/Loader.jsx';
import SeverityBadge from '../components/accidents/SeverityBadge.jsx';

export default function Accidents() {
  const navigate = useNavigate();
  const [accidents, setAccidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');

  const loadAccidents = useCallback(async (severityFilter, statusFilter) => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/accidents', {
        params: {
          severity: severityFilter || undefined,
          status: statusFilter || undefined,
          limit: 50,
        },
      });
      setAccidents(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load accidents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccidents(severity, status);
  }, [severity, status, loadAccidents]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          <option value="MINOR">Minor</option>
          <option value="MODERATE">Moderate</option>
          <option value="SEVERE">Severe</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="DETECTED">Detected</option>
          <option value="NOTIFIED">Notified</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
          <option value="FALSE_ALARM">False alarm</option>
        </select>
      </div>

      {loading ? (
        <Loader label="Loading accidents" />
      ) : error ? (
        <p style={{ color: 'var(--color-critical)' }}>{error}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date / time</th>
                <th>Vehicle</th>
                <th>Severity</th>
                <th>Impact speed</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Police station</th>
                <th>Hospital</th>
              </tr>
            </thead>
            <tbody>
              {accidents.map((a) => (
                <tr key={a.id} onClick={() => navigate(`/accidents/${a.id}`)}>
                  <td className="mono text-xs">{new Date(a.occurredAt).toLocaleString()}</td>
                  <td>{a.vehicle?.registrationNumber || '—'}</td>
                  <td><SeverityBadge severity={a.severity} /></td>
                  <td className="mono">{a.impactSpeed} km/h</td>
                  <td className="mono">{(a.confidenceScore * 100).toFixed(0)}%</td>
                  <td>{a.status}</td>
                  <td className="text-xs">{a.nearestPoliceStation?.name || 'Not found'}</td>
                  <td className="text-xs">{a.nearestHospital?.name || 'Not found'}</td>
                </tr>
              ))}
              {accidents.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-muted">No accidents match the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
