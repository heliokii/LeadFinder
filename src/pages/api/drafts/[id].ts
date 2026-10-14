import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";
import { canChangeDraftStatus } from "@/lib/workflow";

const VALID_STATUSES = ["DRAFT", "APPROVED", "SENT", "REPLIED", "CLOSED"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Use PATCH" });

  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) return res.status(400).json({ error: "A single draft id is required" });
  const { status } = req.body ?? {};
  if (typeof status !== "string") {
    return res.status(400).json({ error: "status must be a string" });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
  }

  try {
    await ensureDb();
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Database unavailable" });
  }

  const draft = await prisma.draft.findUnique({ where: { id }, include: { lead: true } });
  if (!draft) return res.status(404).json({ error: "Draft not found" });

  if (!canChangeDraftStatus(draft.status, status)) {
    return res.status(409).json({ error: `Cannot move draft from ${draft.status} to ${status}` });
  }

  // Hard gate: this app will not let you mark something SENT for a lead
  // that landed on the DNC list after the draft was written.
  if (status === "SENT") {
    if (draft.lead.status === "DNC") {
      return res.status(409).json({ error: "This lead is on the do-not-contact list." });
    }
    if (draft.lead.phoneNormalized) {
      const dnc = await prisma.doNotContact.findFirst({ where: { phone: draft.lead.phoneNormalized } });
      if (dnc) return res.status(409).json({ error: "This contact is on the do-not-contact list." });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextDraft = await tx.draft.update({
      where: { id },
      data: {
        status,
        ...(status === "APPROVED" ? { approvedAt: new Date() } : {}),
        ...(status === "SENT" ? { sentAt: new Date() } : {}),
      },
    });
    if (status === "SENT") {
      await tx.lead.update({ where: { id: draft.leadId }, data: { status: "SENT" } });
    }
    return nextDraft;
  });
  await safeEvent({
    leadId: draft.leadId, type: "STATUS_CHANGE", message: `draft ${id} -> ${status}`,
  });

  return res.status(200).json({ draft: updated });
}
