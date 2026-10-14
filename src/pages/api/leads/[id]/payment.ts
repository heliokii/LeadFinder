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

  const id = typeof req.query.id === "string" ? req.query.id : undefined;
  if (!id) return res.status(400).json({ error: "A single lead id is required" });
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return res.status(404).json({ error: "Not found" });
  if (lead.status !== "WON") return res.status(409).json({ error: "Payment details are available only for WON leads" });

  const amountRaw = typeof req.query.amount === "string" ? Number(req.query.amount) : undefined;
  if (amountRaw !== undefined && (!Number.isFinite(amountRaw) || amountRaw < 0)) {
    return res.status(400).json({ error: "amount must be a non-negative number" });
  }
  const amount = amountRaw;
  const currency = typeof req.query.currency === "string" && /^[A-Za-z]{3}$/.test(req.query.currency)
    ? req.query.currency
    : undefined;

  const message = generatePaymentMessage({ amount, currency });
  return res.status(200).json({ message });
}
