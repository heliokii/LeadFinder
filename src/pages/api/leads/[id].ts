import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

const VALID_STATUSES = [
  "NEW",
  "QUALIFIED",
  "DRAFTED",
  "APPROVED",
  "SENT",
  "REPLIED",
  "WON",
  "CLOSED",
  "DNC",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;

  if (req.method === "GET") {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { drafts: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" } } },
    });
    if (!lead) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ lead });
  }

  if (req.method === "PATCH") {
    const { status, notes } = req.body ?? {};
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { ...(status ? { status } : {}), ...(notes !== undefined ? { notes } : {}) },
    });

    if (status) {
      await prisma.event.create({
        data: { leadId: id, type: "STATUS_CHANGE", message: `-> ${status}` },
      });
    }

    // Moving a lead to DNC also files the do-not-contact record so future
    // searches skip it automatically.
    if (status === "DNC" && lead.phoneNormalized) {
      await prisma.doNotContact.create({
        data: { phone: lead.phoneNormalized, name: lead.name, reason: "Marked DNC from lead detail" },
      });
    }

    return res.status(200).json({ lead });
  }

  return res.status(405).json({ error: "Use GET or PATCH" });
}
