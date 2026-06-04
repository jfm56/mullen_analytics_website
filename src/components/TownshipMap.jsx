'use client';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TREND_COLOR = { rising: '#DC2626', falling: '#2563EB', stable: '#0EA5E9', 'n/a': '#0EA5E9' };

function radiusFor(count, max) {
  const minR = 7, maxR = 30;
  if (!max) return minR;
  return minR + (maxR - minR) * Math.sqrt(count / max);
}

export default function TownshipMap({ center, points, color }) {
  const max = points.reduce((m, p) => Math.max(m, p.call_count), 0);
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
