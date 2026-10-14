export const STATUS_COLORS: Record<string, string> = {
  NEW: "#344054",
  QUALIFIED: "#175cd3",
  DRAFTED: "#b54708",
  APPROVED: "#6941c6",
  SENT: "#1a7f37",
  REPLIED: "#0e7490",
  WON: "#111827",
  CLOSED: "#6b7280",
  DNC: "#b42318",
};

export const STATUS_OPTIONS = Object.keys(STATUS_COLORS);

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? STATUS_COLORS.NEW;
}
