/**
 * frontend/src/pages/Login.jsx
 *
 * /login — authentication page. Not wrapped by ProtectedRoute or the
 * sidebar/topbar shell (it IS the entry point before those exist).
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@smartvehicle.local');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: 'var(--space-5)',
      }}
    >
      <div className="panel" style={{ width: 380 }}>
        <div className="flex items-center gap-2 mb-4">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--color-accent)',
            }}
          />
          <h3>Smart Vehicle Console</h3>
        </div>
        <p className="text-sm mb-4">
          Accident Detection &amp; Emergency Response — sign in to continue.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-critical)', marginBottom: 'var(--space-4)' }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-faint mt-4">
          Demo credentials (after seeding): admin@smartvehicle.local / Admin@123
        </p>
      </div>
    </div>
  );
}
