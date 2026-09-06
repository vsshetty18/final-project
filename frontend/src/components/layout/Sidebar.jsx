/**
 * frontend/src/components/layout/Sidebar.jsx
 *
 * Left sidebar navigation. Fixed width, fixed position — matches the
 * "console" layout concept (persistent instrument panel down the
 * left edge, content area to the right).
 */

import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '◱' },
  { to: '/vehicles', label: 'Vehicles', icon: '🚗' },
  { to: '/accidents', label: 'Accidents', icon: '⚠' },
  { to: '/simulator', label: 'Simulator', icon: '▶' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 'var(--sidebar-width)',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-5) 0',
        zIndex: 10,
      }}
    >
      <div style={{ padding: '0 var(--space-5)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              display: 'inline-block',
            }}
          />
          <h4 style={{ fontSize: 'var(--text-base)' }}>Smart Vehicle</h4>
        </div>
        <p className="text-xs mt-2">Accident Detection Console</p>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 var(--space-3)' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
              background: isActive ? 'var(--color-surface-raised)' : 'transparent',
              borderLeft: isActive
                ? '3px solid var(--color-accent)'
                : '3px solid transparent',
            })}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: '0 var(--space-5)' }}>
        <p className="text-xs text-faint">
          Academic prototype — not a certified life-critical emergency system.
        </p>
      </div>
    </aside>
  );
}
