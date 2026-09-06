/**
 * frontend/src/components/layout/Topbar.jsx
 *
 * Top bar: page title on the left, current user + logout on the
 * right. Rendered above the routed page content.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-5)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      <h3>{title}</h3>

      <div className="flex items-center gap-3">
        {user && (
          <div className="text-right">
            <div className="text-sm">{user.name}</div>
            <div className="text-xs text-muted">{user.role}</div>
          </div>
        )}
        <button className="btn btn-sm" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}
