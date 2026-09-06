/**
 * frontend/src/pages/AccidentDetails.jsx
 *
 * /accidents/:id — full accident details page (req #10): vehicle
 * info, timestamp, map, exact coordinates, speed before/impact/
 * after, acceleration/gyro values, severity, confidence, police
 * station + hospital with distances, notification timestamps and
 * status, and the sensor timeline chart.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Loader from '../components/common/Loader.jsx';
import SeverityBadge from '../components/accidents/SeverityBadge.jsx';
import AccidentMap from '../components/accidents/AccidentMap.jsx';
import SensorTimeline from '../components/accidents/SensorTimeline.jsx';

const NOTIF_STATUS_CLASS = {
  SENT: 'badge-sent',
  PENDING: 'badge-pending',
  FAILED: 'badge-failed',
  ACKNOWLEDGED: 'badge-acknowledged',
};

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mono">{value}</div>
    </div>
  );
}

export default function AccidentDetails() {
  const { id } = useParams();
  const [accident, setAccident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ackLoadingId, setAckLoadingId] = useState(null);

  async function loadAccident() {
    try {
      const res = await axiosClient.get(`/accidents/${id}`);
      setAccident(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load accident details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccident();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAcknowledge(notificationId) {
    setAckLoadingId(notificationId);
    try {
      await axiosClient.patch(`/notifications/${notificationId}/acknowledge`);
      await loadAccident();
    } finally {
      setAckLoadingId(null);
    }
  }

  if (loading) return <Loader label="Loading accident" />;
  if (error) return <p style={{ color: 'var(--color-critical)' }}>{error}</p>;
  if (!accident) return null;

  const policeNotification = accident.notifications.find((n) => n.recipientType === 'POLICE');
  const hospitalNotification = accident.notifications.find((n) => n.recipientType === 'HOSPITAL');

  return (
    <div>
      <div className="panel mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3>Accident {accident.id.slice(0, 8)}</h3>
            <p className="text-sm mt-2">{accident.vehicle.registrationNumber} — {accident.vehicle.model}</p>
          </div>
          <SeverityBadge severity={accident.severity} />
        </div>

        <div className="grid grid-cols-4">
          <InfoRow label="Date / time" value={new Date(accident.occurredAt).toLocaleString()} />
          <InfoRow label="Latitude" value={accident.latitude.toFixed(6)} />
          <InfoRow label="Longitude" value={accident.longitude.toFixed(6)} />
          <InfoRow label="Confidence" value={`${(accident.confidenceScore * 100).toFixed(0)}%`} />

          <InfoRow label="Speed before impact" value={`${accident.speedBeforeImpact} km/h`} />
          <InfoRow label="Impact speed" value={`${accident.impactSpeed} km/h`} />
          <InfoRow label="Speed after impact" value={accident.speedAfterImpact !== null ? `${accident.speedAfterImpact} km/h` : 'N/A'} />
          <InfoRow label="Detection source" value={accident.source} />

          <InfoRow label="Acceleration X/Y/Z" value={`${accident.peakAccelerationX.toFixed(2)} / ${accident.peakAccelerationY.toFixed(2)} / ${accident.peakAccelerationZ.toFixed(2)} g`} />
          <InfoRow label="Gyroscope X/Y/Z" value={`${accident.peakGyroX.toFixed(1)} / ${accident.peakGyroY.toFixed(1)} / ${accident.peakGyroZ.toFixed(1)} °/s`} />
          <InfoRow label="Accident status" value={accident.status} />
          <InfoRow label="Vehicle owner" value={accident.vehicle.ownerName} />
        </div>
      </div>

      <div className="grid grid-cols-2 mb-4">
        <AccidentMap
          accident={accident}
          policeStation={accident.nearestPoliceStation}
          hospital={accident.nearestHospital}
        />
        <SensorTimeline sensorSnapshots={accident.sensorSnapshots} />
      </div>

      <div className="grid grid-cols-2">
        <div className="panel">
          <div className="panel-title">Nearest police station</div>
          {accident.nearestPoliceStation ? (
            <>
              <h4>{accident.nearestPoliceStation.name}</h4>
              <p className="text-sm mt-2">{accident.nearestPoliceStation.address}</p>
              <p className="text-sm mono mt-2">{accident.policeDistanceKm} km away</p>
            </>
          ) : (
            <p>No police station found within the search radius.</p>
          )}

          {policeNotification && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${NOTIF_STATUS_CLASS[policeNotification.status]}`}>
                  {policeNotification.status}
                </span>
                {policeNotification.sentAt && (
                  <span className="text-xs text-muted">
                    Sent {new Date(policeNotification.sentAt).toLocaleString()}
                  </span>
                )}
              </div>
              {policeNotification.status === 'SENT' && (
                <button
                  className="btn btn-sm"
                  onClick={() => handleAcknowledge(policeNotification.id)}
                  disabled={ackLoadingId === policeNotification.id}
                >
                  {ackLoadingId === policeNotification.id ? 'Acknowledging...' : 'Mark acknowledged'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-title">Nearest hospital</div>
          {accident.nearestHospital ? (
            <>
              <h4>{accident.nearestHospital.name}</h4>
              <p className="text-sm mt-2">{accident.nearestHospital.address}</p>
              <p className="text-sm mono mt-2">{accident.hospitalDistanceKm} km away</p>
            </>
          ) : (
            <p>No hospital found within the search radius.</p>
          )}

          {hospitalNotification && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${NOTIF_STATUS_CLASS[hospitalNotification.status]}`}>
                  {hospitalNotification.status}
                </span>
                {hospitalNotification.sentAt && (
                  <span className="text-xs text-muted">
                    Sent {new Date(hospitalNotification.sentAt).toLocaleString()}
                  </span>
                )}
              </div>
              {hospitalNotification.status === 'SENT' && (
                <button
                  className="btn btn-sm"
                  onClick={() => handleAcknowledge(hospitalNotification.id)}
                  disabled={ackLoadingId === hospitalNotification.id}
                >
                  {ackLoadingId === hospitalNotification.id ? 'Acknowledging...' : 'Mark acknowledged'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
