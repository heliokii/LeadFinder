import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { statusColor } from "@/lib/statusColors";

export interface MapLead { id: string; name: string; lat: number; lon: number; score: number; status: string; }

export default function LeadMap({ leads }: { leads: MapLead[] }) {
  const center: [number, number] = leads.length ? [leads[0].lat, leads[0].lon] : [14.5995, 120.9842];
  return <MapContainer center={center} zoom={12} scrollWheelZoom className="lead-map">
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {leads.map((lead) => {
      const color = statusColor(lead.status);
      return <CircleMarker key={lead.id} center={[lead.lat, lead.lon]} radius={8} pathOptions={{ color, fillColor: color, fillOpacity: 0.82, weight: 2 }}>
      <Popup><strong>{lead.name}</strong><br />Score {lead.score} · {lead.status}<br /><a href={`/leads/${lead.id}`}>Open lead →</a></Popup>
      </CircleMarker>;
    })}
  </MapContainer>;
}
