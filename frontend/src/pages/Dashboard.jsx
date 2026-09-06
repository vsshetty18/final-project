/**
 * frontend/src/pages/Dashboard.jsx
 *
 * /dashboard — main overview page (req #9): total vehicles, total
 * accidents, accidents today, critical accidents, pending
 * notifications, police/hospital notification counts, a severity
 * breakdown chart, and the recent accidents table.
 */

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axiosClient from '../api/axiosClient';
import Loader from '../components/common/Loader.jsx';
import StatCard from '../components/dashboard/StatCard.jsx';
import RecentAccidentsTable from '../components/dashboard/RecentAccidentsTable.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [severityBreakdown, setSeverityBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, severityRes] = await Promise.all([
          axiosClient.get('/dashboard/stats'),
          axiosClient.get('/dashboard/severity-breakdown'),
        ]);
        setStats(statsRes.data.data);
        setSeverityBreakdown(severityRes.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <Loader label="Loading dashboard" />;
  if (error) return <p style={{ color: 'var(--color-critical)' }}>{error}</p>;

  const chartData = Object.entries(severityBreakdown).map(([severity, count]) => ({
    severity,
    count,
  }));

  return (
    <div>
      <div className="grid grid-cols-4 mb-4">
        <StatCard label="Total vehicles" value={stats.totalVehicles} />
        <StatCard label="Total accidents" value={stats.totalAccidents} />
        <StatCard label="Accidents today" value={stats.accidentsToday} />
        <StatCard label="Critical accidents" value={stats.criticalAccidents} variant="critical" />
      </div>

      <div className="grid grid-cols-3 mb-4">
        <StatCard label="Pending notifications" value={stats.pendingNotifications} />
        <StatCard label="Police notifications sent" value={stats.policeNotificationsSent} variant="safe" />
        <StatCard label="Hospital notifications sent" value={stats.hospitalNotificationsSent} variant="safe" />
      </div>

      <div className="panel mb-4">
        <div className="panel-title">Accidents by severity</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="severity" stroke="var(--color-text-muted)" tick={{ fontSize: 12 }} />
            <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                color: 'var(--color-text)',
              }}
            />
            <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h4 className="mb-4">Recent accidents</h4>
      <RecentAccidentsTable accidents={stats.recentAccidents} />
    </div>
  );
}
