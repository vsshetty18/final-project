/**
 * frontend/src/components/common/Loader.jsx
 *
 * Minimal loading indicator, matched to the console visual language
 * (a pulsing amber dot rather than a generic spinner).
 */

import React from 'react';

export default function Loader({ label = 'Loading' }) {
  return (
    <div
      className="flex items-center gap-2 text-muted text-sm"
      style={{ padding: 'var(--space-5)' }}
      role="status"
      aria-live="polite"
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--color-accent)',
          display: 'inline-block',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}
      />
      <span>{label}...</span>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
