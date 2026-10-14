import { useState } from "react";
import { SectionLabel, toast } from "@/components/ui";
import { CATEGORY_CATALOG } from "@/lib/categories";

export default function SettingsPage() {
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (mode === "replace" && !window.confirm("Replace all local data with this backup?")) return;
    setBusy(true);
    try {
      const backup = JSON.parse(await file.text());
      const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, backup }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backup import failed");
      toast(`Backup imported: ${data.leads} leads`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Backup import failed");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <div>
      <SectionLabel n={4} total="04" label="Settings — .env configuration" />
      <h1>Settings.</h1>
      <p className="lede">
        All configuration lives in your <code>.env</code> file, not in the database — so nothing
        sensitive passes through the browser. Edit <code>.env</code> and restart the dev server to
        change any of this.
      </p>

      <div className="card lift">
        <h2 style={{ marginTop: 0 }}>Data source</h2>
        <p>
          Leads come from OpenStreetMap via the Overpass and Nominatim APIs — free, no API key,
          no Google Maps scraping. Set <code>OSM_USER_AGENT</code> to something identifying (your
          name or email) — both services block generic User-Agents.
        </p>

        <h2>Categories → OSM tags</h2>
        <div className="table-wrap">
        <table>
          <tbody>
            {(showAllCategories ? CATEGORY_CATALOG : CATEGORY_CATALOG.slice(0, 12)).map((item) => <tr key={item.value}><td>{item.label}</td><td className="mono">{item.tags.join(" · ")}</td></tr>)}
          </tbody>
        </table>
        </div>
        <button className="secondary category-toggle" type="button" onClick={() => setShowAllCategories((value) => !value)} aria-expanded={showAllCategories}>
          {showAllCategories ? "Show fewer categories" : `Show all ${CATEGORY_CATALOG.length} categories`}
        </button>

        <h2>Payment links (shown when a lead is marked WON)</h2>
        <p className="muted">
          Set <code>PAYPAL_ME_HANDLE</code>, <code>WISE_ACCOUNT_DETAILS</code>, and/or{" "}
          <code>PAYONEER_PAYMENT_LINK</code> in <code>.env</code>. These are just links you already
          have — the app doesn&apos;t call any payment API on your behalf.
        </p>

        <h2>Rate limiting</h2>
        <p className="muted">
          <code>OSM_MIN_REQUEST_INTERVAL_MS</code> (default 1200ms) enforces a minimum gap between
          every outgoing OSM request, in line with Nominatim&apos;s usage policy.
        </p>

        <h2>Local backup</h2>
        <p className="muted">Export a complete JSON snapshot or restore one. Merge keeps current data; replace clears it after confirmation.</p>
        <div className="draft-actions">
          <a className="btn secondary" href="/api/backup">Download JSON backup</a>
          <select value={mode} onChange={(e) => setMode(e.target.value as "merge" | "replace")} aria-label="Backup import mode">
            <option value="merge">Merge import</option>
            <option value="replace">Replace import</option>
          </select>
          <label className="btn secondary" style={{ cursor: busy ? "wait" : "pointer" }}>
            {busy ? "Importing…" : "Import JSON"}
            <input type="file" accept="application/json,.json" onChange={importBackup} disabled={busy} hidden />
          </label>
        </div>
      </div>
    </div>
  );
}
