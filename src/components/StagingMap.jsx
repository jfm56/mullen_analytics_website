'use client';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Demand-context dots (light) + recommended staging posts (bold, numbered).
export default function StagingMap({ center, recommended = [], others = [] }) {
  const recSet = new Set(recommended.map((r) => r.area));
  const contextPts = others.filter((o) => o.lat != null && o.lng != null && !recSet.has(o.area));
  const maxShare = contextPts.reduce((m, o) => Math.max(m, o.share || 0), 0) || 1;

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={11} scrollWheelZoom={false}
      style={{ height: 400, width: '100%', borderRadius: 8 }}>
      <TileLayer attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {contextPts.map((o) => (
        <CircleMarker key={`ctx-${o.area}`} center={[o.lat, o.lng]}
          radius={5 + 9 * Math.sqrt((o.share || 0) / maxShare)}
          pathOptions={{ color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 0.25, weight: 1 }}>
          <Tooltip>{`${o.area}: ${o.share}%`}</Tooltip>
        </CircleMarker>
      ))}

      {recommended.filter((r) => r.lat != null && r.lng != null).map((r) => (
        <CircleMarker key={`rec-${r.area}`} center={[r.lat, r.lng]} radius={16}
          pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.85, weight: 2 }}>
          <Tooltip permanent direction="center" className="staging-rank-tip">{String(r.rank)}</Tooltip>
          <Popup>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              <strong>Post #{r.rank}: {r.area}</strong><br />
              {r.share}% of expected calls
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
