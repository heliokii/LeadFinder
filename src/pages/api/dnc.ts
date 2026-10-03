import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";
import { normalizePhone } from "@/lib/normalize";
import { DEFAULT_COUNTRY } from "@/lib/config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureDb();
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Database unavailable" });
  }

  if (req.method === "GET") {
    const entries = await prisma.doNotContact.findMany({ orderBy: { createdAt: "desc" } });
    return res.status(200).json({ entries });
  }

  if (req.method === "POST") {
    const { phone, email, name, reason, country } = req.body ?? {};
    if (!phone && !email) {
      return res.status(400).json({ error: "Provide at least a phone or email" });
    }
    const entry = await prisma.doNotContact.create({
      data: {
        phone: phone ? normalizePhone(phone, country || DEFAULT_COUNTRY) ?? phone : undefined,
        email: typeof email === "string" && email.trim() ? email.trim() : undefined,
        name: typeof name === "string" && name.trim() ? name.trim() : undefined,
        reason: typeof reason === "string" && reason.trim() ? reason.trim() : undefined,
      },
    });
    await safeEvent({ type: "DNC_ADDED", message: name || phone || email });
    return res.status(201).json({ entry });
  }

  return res.status(405).json({ error: "Use GET or POST" });
}
