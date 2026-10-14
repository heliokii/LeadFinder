import { describe, expect, it } from "vitest";
import { BACKUP_VERSION, isBackupFile, parseBackupDate } from "@/lib/backup";

const emptyData = { leads: [], drafts: [], followUps: [], doNotContacts: [], events: [], searchQueries: [] };

describe("backup validation", () => {
  it("accepts the current version and rejects malformed snapshots", () => {
    expect(isBackupFile({ version: BACKUP_VERSION, exportedAt: "2026-10-14T00:00:00.000Z", data: emptyData })).toBe(true);
    expect(isBackupFile({ version: 99, exportedAt: "2026-10-14T00:00:00.000Z", data: emptyData })).toBe(false);
  });

  it("parses only valid backup dates", () => {
    expect(parseBackupDate("2026-10-14T00:00:00.000Z")).not.toBeNull();
    expect(parseBackupDate("bad-date")).toBeNull();
  });
});
