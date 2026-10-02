import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";
import { geocodeArea, searchBusinesses, buildOsmMapsUrl, type BusinessCategory } from "@/lib/osm";
import { hasNoWebsite, normalizePhone } from "@/lib/normalize";
import { DEFAULT_COUNTRY } from "@/lib/config";
import { scoreLead } from "@/lib/scoring";

const VALID_CATEGORIES: BusinessCategory[] = ["dentist", "real_estate", "lawyer", "law_firm"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { area, radiusKm, category, keywords, country } = req.body ?? {};

  if (!area || typeof area !== "string") {
    return res.status(400).json({ error: "area is required" });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of ${VALID_CATEGORIES.join(", ")}` });
  }
  const radius = Number(radiusKm) || 5;
  const defaultCountry = (country as string) || DEFAULT_COUNTRY;

  try {
    const geo = await geocodeArea(area);
    const raw = await searchBusinesses({
      lat: geo.lat,
      lon: geo.lon,
      radiusKm: radius,
      category,
      keywords,
    });

    const created: string[] = [];
    const skippedHasWebsite: string[] = [];

    for (const biz of raw) {
      const noWebsite = await hasNoWebsite(biz.website);
      if (!noWebsite) {
        skippedHasWebsite.push(biz.osmId);
        continue;
      }

      const phoneNormalized = normalizePhone(biz.phone, defaultCountry);

      // Skip anything already on the do-not-contact list, matched by phone.
      if (phoneNormalized) {
        const dnc = await prisma.doNotContact.findFirst({ where: { phone: phoneNormalized } });
        if (dnc) continue;
      }

      const { score, flags } = scoreLead(biz);

      await prisma.lead.upsert({
        where: { osmId: biz.osmId },
        create: {
          osmId: biz.osmId,
          name: biz.name,
          category: biz.category,
          address: biz.address,
          phone: biz.phone,
          phoneNormalized,
          websiteRaw: biz.website,
          openingHours: biz.openingHours,
          lat: biz.lat,
          lon: biz.lon,
          mapsUrl: buildOsmMapsUrl(biz.osmId),
          score,
          scoreFlags: JSON.stringify(flags),
        },
        // Re-running a search refreshes score/contact info but never
        // resets status/notes you've already set on an existing lead.
        update: {
          phone: biz.phone,
          phoneNormalized,
          openingHours: biz.openingHours,
          score,
          scoreFlags: JSON.stringify(flags),
        },
      });

      created.push(biz.osmId);
    }

    await prisma.searchQuery.create({
      data: { area, radiusKm: radius, category, keywords, resultCount: created.length },
    });
    await prisma.event.create({
      data: {
        type: "SEARCH",
        message: `area="${area}" category=${category} radiusKm=${radius}: ${created.length} no-website leads, ${skippedHasWebsite.length} skipped (has website)`,
      },
    });

    return res.status(200).json({
      area: geo.displayName,
      totalFound: raw.length,
      noWebsiteCount: created.length,
      skippedHasWebsiteCount: skippedHasWebsite.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.event.create({ data: { type: "ERROR", message: `search: ${message}` } });
    return res.status(500).json({ error: message });
  }
}
