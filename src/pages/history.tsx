import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui";

interface SearchRecord { id: string; area: string; radiusKm: number; category: string; keywords: string | null; resultCount: number; createdAt: string; }

export default function HistoryPage() {
  const [history, setHistory] = useState<SearchRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void fetch("/api/search-history").then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load search history");
      setHistory(data.history ?? []);
    }).catch((err) => setError(err instanceof Error ? err.message : "Could not load search history"));
  }, []);
  return <div>
    <SectionLabel n={3} total="04" label="Search history" />
    <h1>Search history.</h1>
    <p className="lede">Areas and categories you have already covered.</p>
    {error && <div className="alert-error" role="alert">{error}</div>}
    {history.length === 0 && !error ? <div className="empty"><p><strong>No searches yet.</strong></p><p className="muted">Run a search to start building history.</p></div> : <div className="table-wrap"><table><thead><tr><th>Area</th><th>Category</th><th>Radius</th><th>Results</th><th>When</th></tr></thead><tbody>{history.map((record) => <tr key={record.id}><td>{record.area}{record.keywords ? <div className="muted">{record.keywords}</div> : null}</td><td>{record.category}</td><td>{record.radiusKm} km</td><td>{record.resultCount}</td><td>{new Date(record.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
  </div>;
}
