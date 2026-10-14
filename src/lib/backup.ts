export const BACKUP_VERSION = 1;

export interface BackupData {
  leads: Array<Record<string, unknown>>;
  drafts: Array<Record<string, unknown>>;
  followUps: Array<Record<string, unknown>>;
  doNotContacts: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  searchQueries: Array<Record<string, unknown>>;
}

export interface BackupFile {
  version: number;
  exportedAt: string;
  data: BackupData;
}

const collections = ["leads", "drafts", "followUps", "doNotContacts", "events", "searchQueries"] as const;

export function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== BACKUP_VERSION || typeof candidate.exportedAt !== "string" || !candidate.data || typeof candidate.data !== "object") return false;
  const data = candidate.data as Record<string, unknown>;
  return collections.every((name) => Array.isArray(data[name]) && (data[name] as unknown[]).every((item) => item && typeof item === "object"));
}

export function parseBackupDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIso(value: Date): string {
  return value.toISOString();
}
