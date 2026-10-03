import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb } from "@/lib/db";
import { generatePaymentMessage } from "@/lib/payment";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  try {
    await ensureDb();
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Database unavailable" });
  }

  const id = req.query.id as string;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ error: "Not found" });

  const amount = req.query.amount ? Number(req.query.amount) : undefined;
  const currency = typeof req.query.currency === "string" ? req.query.currency : undefined;

  const message = generatePaymentMessage({ amount, currency });
  return res.status(200).json({ message });
}
