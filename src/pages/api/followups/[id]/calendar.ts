import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb } from "@/lib/db";
import { buildFollowUpIcs } from "@/lib/followUps";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) return res.status(400).json({ error: "A single follow-up id is required" });
  try {
    await ensureDb();
    const followUp = await prisma.followUp.findUnique({ where: { id }, include: { lead: { select: { name: true } } } });
    if (!followUp) return res.status(404).json({ error: "Follow-up not found" });
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="follow-up-${id}.ics"`);
    return res.status(200).send(buildFollowUpIcs({ ...followUp, leadName: followUp.lead.name }));
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Could not create calendar event" });
  }
}
