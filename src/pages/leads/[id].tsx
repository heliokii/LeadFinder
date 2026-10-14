import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { BackLink, Pipeline, Score, SectionLabel, copyText, toast, useToast } from "@/components/ui";

interface Draft {
  id: string;
  variant: string;
  content: string;
  status: string;
  channel: string;
}
interface FollowUp {
  id: string;
  dueAt: string;
  note: string;
  completedAt: string | null;
}
interface EventRow {
  id: string;
  type: string;
  message: string | null;
  createdAt: string;
}
interface LeadDetail {
  id: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  websiteRaw: string | null;
  mapsUrl: string | null;
  score: number;
  scoreFlags: string | null;
  status: string;
  notes: string | null;
  drafts: Draft[];
  followUps: FollowUp[];
  events: EventRow[];
}

const NEXT: Record<string, string | null> = {
  NEW: "QUALIFIED",
  QUALIFIED: null,
  DRAFTED: "APPROVED",
  APPROVED: null,
  SENT: "REPLIED",
  REPLIED: "WON",
  WON: "CLOSED",
  CLOSED: null,
  DNC: null,
};

export default function LeadDetailPage() {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  useToast();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null);
  const [confirmDnc, setConfirmDnc] = useState(false);
  const [editDraftId, setEditDraftId] = useState<string | null>(null);
  const [editDraftContent, setEditDraftContent] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpDueAt, setFollowUpDueAt] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/leads/${id}`);
    const data = await res.json();
    setLead(data.lead);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!lead) {
    return (
      <div>
        <SectionLabel n={2} total="04" label="Lead detail" />
        <div className="skel" aria-label="Loading lead"><i style={{ width: "35%" }} /><i style={{ width: "80%" }} /><i style={{ width: "55%" }} /></div>
      </div>
    );
  }

  let flags: string[] = [];
  if (lead.scoreFlags) {
    try {
      const parsed = JSON.parse(lead.scoreFlags);
      if (Array.isArray(parsed) && parsed.every((flag) => typeof flag === "string")) flags = parsed;
    } catch {
      // Ignore malformed legacy score metadata; the lead itself is still usable.
    }
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  }

  async function generateDrafts() {
    await run("gen", async () => {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || "Could not generate drafts");
        return;
      }
      toast("3 draft variants generated");
      await load();
    });
  }

  async function setDraftStatus(draftId: string, status: string) {
    await run(draftId + status, async () => {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Blocked — check DNC list");
        return;
      }
      toast(status === "APPROVED" ? "Draft approved" : status === "SENT" ? "Marked SENT — logged" : `Draft → ${status}`);
      await load();
    });
  }

  async function saveDraftContent(draftId: string) {
    await run(draftId + "edit", async () => {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editDraftContent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast(data.error || "Could not save draft");
      setEditDraftId(null);
      toast("Draft saved");
      await load();
    });
  }

  async function regenerateDraft(draftId: string) {
    await run(draftId + "regen", async () => {
      const res = await fetch(`/api/drafts/${draftId}/regenerate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast(data.error || "Could not regenerate draft");
      toast("Draft regenerated");
      await load();
    });
  }

  async function createFollowUp(e: React.FormEvent) {
    e.preventDefault();
    await run("followup", async () => {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id, dueAt: followUpDueAt, note: followUpNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast(data.error || "Could not create follow-up");
      setFollowUpDueAt("");
      setFollowUpNote("");
      toast("Follow-up added");
      await load();
    });
  }

  async function completeFollowUp(followUpId: string, completed: boolean) {
    await run("followup" + followUpId, async () => {
      const res = await fetch(`/api/followups/${followUpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast(data.error || "Could not update follow-up");
      await load();
    });
  }

  async function setLeadStatus(status: string) {
    await run("lead" + status, async () => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Could not update lead");
        return;
      }
      toast(status === "DNC" ? "Added to do-not-contact" : `Lead → ${status}`);
      setConfirmDnc(false);
      await load();
    });
  }

  async function getPaymentMessage() {
    await run("pay", async () => {
      const res = await fetch(`/api/leads/${id}/payment`);
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not create payment message");
        return;
      }
      setPaymentMsg(data.message);
    });
  }

  const next = NEXT[lead.status];
  const canGenerate = lead.status === "QUALIFIED" || lead.status === "DRAFTED";

  return (
    <div>
      <SectionLabel n={2} total="04" label="Lead detail" />
      <BackLink href="/leads">All leads</BackLink>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, flex: "1 1 auto" }}>{lead.name}</h1>
        <span className={`badge st-${lead.status}`} style={{ marginTop: 10 }}>{lead.status}</span>
      </div>
      <p className="lede">
        {lead.category} · {lead.address ?? "no address on file"}
      </p>

      <Pipeline status={lead.status} />

      <div className="card lift" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="label">Score</div>
            <Score value={lead.score} />
          </div>
          <div>
            <div className="label">Phone</div>
            <div className="mono">{lead.phone ?? "—"}</div>
          </div>
          <div>
            <div className="label">Website</div>
            <div className="mono">{lead.websiteRaw ?? "none ✓"}</div>
          </div>
          {lead.mapsUrl && (
            <div>
              <div className="label">Map</div>
              <a href={lead.mapsUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
                OpenStreetMap →
              </a>
            </div>
          )}
        </div>
        {flags.length > 0 && <p className="muted" style={{ marginBottom: 0 }}>Flags: {flags.join(", ")}</p>}

        <div className="draft-actions" style={{ marginTop: 16 }}>
          {next && (
            <button className="secondary" disabled={busy !== null} onClick={() => setLeadStatus(next)}>
              {busy === "lead" + next ? <span className="spin" /> : null}
              Advance → {next}
            </button>
          )}
          {lead.status === "WON" && (
            <button className="secondary" disabled={busy === "pay"} onClick={getPaymentMessage}>
              {busy === "pay" ? <span className="spin" /> : null} Get payment message
            </button>
          )}
          {lead.status !== "DNC" && !confirmDnc && (
            <button className="secondary" onClick={() => setConfirmDnc(true)}>
              Mark do-not-contact
            </button>
          )}
          {confirmDnc && (
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="muted">Block future contact?</span>
              <button className="danger" disabled={busy !== null} onClick={() => setLeadStatus("DNC")}>
                Confirm DNC
              </button>
              <button className="secondary" onClick={() => setConfirmDnc(false)}>Cancel</button>
            </span>
          )}
        </div>
        {paymentMsg && (
          <div style={{ marginTop: 14 }}>
            <pre style={{ whiteSpace: "pre-wrap", background: "var(--paper)", border: "1px solid var(--line)", padding: 14, borderRadius: 2 }}>{paymentMsg}</pre>
            <button className="secondary" onClick={() => copyText(paymentMsg, "Payment message copied")}>Copy message</button>
          </div>
        )}
      </div>

      <h2>Outreach drafts</h2>
      <p className="muted" style={{ marginTop: -6 }}>
        Nothing sends automatically — approve, send it yourself, then mark SENT.
      </p>
      {lead.drafts.length === 0 ? (
        <div className="empty">
          <div className="big">✎</div>
          <p><strong>No drafts yet.</strong></p>
          <p className="muted">
            {canGenerate ? "Generate 3 variants: ultra-short, normal, value-first." : "Advance this lead to QUALIFIED before generating drafts."}
          </p>
          {canGenerate && <p style={{ marginTop: 14 }}>
            <button onClick={generateDrafts} disabled={busy === "gen"}>
              {busy === "gen" && <span className="spin" />} Generate 3 draft variants
            </button>
          </p>}
        </div>
      ) : (
        lead.drafts.map((d, i) => (
          <div className="draft-block" key={d.id} style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ letterSpacing: "-0.01em" }}>{d.variant}</strong>
              <span className="muted">via {d.channel}</span>
              <span style={{ marginLeft: "auto" }} className={`badge st-${d.status === "DRAFT" ? "NEW" : d.status}`}>{d.status}</span>
            </div>
            <pre>{d.content}</pre>
            {editDraftId === d.id && (
              <div className="stack" style={{ marginTop: 10 }}>
                <textarea value={editDraftContent} onChange={(e) => setEditDraftContent(e.target.value)} rows={8} maxLength={10000} />
                <div className="draft-actions">
                  <button onClick={() => saveDraftContent(d.id)} disabled={busy !== null}>Save draft</button>
                  <button className="secondary" onClick={() => setEditDraftId(null)}>Cancel</button>
                </div>
              </div>
            )}
            <div className="draft-actions">
              {d.status === "DRAFT" && (
                <button className="secondary" disabled={busy !== null} onClick={() => setDraftStatus(d.id, "APPROVED")}>
                  {busy === d.id + "APPROVED" ? <span className="spin" /> : null} Approve
                </button>
              )}
              {d.status === "APPROVED" && (
                <button disabled={busy !== null} onClick={() => setDraftStatus(d.id, "SENT")}>
                  {busy === d.id + "SENT" ? <span className="spin" /> : null} I sent this manually — mark SENT
                </button>
              )}
              {d.status !== "SENT" && d.status !== "REPLIED" && d.status !== "CLOSED" && editDraftId !== d.id && (
                <>
                  <button className="secondary" onClick={() => { setEditDraftId(d.id); setEditDraftContent(d.content); }}>Edit</button>
                  <button className="secondary" disabled={busy !== null} onClick={() => regenerateDraft(d.id)}>Regenerate</button>
                </>
              )}
              <button className="secondary" onClick={() => copyText(d.content, `${d.variant} copied`)}>
                Copy
              </button>
            </div>
          </div>
        ))
      )}

      <h2>Follow-ups</h2>
      <form className="card stack" onSubmit={createFollowUp}>
        <div className="row">
          <div><label htmlFor="follow-up-due">Due</label><input id="follow-up-due" type="datetime-local" value={followUpDueAt} onChange={(e) => setFollowUpDueAt(e.target.value)} required /></div>
          <div><label htmlFor="follow-up-note">Note</label><input id="follow-up-note" value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} maxLength={500} required placeholder="Call back about proposal" /></div>
        </div>
        <button type="submit" disabled={busy !== null}>Add follow-up</button>
      </form>
      {lead.followUps.length > 0 && <div className="stack" style={{ marginTop: 12 }}>
        {lead.followUps.map((followUp) => (
          <div className="card" key={followUp.id} style={{ opacity: followUp.completedAt ? 0.6 : 1 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <strong>{new Date(followUp.dueAt).toLocaleString()}</strong>
              <span className="muted">{followUp.note}</span>
              <span style={{ marginLeft: "auto" }}>
                <button className="secondary" onClick={() => completeFollowUp(followUp.id, !followUp.completedAt)}>{followUp.completedAt ? "Reopen" : "Complete"}</button>
                <a className="btn secondary" href={`/api/followups/${followUp.id}/calendar`} style={{ marginLeft: 8 }}>ICS</a>
              </span>
            </div>
          </div>
        ))}
      </div>}

      <h2>Activity</h2>
      <div className="stack">
        {lead.events.map((event) => <div className="muted" key={event.id}>{new Date(event.createdAt).toLocaleString()} · {event.type}{event.message ? ` · ${event.message}` : ""}</div>)}
      </div>
    </div>
  );
}
