import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui";

interface SearchRecord {
  id: string;
  area: string;
  radiusKm: number;
  category: string;
  keywords: string | null;
  resultCount: number;
  createdAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<SearchRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/search-history").then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load search history");
      setHistory(data.history ?? []);
    }).catch((err) => setError(err instanceof Error ? err.message : "Could not load search history"));
  }, []);

  async function deleteSearch(record: SearchRecord) {
    if (!window.confirm(`Delete the ${record.area} search from history? This will not delete saved leads.`)) return;
    setDeletingId(record.id);
    setError(null);
    try {
      const res = await fetch(`/api/search-history?id=${encodeURIComponent(record.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete search history");
      setHistory((current) => current.filter((entry) => entry.id !== record.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete search history");
    } finally {
      setDeletingId(null);
    }
  }

  return <div>
      <SectionLabel n={4} total="06" label="Search history" />
    <h1>Search history.</h1>
    <p className="lede">Areas and categories you have already covered.</p>
    {error && <div className="alert-error" role="alert">{error}</div>}
    {history.length === 0 && !error ? (
      <div className="empty"><p><strong>No searches yet.</strong></p><p className="muted">Run a search to start building history.</p></div>
    ) : (
      <div className="table-wrap">
        <table>
          <thead><tr><th>Area</th><th>Category</th><th>Radius</th><th>Results</th><th>When</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {history.map((record) => (
              <tr key={record.id}>
                <td>{record.area}{record.keywords ? <div className="muted">{record.keywords}</div> : null}</td>
                <td>{record.category}</td>
                <td>{record.radiusKm} km</td>
                <td>{record.resultCount}</td>
                <td>{new Date(record.createdAt).toLocaleString()}</td>
                <td className="history-actions">
                  <button className="danger" type="button" disabled={deletingId !== null} onClick={() => void deleteSearch(record)}>
                    {deletingId === record.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>;
}
