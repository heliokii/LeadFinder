import type { Lead } from "@prisma/client";

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

const CATEGORY_LABEL: Record<string, string> = {
  dentist: "dental practice",
  real_estate: "real estate business",
  lawyer: "law practice",
  law_firm: "law firm",
};

const VALUE_SUGGESTIONS: Record<string, string[]> = {
  dentist: ["an online booking page", "a mobile-friendly services page", "Google Maps CTA button"],
  real_estate: ["a listings page that updates easily", "lead-capture contact form", "mobile speed"],
  lawyer: ["a clear practice-areas page", "an intake/contact form", "Google Maps CTA button"],
  law_firm: ["a clear practice-areas page", "an intake/contact form", "SEO basics for local search"],
};

function cityFromAddress(address: string | null): string {
  if (!address) return "the area";
  const parts = address.split(",").map((p) => p.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

export function generateDraft(lead: Lead, variant: DraftVariant): string {
  const categoryLabel = CATEGORY_LABEL[lead.category] ?? "business";
  const city = cityFromAddress(lead.address);
  const suggestions = VALUE_SUGGESTIONS[lead.category] ?? ["a simple website", "a contact form"];

  switch (variant) {
    case "ULTRA_SHORT": {
      const msg =
        `Hi ${lead.name} — noticed you don't have a website listed on Google Maps yet. ` +
        `I build simple, fast sites for ${categoryLabel}s in ${city}. Worth a quick look? ` +
        OPT_OUT_LINE;
      return msg.length <= 300 ? msg : msg.slice(0, 297) + "...";
    }

    case "NORMAL":
      return [
        `Hi ${lead.name} team,`,
        ``,
        `I came across your listing while looking at ${categoryLabel}s in ${city}, and noticed you don't currently have a website linked.`,
        `A lot of people search Google Maps first and decide whether to call based on whether there's a site to check out — so it can be an easy way to pick up more inquiries.`,
        `I build simple, fast, mobile-friendly websites and would be happy to put together a free mockup so you can see what it'd look like before committing to anything.`,
        `No pressure either way — ${OPT_OUT_LINE}`,
      ].join("\n");

    case "VALUE_FIRST":
      return [
        `Hi ${lead.name} team,`,
        ``,
        `Quick note — I looked at your Google Maps listing and a couple of things stood out that a simple website would help with:`,
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
