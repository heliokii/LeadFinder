import type { NextApiRequest, NextApiResponse } from "next";
import { prisma, ensureDb, safeEvent } from "@/lib/db";
import { BACKUP_VERSION, isBackupFile, parseBackupDate, type BackupFile } from "@/lib/backup";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

function requiredString(record: Record<string, unknown>, key: string): string | null {
  return typeof record[key] === "string" && record[key] ? record[key] as string : null;
}

function dateValue(record: Record<string, unknown>, key: string, required = false): Date | null {
  const value = parseBackupDate(record[key]);
  return value || (!required && record[key] == null ? null : null);
}

function validateBackup(data: BackupFile): string | null {
  if (!parseBackupDate(data.exportedAt)) return "exportedAt must be a valid date";
  for (const lead of data.data.leads) {
    if (!requiredString(lead, "id") || !requiredString(lead, "osmId") || !requiredString(lead, "name") || !requiredString(lead, "category")) return "Each lead needs id, osmId, name, and category";
    if (!dateValue(lead, "createdAt", true) || !dateValue(lead, "updatedAt", true)) return "Each lead needs valid createdAt and updatedAt dates";
  }
  for (const draft of data.data.drafts) {
    if (!requiredString(draft, "id") || !requiredString(draft, "leadId") || !requiredString(draft, "variant") || !requiredString(draft, "channel") || typeof draft.content !== "string") return "Each draft has invalid required fields";
    if (!dateValue(draft, "createdAt", true)) return "Each draft needs a valid createdAt date";
  }
  for (const followUp of data.data.followUps) {
    if (!requiredString(followUp, "id") || !requiredString(followUp, "leadId") || !requiredString(followUp, "note") || !dateValue(followUp, "dueAt", true) || !dateValue(followUp, "createdAt", true)) return "Each follow-up has invalid required fields";
  }
  for (const entry of data.data.doNotContacts) {
    if (!requiredString(entry, "id") || !dateValue(entry, "createdAt", true)) return "Each DNC entry needs id and a valid createdAt date";
  }
  for (const event of data.data.events) {
    if (!requiredString(event, "id") || !requiredString(event, "type") || !dateValue(event, "createdAt", true)) return "Each event needs id, type, and a valid createdAt date";
  }
  for (const search of data.data.searchQueries) {
    if (!requiredString(search, "id") || !requiredString(search, "area") || !requiredString(search, "category") || !dateValue(search, "createdAt", true)) return "Each search record has invalid required fields";
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureDb();
    if (req.method === "GET") {
      const [leads, drafts, followUps, doNotContacts, events, searchQueries] = await Promise.all([
        prisma.lead.findMany(), prisma.draft.findMany(), prisma.followUp.findMany(), prisma.doNotContact.findMany(), prisma.event.findMany(), prisma.searchQuery.findMany(),
      ]);
      const backup: BackupFile = { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: { leads, drafts, followUps, doNotContacts, events, searchQueries } };
      await safeEvent({ type: "BACKUP_EXPORTED", message: `${leads.length} leads` });
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=leadfinder-backup.json");
      return res.status(200).json(backup);
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST" });
    const { mode, backup } = req.body ?? {};
    if (mode !== "merge" && mode !== "replace") return res.status(400).json({ error: "mode must be merge or replace" });
    if (!isBackupFile(backup)) return res.status(400).json({ error: "Unsupported or malformed backup" });
    const validationError = validateBackup(backup);
    if (validationError) return res.status(400).json({ error: validationError });
    const result = await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        await tx.followUp.deleteMany();
        await tx.draft.deleteMany();
        await tx.event.deleteMany();
        await tx.doNotContact.deleteMany();
        await tx.searchQuery.deleteMany();
        await tx.lead.deleteMany();
      }
      const leadIds = new Map<string, string>();
      for (const raw of backup.data.leads) {
        const lead = raw as any;
        const saved = await tx.lead.upsert({ where: { osmId: lead.osmId }, create: { ...lead, createdAt: new Date(lead.createdAt), updatedAt: new Date(lead.updatedAt) }, update: { source: lead.source, name: lead.name, category: lead.category, address: lead.address, phone: lead.phone, phoneNormalized: lead.phoneNormalized, websiteRaw: lead.websiteRaw, openingHours: lead.openingHours, lat: lead.lat, lon: lead.lon, mapsUrl: lead.mapsUrl, score: lead.score, scoreFlags: lead.scoreFlags, status: lead.status, notes: lead.notes, updatedAt: new Date(lead.updatedAt) } });
        leadIds.set(lead.id, saved.id);
      }
      for (const raw of backup.data.drafts) {
        const draft = raw as any;
        const leadId = leadIds.get(draft.leadId);
        if (!leadId) continue;
        await tx.draft.upsert({ where: { id: draft.id }, create: { ...draft, leadId, createdAt: new Date(draft.createdAt), updatedAt: new Date(draft.updatedAt ?? draft.createdAt), approvedAt: draft.approvedAt ? new Date(draft.approvedAt) : null, sentAt: draft.sentAt ? new Date(draft.sentAt) : null }, update: { content: draft.content, channel: draft.channel, variant: draft.variant, status: draft.status, leadId, updatedAt: new Date(draft.updatedAt ?? draft.createdAt), approvedAt: draft.approvedAt ? new Date(draft.approvedAt) : null, sentAt: draft.sentAt ? new Date(draft.sentAt) : null } });
      }
      for (const raw of backup.data.followUps) {
        const followUp = raw as any;
        const leadId = leadIds.get(followUp.leadId);
        if (!leadId) continue;
        await tx.followUp.upsert({ where: { id: followUp.id }, create: { id: followUp.id, leadId, dueAt: new Date(followUp.dueAt), note: followUp.note, completedAt: followUp.completedAt ? new Date(followUp.completedAt) : null, createdAt: new Date(followUp.createdAt) }, update: { leadId, dueAt: new Date(followUp.dueAt), note: followUp.note, completedAt: followUp.completedAt ? new Date(followUp.completedAt) : null } });
      }
      for (const raw of backup.data.doNotContacts) {
        const dnc = raw as any;
        if (!dnc.phone && !dnc.email) continue;
        const existing = await tx.doNotContact.findFirst({ where: { OR: [{ phone: dnc.phone ?? undefined }, { email: dnc.email ?? undefined }] } });
        if (!existing) await tx.doNotContact.create({ data: { id: dnc.id, phone: dnc.phone, email: dnc.email, name: dnc.name, reason: dnc.reason, createdAt: new Date(dnc.createdAt) } });
      }
      for (const raw of backup.data.events) {
        const event = raw as any;
        if (mode === "merge" && await tx.event.findUnique({ where: { id: event.id } })) continue;
        await tx.event.create({ data: { id: event.id, leadId: event.leadId ? leadIds.get(event.leadId) : undefined, type: event.type, message: event.message, createdAt: new Date(event.createdAt) } });
      }
      for (const raw of backup.data.searchQueries) {
        const search = raw as any;
        if (mode === "merge" && await tx.searchQuery.findUnique({ where: { id: search.id } })) continue;
        await tx.searchQuery.create({ data: { id: search.id, area: search.area, radiusKm: search.radiusKm, category: search.category, keywords: search.keywords, resultCount: search.resultCount, createdAt: new Date(search.createdAt) } });
      }
      return { leads: leadIds.size };
    });
    await safeEvent({ type: "BACKUP_IMPORTED", message: `${result.leads} leads (${mode})` });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Backup request failed" });
  }
}
