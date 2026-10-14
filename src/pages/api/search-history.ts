import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });
  try {
    await ensureDb();
    const history = await prisma.searchQuery.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    await safeEvent({ type: "SEARCH_HISTORY_VIEWED", message: `${history.length} searches` });
    return res.status(200).json({ history });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Could not load search history" });
  }
}
