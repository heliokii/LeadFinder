import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui";
import type { MapLead } from "@/components/LeadMap";
import { STATUS_COLORS, STATUS_OPTIONS } from "@/lib/statusColors";
import { CATEGORY_CATALOG } from "@/lib/categories";

const LeadMap = dynamic(() => import("@/components/LeadMap"), { ssr: false, loading: () => <div className="skel" style={{ height: 520 }} /> });

export default function MapPage() {
  const [leads, setLeads] = useState<MapLead[]>([]);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    void fetch(`/api/leads?${params}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load map leads");
      setLeads((data.leads ?? []).filter((lead: MapLead) => Number.isFinite(lead.lat) && Number.isFinite(lead.lon)));
    }).catch((err) => setError(err instanceof Error ? err.message : "Could not load map leads"));
  }, [status, category]);
  return <div>
    <SectionLabel n={4} total="04" label="Lead map" />
    <h1>Lead map.</h1>
    <p className="lede">Explore saved leads by location.</p>
    <div className="filters" style={{ marginTop: 20 }}>
      <div><label htmlFor="map-status">Status</label><select id="map-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select></div>
      <div><label htmlFor="map-category">Category</label><select id="map-category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{CATEGORY_CATALOG.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
    </div>
    {error && <div className="alert-error" role="alert">{error}</div>}
    <p className="muted">{leads.length} mapped leads</p>
    <div className="map-status-legend" aria-label="Map status legend">
      {STATUS_OPTIONS.map((item) => <span className="map-status-key" key={item}><span className="map-status-swatch" style={{ backgroundColor: STATUS_COLORS[item] }} aria-hidden="true" />{item}</span>)}
    </div>
    <LeadMap leads={leads} />
  </div>;
}
