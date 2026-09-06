/**
 * frontend/src/pages/Simulator.jsx
 *
 * /simulator — live vehicle simulation page (req #11). This is the
 * PRIMARY DEMONSTRATION MECHANISM for the viva when no physical
 * ESP32/MPU6050/GPS hardware is connected. The person selects a
 * vehicle and a scenario button (Normal driving / Sudden braking /
 * Minor collision / Severe collision); each POSTs to
 * /api/simulation/run, which runs the SAME accident-detection
 * pipeline a real device would trigger via /api/sensor-data.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Loader from '../components/common/Loader.jsx';
import SeverityBadge from '../components/accidents/SeverityBadge.jsx';

const SCENARIOS = [
  {
    key: 'NORMAL',
    label: 'Normal driving',
    description: 'Steady city driving — no anomalies expected.',
  },
  {
    key: 'SUDDEN_BRAKING',
    label: 'Sudden braking',
    description: 'Hard brake with no abnormal rotation — should NOT trigger an accident.',
  },
  {
    key: 'MINOR_COLLISION',
    label: 'Minor collision',
    description: 'Moderate impact + rotation — expect a MINOR/MODERATE accident record.',
  },
  {
    key: 'SEVERE_COLLISION',
    label: 'Severe collision',
    description: 'Extreme impact + rotation + hard braking — expect a SEVERE/CRITICAL accident record with notifications.',
  },
];

export default function Simulator() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [running, setRunning] = useState(null); // scenario key currently running
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadVehicles() {
      const res = await axiosClient.get('/vehicles', { params: { limit: 100 } });
      setVehicles(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedVehicleId(res.data.data[0].id);
      }
    }
    loadVehicles();
  }, []);

  async function runScenario(scenario) {
    if (!selectedVehicleId) {
      setError('Please select a vehicle first.');
      return;
    }
    setRunning(scenario);
    setError(null);
    setResult(null);
    try {
      const res = await axiosClient.post('/simulation/run', {
        vehicleId: selectedVehicleId,
        scenario,
      });
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed to run');
    } finally {
      setRunning(null);
    }
  }

  return (
    <div>
      <div className="panel mb-4">
        <div className="panel-title">Select vehicle</div>
        <select
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          style={{ maxWidth: 360 }}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registrationNumber} — {v.model}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 mb-4">
        {SCENARIOS.map((s) => (
          <div key={s.key} className="panel">
            <h4>{s.label}</h4>
            <p className="text-sm mt-2">{s.description}</p>
            <button
              className={`btn mt-4 ${s.key === 'SEVERE_COLLISION' ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => runScenario(s.key)}
              disabled={running !== null}
              style={{ width: '100%' }}
            >
              {running === s.key ? 'Running...' : `Run: ${s.label}`}
            </button>
          </div>
        ))}
      </div>

      {running && <Loader label={`Running ${running.replace('_', ' ').toLowerCase()} scenario`} />}

      {error && <p style={{ color: 'var(--color-critical)' }} className="mb-4">{error}</p>}

      {result && (
        <div className="panel">
          <div className="panel-title">Simulation result</div>
          <div className="grid grid-cols-3 mb-4">
            <div>
              <div className="text-xs text-muted">Readings processed</div>
              <div className="mono">{result.readingsProcessed}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Accident detected</div>
              <div className="mono">{result.detection.isAccident ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Confidence</div>
              <div className="mono">{(result.detection.confidenceScore * 100).toFixed(0)}%</div>
            </div>
          </div>

          {result.detection.reasons && result.detection.reasons.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-muted mb-2">Detection reasons</div>
              <ul className="text-sm">
                {result.detection.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {result.accident ? (
            <div className="flex items-center gap-3">
              <SeverityBadge severity={result.accident.severity} />
              <button className="btn btn-primary" onClick={() => navigate(`/accidents/${result.accident.id}`)}>
                View full accident record
              </button>
            </div>
          ) : (
            <p>No accident record was created for this scenario.</p>
          )}
        </div>
      )}
    </div>
  );
}
