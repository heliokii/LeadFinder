import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/normalize";
import { DEFAULT_COUNTRY } from "@/lib/config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        email,
        name,
        reason,
      },
    });
    await prisma.event.create({ data: { type: "DNC_ADDED", message: name || phone || email } });
    return res.status(201).json({ entry });
  }

  return res.status(405).json({ error: "Use GET or POST" });
}
