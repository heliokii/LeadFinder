import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Score, SectionLabel, useReveal, useToast } from "@/components/ui";

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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    const res = await fetch(`/api/leads?${params.toString()}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }, [status, category, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useReveal(leads.length);

  const visible = query.trim()
    ? leads.filter((l) =>
        `${l.name} ${l.address ?? ""} ${l.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())
      )
    : leads;

  return (
    <div>
      <SectionLabel n={2} total="04" label={`Leads — ${leads.length} saved`} />
      <h1>Leads.</h1>
      <p className="lede">No-website businesses, scored by how contactable they look. Click a row to work it.</p>

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
            <option value="dentist">Dentist</option>
            <option value="real_estate">Real estate</option>
            <option value="lawyer">Lawyer</option>
            <option value="law_firm">Law firm</option>
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
        <div style={{ flex: "0 0 auto", minWidth: 0 }}>
          <label>&nbsp;</label>
          <a className="btn secondary" href="/api/export">Export CSV</a>
        </div>
      </div>

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

