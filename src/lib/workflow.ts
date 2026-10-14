const LEAD_NEXT: Record<string, string | undefined> = {
  NEW: "QUALIFIED",
  QUALIFIED: "DRAFTED",
  DRAFTED: "APPROVED",
  APPROVED: "SENT",
  SENT: "REPLIED",
  REPLIED: "WON",
  WON: "CLOSED",
};

const DRAFT_NEXT: Record<string, string | undefined> = {
  DRAFT: "APPROVED",
  APPROVED: "SENT",
  SENT: "REPLIED",
  REPLIED: "CLOSED",
};

export function canChangeLeadStatus(current: string, next: string): boolean {
  return current === next || (next === "DNC" && current !== "DNC") || LEAD_NEXT[current] === next;
}

export function canChangeDraftStatus(current: string, next: string): boolean {
  return current === next || DRAFT_NEXT[current] === next;
}
