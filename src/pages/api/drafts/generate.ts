import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";
import { generateAllVariants } from "@/lib/draftGenerator";

const VALID_CHANNELS = ["EMAIL", "DM", "CALL_SMS_TASK"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { leadId, channel } = req.body ?? {};
  if (typeof leadId !== "string" || !leadId) return res.status(400).json({ error: "leadId is required" });
  if (channel !== undefined && (typeof channel !== "string" || !VALID_CHANNELS.includes(channel))) {
    return res.status(400).json({ error: `channel must be one of ${VALID_CHANNELS.join(", ")}` });
  }

  try {
    await ensureDb();
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Database unavailable" });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (lead.status === "DNC") {
    return res.status(409).json({ error: "This lead is on the do-not-contact list." });
  }
  if (lead.status !== "QUALIFIED" && lead.status !== "DRAFTED") {
    return res.status(409).json({ error: `Generate drafts only for QUALIFIED or DRAFTED leads (current: ${lead.status})` });
  }

  const variants = generateAllVariants(lead);
  const drafts = await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      variants.map(({ variant, content }) =>
        tx.draft.create({
          data: { leadId, variant, content, channel: channel ?? "EMAIL" },
        })
      )
    );
    await tx.lead.update({ where: { id: leadId }, data: { status: "DRAFTED" } });
    return created;
  });
  await safeEvent({
    leadId, type: "DRAFT_GENERATED", message: `${drafts.length} variants`,
  });

  return res.status(200).json({ drafts });
}
