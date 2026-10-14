import type { Lead } from "@prisma/client";
import { getCategory } from "./categories";

/**
 * Pure template-based generation — no LLM call, no API cost, fully
 * deterministic and auditable. Every draft this produces has status
 * DRAFT and is never sent by this code; a human (you) reviews, edits,
 * and marks it APPROVED before it's ever copied out.
 *
 * If you later want more natural variation, this is the one place to
 * swap in a call to an LLM — keep the same three-variant, opt-out-line
 * contract so the rest of the app doesn't need to change.
 */

export type DraftVariant = "ULTRA_SHORT" | "NORMAL" | "VALUE_FIRST";

const OPT_OUT_LINE = "Reply STOP or let me know and I won't follow up again.";

function cityFromAddress(address: string | null): string {
  if (!address) return "the area";
  const parts = address.split(",").map((p) => p.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

function pick<T>(arr: readonly T[], n: number): T[] {
  return arr.slice(0, n);
}

export function generateDraft(lead: Lead, variant: DraftVariant): string {
  const category = getCategory(lead.category);
  const categoryLabel = category?.copyLabel ?? "business";
  const city = cityFromAddress(lead.address);
  const suggestions = category?.suggestions ?? ["a simple website", "a contact form"];

  switch (variant) {
    case "ULTRA_SHORT": {
      const prefix =
        `Hi ${lead.name} — noticed your business listing doesn't have a website link. ` +
        `I build simple, fast sites for ${categoryLabel}s in ${city}. Worth a quick look?`;
      const suffix = ` ${OPT_OUT_LINE}`;
      if (prefix.length + suffix.length <= 300) return prefix + suffix;
      const available = Math.max(0, 300 - suffix.length - 3);
      return `${prefix.slice(0, available)}...${suffix}`;
    }

    case "NORMAL":
      return [
        `Hi ${lead.name} team,`,
        ``,
        `I came across your listing while looking at ${categoryLabel}s in ${city}, and noticed you don't currently have a website linked.`,
        `People often look for a website before deciding whether to call, so it can be an easy way to pick up more inquiries.`,
        `I build simple, fast, mobile-friendly websites and would be happy to put together a free mockup so you can see what it'd look like before committing to anything.`,
        `No pressure either way — ${OPT_OUT_LINE}`,
      ].join("\n");

    case "VALUE_FIRST":
      return [
        `Hi ${lead.name} team,`,
        ``,
        `Quick note — I looked at your public business listing and a couple of things stood out that a simple website would help with:`,
        ...pick(suggestions, 3).map((s) => `  • ${s}`),
        ``,
        `I put together websites for local ${categoryLabel}s and can share a free mockup based on what's already public about your business, no cost or commitment.`,
        OPT_OUT_LINE,
      ].join("\n");
  }
}

export function generateAllVariants(lead: Lead): Array<{ variant: DraftVariant; content: string }> {
  return (["ULTRA_SHORT", "NORMAL", "VALUE_FIRST"] as DraftVariant[]).map((variant) => ({
    variant,
    content: generateDraft(lead, variant),
  }));
}
