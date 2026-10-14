import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  try {
    await ensureDb();
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Database unavailable" });
  }

  const { status, category, minScore, maxScore, hasPhone, hasAddress, sort } = req.query;

  const minScoreRaw = typeof minScore === "string" && minScore.trim() ? Number(minScore) : undefined;
  const maxScoreRaw = typeof maxScore === "string" && maxScore.trim() ? Number(maxScore) : undefined;
  if (minScoreRaw !== undefined && (!Number.isFinite(minScoreRaw) || minScoreRaw < 0 || minScoreRaw > 100)) {
    return res.status(400).json({ error: "minScore must be a number from 0 to 100" });
  }
  if (maxScoreRaw !== undefined && (!Number.isFinite(maxScoreRaw) || maxScoreRaw < 0 || maxScoreRaw > 100)) {
    return res.status(400).json({ error: "maxScore must be a number from 0 to 100" });
  }
  if (minScoreRaw !== undefined && maxScoreRaw !== undefined && minScoreRaw > maxScoreRaw) {
    return res.status(400).json({ error: "minScore cannot exceed maxScore" });
  }
  const parseFlag = (value: string | string[] | undefined) => value === "true" ? true : value === "false" ? false : undefined;
  const phoneFlag = parseFlag(typeof hasPhone === "string" ? hasPhone : undefined);
  const addressFlag = parseFlag(typeof hasAddress === "string" ? hasAddress : undefined);

  const leads = await prisma.lead.findMany({
    where: {
      ...(status && typeof status === "string" ? { status } : {}),
      ...(category && typeof category === "string" ? { category } : {}),
      ...(minScoreRaw !== undefined || maxScoreRaw !== undefined ? { score: { ...(minScoreRaw !== undefined ? { gte: minScoreRaw } : {}), ...(maxScoreRaw !== undefined ? { lte: maxScoreRaw } : {}) } } : {}),
      ...(phoneFlag === true ? { phone: { not: null } } : phoneFlag === false ? { phone: null } : {}),
      ...(addressFlag === true ? { address: { not: null } } : addressFlag === false ? { address: null } : {}),
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
