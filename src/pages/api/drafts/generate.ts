import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { generateAllVariants } from "@/lib/draftGenerator";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { leadId, channel } = req.body ?? {};
  if (!leadId) return res.status(400).json({ error: "leadId is required" });

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (lead.status === "DNC") {
    return res.status(409).json({ error: "This lead is on the do-not-contact list." });
  }

  const variants = generateAllVariants(lead);
  const drafts = await Promise.all(
    variants.map(({ variant, content }) =>
      prisma.draft.create({
        data: { leadId, variant, content, channel: channel ?? "EMAIL" },
      })
    )
  );

  await prisma.lead.update({ where: { id: leadId }, data: { status: "DRAFTED" } });
  await prisma.event.create({
    data: { leadId, type: "DRAFT_GENERATED", message: `${drafts.length} variants` },
  });

  return res.status(200).json({ drafts });
}
