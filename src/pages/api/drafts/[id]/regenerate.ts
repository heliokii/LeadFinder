import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";
import { generateAllVariants } from "@/lib/draftGenerator";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) return res.status(400).json({ error: "A single draft id is required" });

  try {
    await ensureDb();
    const draft = await prisma.draft.findUnique({ where: { id }, include: { lead: true } });
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    if (draft.lead.status === "DNC") return res.status(409).json({ error: "This lead is on the do-not-contact list." });
    if (draft.status === "SENT" || draft.status === "REPLIED" || draft.status === "CLOSED") {
      return res.status(409).json({ error: "Only unsent drafts can be regenerated" });
    }
    const variant = generateAllVariants(draft.lead).find((item) => item.variant === draft.variant);
    if (!variant) return res.status(400).json({ error: "Unknown draft variant" });
    const updated = await prisma.draft.update({
      where: { id },
      data: { content: variant.content, status: "DRAFT", approvedAt: null, sentAt: null },
    });
    await safeEvent({ leadId: draft.leadId, type: "DRAFT_REGENERATED", message: `draft ${id} regenerated` });
    return res.status(200).json({ draft: updated });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Could not regenerate draft" });
  }
}
