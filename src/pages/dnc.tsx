import { useEffect, useState, useCallback } from "react";
import { SectionLabel, toast, useToast } from "@/components/ui";

interface DncEntry {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  reason: string | null;
  createdAt: string;
}

export default function DncPage() {
  const [entries, setEntries] = useState<DncEntry[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/dnc");
    const data = await res.json();
    setEntries(data.entries ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/dnc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, reason }),
    });
    setName("");
    setPhone("");
    setReason("");
    setSaving(false);
    toast("Added to do-not-contact");
    await load();
  }

  return (
    <div>
      <SectionLabel n={3} total="04" label={`Do-not-contact — ${entries.length} blocked`} />
      <h1>Do-not-contact.</h1>
      <p className="lede">
        Anyone here is skipped automatically by future searches and blocked from being marked SENT.
      </p>

      <div className="card lift">
        <form className="stack" onSubmit={onSubmit}>
          <div className="row">
            <div>
              <label htmlFor="name">Name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63…" autoComplete="off" />
            </div>
          </div>
          <div>
            <label htmlFor="reason">Reason <span style={{ opacity: 0.6 }}>(optional)</span></label>
            <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Asked to stop, wrong number…" autoComplete="off" />
          </div>
          <div>
            <button type="submit" disabled={saving || (!name.trim() && !phone.trim())}>
              {saving && <span className="spin" />} Add to list
            </button>
          </div>
        </form>
      </div>

      <h2>Current list</h2>
      {entries.length === 0 ? (
        <div className="empty">
          <div className="big">∅</div>
          <p><strong>List is empty.</strong></p>
          <p className="muted">Nobody blocked — that&apos;s a good sign.</p>
        </div>
      ) : (
      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td style={{ fontWeight: 600 }}>{e.name ?? "—"}</td>
              <td className="mono">{e.phone ?? "—"}</td>
              <td className="mono">{e.email ?? "—"}</td>
              <td className="muted">{e.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
  );
}
