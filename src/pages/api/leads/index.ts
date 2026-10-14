import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  try {
    await ensureDb();
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Database unavailable" });
  }

  const { status, category, minScore, sort } = req.query;

  const minScoreRaw = typeof minScore === "string" && minScore.trim() ? Number(minScore) : undefined;
  if (minScoreRaw !== undefined && (!Number.isFinite(minScoreRaw) || minScoreRaw < 0 || minScoreRaw > 100)) {
    return res.status(400).json({ error: "minScore must be a number from 0 to 100" });
  }

  const leads = await prisma.lead.findMany({
    where: {
      ...(status && typeof status === "string" ? { status } : {}),
      ...(category && typeof category === "string" ? { category } : {}),
      ...(minScoreRaw !== undefined ? { score: { gte: minScoreRaw } } : {}),
    },
    orderBy:
      sort === "newest"
        ? { createdAt: "desc" }
        : sort === "name"
        ? { name: "asc" }
        : { score: "desc" },
    include: { drafts: { select: { id: true, status: true, variant: true } } },
  });

  return res.status(200).json({ leads });
}
