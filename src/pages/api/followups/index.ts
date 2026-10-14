import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";
import { parseDueAt } from "@/lib/followUps";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureDb();
    if (req.method === "GET") {
      const leadId = typeof req.query.leadId === "string" ? req.query.leadId : undefined;
      const followUps = await prisma.followUp.findMany({
        where: leadId ? { leadId } : {},
        orderBy: { dueAt: "asc" },
        include: { lead: { select: { id: true, name: true } } },
      });
      return res.status(200).json({ followUps });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST" });
    const { leadId, dueAt, note } = req.body ?? {};
    if (typeof leadId !== "string" || !leadId) return res.status(400).json({ error: "leadId is required" });
    if (typeof note !== "string" || !note.trim() || note.length > 500) return res.status(400).json({ error: "note must be 1-500 characters" });
    const parsedDueAt = parseDueAt(dueAt);
    if (!parsedDueAt) return res.status(400).json({ error: "dueAt must be a valid date" });
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    const followUp = await prisma.followUp.create({ data: { leadId, dueAt: parsedDueAt, note: note.trim() } });
    await safeEvent({ leadId, type: "FOLLOW_UP_CREATED", message: followUp.note });
    return res.status(201).json({ followUp });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Follow-up request failed" });
  }
}
