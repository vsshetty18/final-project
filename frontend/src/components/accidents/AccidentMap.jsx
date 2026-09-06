/**
 * frontend/src/components/accidents/AccidentMap.jsx
 *
 * Leaflet/OpenStreetMap map (req #20) showing:
 *   - the accident location (red marker)
 *   - the nearest police station (blue marker)
 *   - the nearest hospital (green marker)
 *   - dashed lines from the accident to each, labelled with distance
 */

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Leaflet's default marker icons reference image files that don't
// resolve correctly under Vite's bundling — rebuild icon URLs from
// the CDN so markers render without a build-time asset step.
const buildIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const accidentIcon = buildIcon('red');
const policeIcon = buildIcon('blue');
const hospitalIcon = buildIcon('green');

export default function AccidentMap({ accident, policeStation, hospital }) {
  if (!accident || !accident.latitude || !accident.longitude) {
    return (
      <div className="panel">
        <p>No valid GPS coordinates were recorded for this accident.</p>
      </div>
    );
  }

  const center = [accident.latitude, accident.longitude];

  return (
    <div style={{ height: 400, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={center} icon={accidentIcon}>
          <Popup>
            <strong>Accident location</strong>
            <br />
            {accident.latitude.toFixed(5)}, {accident.longitude.toFixed(5)}
            <br />
            Severity: {accident.severity}
          </Popup>
        </Marker>

        {policeStation && (
          <>
            <Marker position={[policeStation.latitude, policeStation.longitude]} icon={policeIcon}>
              <Popup>
                <strong>{policeStation.name}</strong>
                <br />
                {policeStation.address}
                <br />
                {policeStation.distanceKm ?? accident.policeDistanceKm} km away
              </Popup>
            </Marker>
            <Polyline
              positions={[center, [policeStation.latitude, policeStation.longitude]]}
              pathOptions={{ color: '#5b9bd9', dashArray: '6 6', weight: 2 }}
            />
          </>
        )}

        {hospital && (
          <>
            <Marker position={[hospital.latitude, hospital.longitude]} icon={hospitalIcon}>
              <Popup>
                <strong>{hospital.name}</strong>
                <br />
                {hospital.address}
                <br />
                {hospital.distanceKm ?? accident.hospitalDistanceKm} km away
              </Popup>
            </Marker>
            <Polyline
              positions={[center, [hospital.latitude, hospital.longitude]]}
              pathOptions={{ color: '#3fa796', dashArray: '6 6', weight: 2 }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
