import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

export interface MapLead { id: string; name: string; lat: number; lon: number; score: number; status: string; }

const statusColor: Record<string, string> = { DNC: "#b42318", WON: "#1a7f37", SENT: "#9a6700" };

export default function LeadMap({ leads }: { leads: MapLead[] }) {
  const center: [number, number] = leads.length ? [leads[0].lat, leads[0].lon] : [14.5995, 120.9842];
  return <MapContainer center={center} zoom={12} scrollWheelZoom className="lead-map">
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {leads.map((lead) => <CircleMarker key={lead.id} center={[lead.lat, lead.lon]} radius={8} pathOptions={{ color: statusColor[lead.status] ?? "#000", fillOpacity: 0.8 }}>
      <Popup><strong>{lead.name}</strong><br />Score {lead.score} · {lead.status}<br /><a href={`/leads/${lead.id}`}>Open lead →</a></Popup>
    </CircleMarker>)}
  </MapContainer>;
}
