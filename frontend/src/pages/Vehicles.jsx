/**
 * frontend/src/pages/Vehicles.jsx
 *
 * /vehicles — vehicle management page (req #1): list all registered
 * vehicles with search/filter, and a form to register a new one.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Loader from '../components/common/Loader.jsx';

const STATUS_CLASS = {
  ACTIVE: 'badge-sent',
  INACTIVE: 'badge-pending',
  MAINTENANCE: 'badge-moderate',
};

const emptyForm = {
  registrationNumber: '',
  model: '',
  ownerName: '',
  ownerPhone: '',
  deviceId: '',
  status: 'ACTIVE',
};

export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadVehicles = useCallback(async (searchTerm) => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/vehicles', { params: { search: searchTerm || undefined } });
      setVehicles(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles('');
  }, [loadVehicles]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadVehicles(search);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await axiosClient.post('/vehicles', {
        ...form,
        deviceId: form.deviceId || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      loadVehicles(search);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register vehicle');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by registration, model, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              width: 320,
            }}
          />
          <button type="submit" className="btn btn-sm">Search</button>
        </form>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Register vehicle'}
        </button>
      </div>

      {showForm && (
        <div className="panel mb-4">
          <h4 className="mb-4">Register a new vehicle</h4>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2">
              <div className="field">
                <label>Registration number</label>
                <input
                  required
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Vehicle model</label>
                <input
                  required
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Owner name</label>
                <input
                  required
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Owner phone</label>
                <input
                  required
                  value={form.ownerPhone}
                  onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Device ID (optional, for hardware)</label>
                <input
                  value={form.deviceId}
                  onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
                  placeholder="e.g. ESP32-DEV-004"
                />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>

            {formError && <p style={{ color: 'var(--color-critical)' }} className="text-sm mb-4">{formError}</p>}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register vehicle'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <Loader label="Loading vehicles" />
      ) : error ? (
        <p style={{ color: 'var(--color-critical)' }}>{error}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Registration</th>
                <th>Model</th>
                <th>Owner</th>
                <th>Phone</th>
                <th>Device ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} onClick={() => navigate(`/vehicles/${v.id}`)}>
                  <td className="mono">{v.registrationNumber}</td>
                  <td>{v.model}</td>
                  <td>{v.ownerName}</td>
                  <td className="mono text-xs">{v.ownerPhone}</td>
                  <td className="mono text-xs">{v.deviceId || '—'}</td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[v.status]}`}>{v.status}</span>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted">No vehicles found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
