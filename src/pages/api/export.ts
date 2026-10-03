import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb } from "@/lib/db";

function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  try {
    await ensureDb();
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Database unavailable" });
  }

  const leads = await prisma.lead.findMany({ orderBy: { score: "desc" } });

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
