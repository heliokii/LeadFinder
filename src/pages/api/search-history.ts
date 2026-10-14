import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureDb();

    if (req.method === "DELETE") {
      const id = typeof req.query.id === "string" ? req.query.id : typeof req.body?.id === "string" ? req.body.id : "";
      if (!id.trim()) return res.status(400).json({ error: "Search history id is required" });

      const deleted = await prisma.$transaction(async (tx) => {
        const record = await tx.searchQuery.findUnique({ where: { id } });
        if (!record) return null;
        await tx.searchQuery.delete({ where: { id } });
        await tx.event.create({
          data: { type: "SEARCH_HISTORY_DELETED", message: `${record.area} / ${record.category}` },
        });
        return record;
      });

      if (!deleted) return res.status(404).json({ error: "Search history entry not found" });
      return res.status(200).json({ deletedId: deleted.id });
    }

    if (req.method !== "GET") return res.status(405).json({ error: "Use GET or DELETE" });
    const history = await prisma.searchQuery.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    await safeEvent({ type: "SEARCH_HISTORY_VIEWED", message: `${history.length} searches` });
    return res.status(200).json({ history });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Could not load search history" });
  }
}
