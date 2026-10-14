import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";
import { canChangeLeadStatus } from "@/lib/workflow";

const VALID_STATUSES = ["NEW", "QUALIFIED", "DRAFTED", "APPROVED", "SENT", "REPLIED", "WON", "CLOSED", "DNC"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { ids, action, status } = req.body ?? {};
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || !ids.every((id) => typeof id === "string" && id)) {
    return res.status(400).json({ error: "ids must contain 1-100 lead ids" });
  }
  if (action !== "status" && action !== "dnc") return res.status(400).json({ error: "action must be status or dnc" });
  if (action === "status" && (typeof status !== "string" || !VALID_STATUSES.includes(status))) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
  }
  try {
    await ensureDb();
    const leads = await prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, name: true, phoneNormalized: true } });
    if (leads.length !== ids.length) return res.status(404).json({ error: "One or more leads were not found" });
    const failures = action === "status" ? leads.filter((lead) => !canChangeLeadStatus(lead.status, status)) : [];
    if (failures.length) return res.status(409).json({ error: "One or more status transitions are invalid", failures: failures.map((lead) => ({ id: lead.id, from: lead.status, to: status })) });

    await prisma.$transaction(async (tx) => {
      for (const lead of leads) {
        const nextStatus = action === "dnc" ? "DNC" : status;
        await tx.lead.update({ where: { id: lead.id }, data: { status: nextStatus } });
        if (nextStatus === "DNC" && lead.phoneNormalized) {
          const existing = await tx.doNotContact.findFirst({ where: { phone: lead.phoneNormalized } });
          if (!existing) await tx.doNotContact.create({ data: { phone: lead.phoneNormalized, name: lead.name, reason: "Marked DNC from bulk action" } });
        }
      }
    });
    await Promise.all(leads.map((lead) => safeEvent({ leadId: lead.id, type: "STATUS_CHANGE", message: `bulk -> ${action === "dnc" ? "DNC" : status}` })));
    return res.status(200).json({ updated: leads.map((lead) => lead.id) });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Bulk action failed" });
  }
}
