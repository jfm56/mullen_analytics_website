'use client';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TREND_COLOR = { rising: '#DC2626', falling: '#2563EB', stable: '#0EA5E9', 'n/a': '#0EA5E9' };

function radiusFor(count, max) {
  const minR = 7, maxR = 30;
  if (!max) return minR;
  return minR + (maxR - minR) * Math.sqrt(count / max);
}

export default function TownshipMap({ center, points, color, heatPoints }) {
  const max = points.reduce((m, p) => Math.max(m, p.call_count), 0);
  const hp = Array.isArray(heatPoints) ? heatPoints : [];
  const hmax = hp.reduce((m, p) => Math.max(m, p.weight || 1), 0) || 1;
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: 380, width: '100%', borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Referring-coordinate heat layer — actual call locations (under the volume circles) */}
      {hp.map((p, i) => (
        <CircleMarker
          key={`h${i}`}
          center={[p.lat, p.lng]}
          radius={3 + 7 * Math.sqrt((p.weight || 1) / hmax)}
          pathOptions={{ color: '#F97316', fillColor: '#F97316', fillOpacity: 0.30, weight: 0, stroke: false }}
        >
          <Tooltip>{`${p.weight || 1} call${(p.weight || 1) === 1 ? '' : 's'} here`}</Tooltip>
        </CircleMarker>
      ))}
      {points.map((p) => {
        const markerColor = color || TREND_COLOR[p.trend] || '#0EA5E9';
        return (
          <CircleMarker
            key={p.location}
            center={[p.lat, p.lng]}
            radius={radiusFor(p.call_count, max)}
            pathOptions={{ color: markerColor, fillColor: markerColor, fillOpacity: 0.45, weight: 1.5 }}
          >
            <Tooltip>{`${p.location}: ${p.call_count}`}</Tooltip>
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <strong>{p.location}</strong><br />
                {p.call_count.toLocaleString()} calls ({p.percent}%)<br />
                Trend: {p.trend}
                {p.projected_30d != null ? ` · ~${p.projected_30d}/30d` : ''}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
