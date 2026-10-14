import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";
import { parseDueAt } from "@/lib/followUps";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['PATCH', 'DELETE'].includes(req.method ?? '')) return res.status(405).json({ error: "Use PATCH or DELETE" });
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) return res.status(400).json({ error: "A single follow-up id is required" });
  try {
    await ensureDb();
    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Follow-up not found" });
    if (req.method === "DELETE") {
      await prisma.followUp.delete({ where: { id } });
      await safeEvent({ leadId: existing.leadId, type: "FOLLOW_UP_DELETED", message: existing.note });
      return res.status(204).end();
    }
    const { dueAt, note, completed } = req.body ?? {};
    if (dueAt !== undefined && !parseDueAt(dueAt)) return res.status(400).json({ error: "dueAt must be a valid date" });
    if (note !== undefined && (typeof note !== "string" || !note.trim() || note.length > 500)) return res.status(400).json({ error: "note must be 1-500 characters" });
    if (completed !== undefined && typeof completed !== "boolean") return res.status(400).json({ error: "completed must be boolean" });
    const followUp = await prisma.followUp.update({
      where: { id },
      data: {
        ...(dueAt !== undefined ? { dueAt: parseDueAt(dueAt)! } : {}),
        ...(note !== undefined ? { note: note.trim() } : {}),
        ...(completed !== undefined ? { completedAt: completed ? new Date() : null } : {}),
      },
    });
    await safeEvent({ leadId: existing.leadId, type: completed !== undefined ? "FOLLOW_UP_COMPLETED" : "FOLLOW_UP_UPDATED", message: followUp.note });
    return res.status(200).json({ followUp });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Follow-up request failed" });
  }
}
