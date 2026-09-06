/**
 * frontend/src/App.jsx
 *
 * Root application component: defines all routes (req #19 pages)
 * and wraps protected pages in the sidebar + topbar shell.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar.jsx';
import Topbar from './components/layout/Topbar.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Vehicles from './pages/Vehicles.jsx';
import VehicleDetails from './pages/VehicleDetails.jsx';
import Accidents from './pages/Accidents.jsx';
import AccidentDetails from './pages/AccidentDetails.jsx';
import Simulator from './pages/Simulator.jsx';
import Settings from './pages/Settings.jsx';

function AppShell({ title, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title={title} />
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

function Protected({ title, children }) {
  return (
    <ProtectedRoute>
      <AppShell title={title}>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <Protected title="Dashboard">
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/vehicles"
        element={
          <Protected title="Vehicles">
            <Vehicles />
          </Protected>
        }
      />
      <Route
        path="/vehicles/:id"
        element={
          <Protected title="Vehicle details">
            <VehicleDetails />
          </Protected>
        }
      />
      <Route
        path="/accidents"
        element={
          <Protected title="Accidents">
            <Accidents />
          </Protected>
        }
      />
      <Route
        path="/accidents/:id"
        element={
          <Protected title="Accident details">
            <AccidentDetails />
          </Protected>
        }
      />
      <Route
        path="/simulator"
        element={
          <Protected title="Live vehicle simulator">
            <Simulator />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected title="Settings">
            <Settings />
          </Protected>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
