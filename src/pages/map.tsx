import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui";
import type { MapLead } from "@/components/LeadMap";

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
      <div><label htmlFor="map-status">Status</label><select id="map-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{["NEW", "QUALIFIED", "DRAFTED", "APPROVED", "SENT", "REPLIED", "WON", "CLOSED", "DNC"].map((s) => <option key={s}>{s}</option>)}</select></div>
      <div><label htmlFor="map-category">Category</label><select id="map-category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option><option value="dentist">Dentist</option><option value="real_estate">Real estate</option><option value="lawyer">Lawyer</option><option value="law_firm">Law firm</option></select></div>
    </div>
    {error && <div className="alert-error" role="alert">{error}</div>}
    <p className="muted">{leads.length} mapped leads</p>
    <LeadMap leads={leads} />
  </div>;
}
