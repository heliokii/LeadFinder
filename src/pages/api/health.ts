import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb } from "@/lib/db";

/** Liveness probe for localhost + Vercel: confirms the DB is reachable. */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureDb();
    const [leads, dnc] = await Promise.all([
      prisma.lead.count(),
      prisma.doNotContact.count(),
    ]);
    return res.status(200).json({
      ok: true,
      leads,
      dnc,
      db: process.env.VERCEL ? "vercel:/tmp (ephemeral)" : "local",
      hasOsmUserAgent: Boolean(process.env.OSM_USER_AGENT),
      time: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Database unavailable",
    });
  }
}
