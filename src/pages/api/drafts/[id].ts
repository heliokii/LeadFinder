import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["DRAFT", "APPROVED", "SENT", "REPLIED", "CLOSED"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Use PATCH" });

  const id = req.query.id as string;
  const { status } = req.body ?? {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
  }

  const draft = await prisma.draft.findUnique({ where: { id }, include: { lead: true } });
  if (!draft) return res.status(404).json({ error: "Draft not found" });

  // Hard gate: this app will not let you mark something SENT for a lead
  // that landed on the DNC list after the draft was written.
  if (status === "SENT") {
    if (draft.lead.phoneNormalized) {
      const dnc = await prisma.doNotContact.findFirst({ where: { phone: draft.lead.phoneNormalized } });
      if (dnc) return res.status(409).json({ error: "This contact is on the do-not-contact list." });
    }
  }

  const updated = await prisma.draft.update({
    where: { id },
    data: {
      status,
      ...(status === "APPROVED" ? { approvedAt: new Date() } : {}),
      ...(status === "SENT" ? { sentAt: new Date() } : {}),
    },
  });

  if (status === "SENT") {
    await prisma.lead.update({ where: { id: draft.leadId }, data: { status: "SENT" } });
  }
  await prisma.event.create({
    data: { leadId: draft.leadId, type: "STATUS_CHANGE", message: `draft ${id} -> ${status}` },
  });

  return res.status(200).json({ draft: updated });
}
