import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Score, SectionLabel, useReveal, useToast } from "@/components/ui";
import { CATEGORY_CATALOG } from "@/lib/categories";

interface LeadRow {
  id: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  score: number;
  status: string;
  drafts: { id: string; status: string }[];
}

const STATUSES = ["NEW", "QUALIFIED", "DRAFTED", "APPROVED", "SENT", "REPLIED", "WON", "CLOSED", "DNC"];

export default function LeadsPage() {
  const router = useRouter();
  useToast();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [categoryReady, setCategoryReady] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [hasPhone, setHasPhone] = useState("");
  const [hasAddress, setHasAddress] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("QUALIFIED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);
      if (minScore) params.set("minScore", minScore);
      if (maxScore) params.set("maxScore", maxScore);
      if (hasPhone) params.set("hasPhone", hasPhone);
      if (hasAddress) params.set("hasAddress", hasAddress);
      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load leads");
      setLeads(data.leads ?? []);
    } catch (err) {
      setLeads([]);
      setError(err instanceof Error ? err.message : "Could not load leads");
    } finally {
      setLoading(false);
    }
  }, [status, category, sort, minScore, maxScore, hasPhone, hasAddress]);

  useEffect(() => {
    if (!router.isReady) return;
    const requestedCategory = typeof router.query.category === "string" ? router.query.category : "";
    setCategory(CATEGORY_CATALOG.some((item) => item.value === requestedCategory) ? requestedCategory : "");
    setCategoryReady(true);
  }, [router.isReady, router.query.category]);

  useEffect(() => {
    if (!router.isReady || !categoryReady) return;
    void load();
  }, [router.isReady, categoryReady, load]);

  useReveal(leads.length);

  const visible = query.trim()
    ? leads.filter((l) =>
        `${l.name} ${l.address ?? ""} ${l.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())
      )
    : leads;
  const allVisibleSelected = visible.length > 0 && visible.every((lead) => selected.includes(lead.id));
  const exportParams = new URLSearchParams();
  if (selected.length) exportParams.set("ids", selected.join(","));
  if (status) exportParams.set("status", status);
  if (category) exportParams.set("category", category);
  if (minScore) exportParams.set("minScore", minScore);
  if (maxScore) exportParams.set("maxScore", maxScore);
  if (hasPhone) exportParams.set("hasPhone", hasPhone);
  if (hasAddress) exportParams.set("hasAddress", hasAddress);
  const exportHref = `/api/export?${exportParams.toString()}`;

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllVisible() {
    setSelected((current) => allVisibleSelected ? current.filter((id) => !visible.some((lead) => lead.id === id)) : [...new Set([...current, ...visible.map((lead) => lead.id)])]);
  }

  async function runBulk(action: "status" | "dnc") {
    if (!selected.length) return;
    const res = await fetch("/api/leads/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected, action, status: action === "status" ? bulkStatus : undefined }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Bulk action failed");
    setSelected([]);
    await load();
  }

  return (
    <div>
      <SectionLabel n={2} total="04" label={`Leads — ${leads.length} saved`} />
      <h1>Leads.</h1>
      <p className="lede">No-website businesses, scored by how contactable they look. Click a row to work it.</p>
      {error && <div className="alert-error" role="alert">{error}</div>}

      <div className="filters" style={{ marginTop: 20 }}>
        <div className="grow">
          <label htmlFor="q">Search</label>
          <input id="q" placeholder="Filter by name, address, phone…" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-cat">Category</label>
          <select id="f-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORY_CATALOG.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-sort">Sort</label>
          <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="">Best score</option>
            <option value="newest">Newest</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
          <div><label htmlFor="f-min">Score from</label><input id="f-min" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(e.target.value)} /></div>
          <div><label htmlFor="f-max">Score to</label><input id="f-max" type="number" min={0} max={100} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} /></div>
          <div><label htmlFor="f-phone">Phone</label><select id="f-phone" value={hasPhone} onChange={(e) => setHasPhone(e.target.value)}><option value="">Any</option><option value="true">Has phone</option><option value="false">No phone</option></select></div>
          <div><label htmlFor="f-address">Address</label><select id="f-address" value={hasAddress} onChange={(e) => setHasAddress(e.target.value)}><option value="">Any</option><option value="true">Has address</option><option value="false">No address</option></select></div>
        <div style={{ flex: "0 0 auto", minWidth: 0 }}>
          <label>&nbsp;</label>
          <a className="btn secondary" href={exportHref}>Export CSV{selected.length ? ` (${selected.length})` : ""}</a>
        </div>
      </div>

      {selected.length > 0 && <div className="card" style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
        <strong>{selected.length} selected</strong>
        <div><label htmlFor="bulk-status">Advance to</label><select id="bulk-status" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>{["QUALIFIED", "DRAFTED", "APPROVED", "SENT", "REPLIED", "WON", "CLOSED"].map((s) => <option key={s}>{s}</option>)}</select></div>
        <button className="secondary" onClick={() => void runBulk("status")}>Apply status</button>
        <button className="danger" onClick={() => void runBulk("dnc")}>Mark DNC</button>
      </div>}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div className="skel" key={i} aria-hidden="true"><i style={{ width: "40%" }} /><i style={{ width: "85%" }} /><i style={{ width: "60%" }} /></div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <div className="big">○</div>
          <p><strong>No leads yet.</strong></p>
          <p className="muted">Run a search first — results land here.</p>
          <p style={{ marginTop: 14 }}><Link href="/">Go to search →</Link></p>
        </div>
      ) : (
        <div className="table-wrap reveal in">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select visible leads" checked={allVisibleSelected} onChange={toggleAllVisible} /></th>
                <th>Name</th>
                <th>Category</th>
                <th>Phone</th>
                <th>Score</th>
                <th>Status</th>
                <th>Drafts</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lead) => (
                <tr key={lead.id} className="row-link" onClick={() => router.push(`/leads/${lead.id}`)}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${lead.name}`} checked={selected.includes(lead.id)} onChange={() => toggleSelected(lead.id)} /></td>
                  <td>
                    <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}>
                      {lead.name}
                    </Link>
                    <div className="muted">{lead.address}</div>
                  </td>
                  <td className="muted">{lead.category}</td>
                  <td className="mono">{lead.phone ?? "—"}</td>
                  <td><Score value={lead.score} /></td>
                  <td>
                    <span className={`badge st-${lead.status}`}>{lead.status}</span>
                  </td>
                  <td className="mono">{lead.drafts.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

