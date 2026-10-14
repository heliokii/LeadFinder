import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb } from "@/lib/db";

export function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  try {
    await ensureDb();
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Database unavailable" });
  }

  const { status, category, minScore, maxScore, hasPhone, hasAddress, ids } = req.query;
  const minScoreRaw = typeof minScore === "string" && minScore.trim() ? Number(minScore) : undefined;
  const maxScoreRaw = typeof maxScore === "string" && maxScore.trim() ? Number(maxScore) : undefined;
  if ((minScoreRaw !== undefined && (!Number.isFinite(minScoreRaw) || minScoreRaw < 0 || minScoreRaw > 100)) || (maxScoreRaw !== undefined && (!Number.isFinite(maxScoreRaw) || maxScoreRaw < 0 || maxScoreRaw > 100))) {
    return res.status(400).json({ error: "score filters must be numbers from 0 to 100" });
  }
  const selectedIds = typeof ids === "string" ? ids.split(",").map((id) => id.trim()).filter(Boolean) : undefined;
  const parseFlag = (value: string | string[] | undefined) => value === "true" ? true : value === "false" ? false : undefined;
  const phoneFlag = parseFlag(typeof hasPhone === "string" ? hasPhone : undefined);
  const addressFlag = parseFlag(typeof hasAddress === "string" ? hasAddress : undefined);
  const leads = await prisma.lead.findMany({
    where: {
      ...(selectedIds?.length ? { id: { in: selectedIds } } : {}),
      ...(typeof status === "string" ? { status } : {}),
      ...(typeof category === "string" ? { category } : {}),
      ...(minScoreRaw !== undefined || maxScoreRaw !== undefined ? { score: { ...(minScoreRaw !== undefined ? { gte: minScoreRaw } : {}), ...(maxScoreRaw !== undefined ? { lte: maxScoreRaw } : {}) } } : {}),
      ...(phoneFlag === true ? { phone: { not: null } } : phoneFlag === false ? { phone: null } : {}),
      ...(addressFlag === true ? { address: { not: null } } : addressFlag === false ? { address: null } : {}),
    },
    orderBy: { score: "desc" },
  });

  const header = [
    "name",
    "category",
    "address",
    "phone",
    "website_raw",
    "score",
    "status",
    "maps_url",
    "created_at",
  ];
  const rows = leads.map((l) =>
    [l.name, l.category, l.address, l.phone, l.websiteRaw, l.score, l.status, l.mapsUrl, l.createdAt.toISOString()]
      .map(csvEscape)
      .join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=leads.csv");
  return res.status(200).send(csv);
}
