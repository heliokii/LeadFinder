export function parseDueAt(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/[;,]/g, (char) => `\\${char}`).replace(/\r?\n/g, "\\n");
}

export function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildFollowUpIcs(input: { id: string; leadName: string; note: string; dueAt: Date; createdAt: Date }): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LeadFinder//FollowUps//EN",
    "BEGIN:VEVENT",
    `UID:leadfinder-${input.id}@local`,
    `DTSTAMP:${formatIcsDate(input.createdAt)}`,
    `DTSTART:${formatIcsDate(input.dueAt)}`,
    `SUMMARY:${escapeIcsText(`Follow up: ${input.leadName}`)}`,
    `DESCRIPTION:${escapeIcsText(input.note)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
