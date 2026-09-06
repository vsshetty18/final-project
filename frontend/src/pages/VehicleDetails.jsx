/**
 * frontend/src/pages/VehicleDetails.jsx
 *
 * /vehicles/:id — vehicle details page: vehicle info, its accident
 * history, and its most recent sensor readings.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Loader from '../components/common/Loader.jsx';
import SeverityBadge from '../components/accidents/SeverityBadge.jsx';

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [vehicleRes, readingsRes] = await Promise.all([
          axiosClient.get(`/vehicles/${id}`),
          axiosClient.get(`/vehicles/${id}/sensor-readings`, { params: { limit: 20 } }),
        ]);
        setVehicle(vehicleRes.data.data);
        setReadings(readingsRes.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <Loader label="Loading vehicle" />;
  if (error) return <p style={{ color: 'var(--color-critical)' }}>{error}</p>;
  if (!vehicle) return null;

  return (
    <div>
      <div className="panel mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3>{vehicle.registrationNumber}</h3>
          <span className="badge badge-sent">{vehicle.status}</span>
        </div>
        <div className="grid grid-cols-4">
          <div>
            <div className="text-xs text-muted">Model</div>
            <div>{vehicle.model}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Owner</div>
            <div>{vehicle.ownerName}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Owner phone</div>
            <div className="mono">{vehicle.ownerPhone}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Device ID</div>
            <div className="mono">{vehicle.deviceId || 'Not assigned'}</div>
          </div>
        </div>
      </div>

      <h4 className="mb-4">Accident history</h4>
      <div className="table-wrap mb-4">
        <table>
          <thead>
            <tr>
              <th>Date / time</th>
              <th>Severity</th>
              <th>Impact speed</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicle.accidents.map((a) => (
              <tr key={a.id} onClick={() => navigate(`/accidents/${a.id}`)}>
                <td className="mono text-xs">{new Date(a.occurredAt).toLocaleString()}</td>
                <td><SeverityBadge severity={a.severity} /></td>
                <td className="mono">{a.impactSpeed} km/h</td>
                <td className="mono">{(a.confidenceScore * 100).toFixed(0)}%</td>
                <td>{a.status}</td>
              </tr>
            ))}
            {vehicle.accidents.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">No accidents recorded for this vehicle.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h4 className="mb-4">Recent sensor readings</h4>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Speed</th>
              <th>Accel (X/Y/Z)</th>
              <th>Gyro (X/Y/Z)</th>
              <th>Location</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td className="mono text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                <td className="mono">{r.speed.toFixed(1)} km/h</td>
                <td className="mono text-xs">
                  {r.accelerationX.toFixed(2)} / {r.accelerationY.toFixed(2)} / {r.accelerationZ.toFixed(2)}
                </td>
                <td className="mono text-xs">
                  {r.gyroscopeX.toFixed(1)} / {r.gyroscopeY.toFixed(1)} / {r.gyroscopeZ.toFixed(1)}
                </td>
                <td className="mono text-xs">
                  {r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : 'N/A'}
                </td>
                <td className="text-xs">{r.source}</td>
              </tr>
            ))}
            {readings.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">No sensor readings recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
