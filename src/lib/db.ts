import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton so hot reloads don't open a new
// SQLite connection on every file save.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  __dbEnsured?: Promise<void>;
};

function resolveDatabaseUrl(): string {
  // On Vercel the filesystem is read-only except /tmp, so a
  // DATABASE_URL like file:./dev.db cannot be created there.
  // Rewrite relative file: URLs to /tmp when running on Vercel unless
  // the user already pointed at /tmp or a hosted DB.
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  if (process.env.VERCEL && raw.startsWith("file:")) {
    const path = raw.slice("file:".length);
    if (!path.startsWith("/tmp")) {
      const file = path.split("/").pop() || "leadfinder.db";
      const tmpUrl = `file:/tmp/${file}`;
      process.env.DATABASE_URL = tmpUrl;
      return tmpUrl;
    }
  }
  return raw;
}

resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Ensure SQLite tables exist at runtime.
 *
 * `prisma migrate deploy` runs at build/dev time on localhost, but on Vercel
 * the writable DB lives at /tmp and starts empty on every cold boot / deploy.
 * Running CREATE TABLE IF NOT EXISTS keeps both environments working without
 * requiring a Postgres instance. Safe to call on every request (cached).
 */
export function ensureDb(): Promise<void> {
  if (!globalForPrisma.__dbEnsured) {
    globalForPrisma.__dbEnsured = (async () => {
      const stmts = [
        `CREATE TABLE IF NOT EXISTS "Lead" ("id" TEXT NOT NULL PRIMARY KEY, "osmId" TEXT NOT NULL, "source" TEXT NOT NULL DEFAULT 'osm', "name" TEXT NOT NULL, "category" TEXT NOT NULL, "address" TEXT, "phone" TEXT, "phoneNormalized" TEXT, "websiteRaw" TEXT, "openingHours" TEXT, "lat" REAL, "lon" REAL, "mapsUrl" TEXT, "score" INTEGER NOT NULL DEFAULT 0, "scoreFlags" TEXT, "status" TEXT NOT NULL DEFAULT 'NEW', "notes" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "Lead_osmId_key" ON "Lead"("osmId")`,
        `CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status")`,
        `CREATE INDEX IF NOT EXISTS "Lead_category_idx" ON "Lead"("category")`,
        `CREATE INDEX IF NOT EXISTS "Lead_phoneNormalized_idx" ON "Lead"("phoneNormalized")`,
        `CREATE TABLE IF NOT EXISTS "Draft" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT NOT NULL, "variant" TEXT NOT NULL, "channel" TEXT NOT NULL, "content" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "approvedAt" DATETIME, "sentAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Draft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
        `CREATE INDEX IF NOT EXISTS "Draft_leadId_idx" ON "Draft"("leadId")`,
        `CREATE INDEX IF NOT EXISTS "Draft_status_idx" ON "Draft"("status")`,
        `CREATE TABLE IF NOT EXISTS "DoNotContact" ("id" TEXT NOT NULL PRIMARY KEY, "phone" TEXT, "email" TEXT, "name" TEXT, "reason" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE INDEX IF NOT EXISTS "DoNotContact_phone_idx" ON "DoNotContact"("phone")`,
        `CREATE INDEX IF NOT EXISTS "DoNotContact_email_idx" ON "DoNotContact"("email")`,
        `CREATE TABLE IF NOT EXISTS "Event" ("id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT, "type" TEXT NOT NULL, "message" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Event_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE)`,
        `CREATE INDEX IF NOT EXISTS "Event_type_idx" ON "Event"("type")`,
        `CREATE TABLE IF NOT EXISTS "SearchQuery" ("id" TEXT NOT NULL PRIMARY KEY, "area" TEXT NOT NULL, "radiusKm" REAL NOT NULL, "category" TEXT NOT NULL, "keywords" TEXT, "resultCount" INTEGER NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      ];
      for (const sql of stmts) {
        await prisma.$executeRawUnsafe(sql);
      }
    })().catch((err) => {
      // Reset cache so the next request retries instead of sticking to failure.
      globalForPrisma.__dbEnsured = undefined;
      console.error("[db] ensureDb failed:", err);
      throw err;
    });
  }
  return globalForPrisma.__dbEnsured;
}

/** Best-effort audit log — never let logging break the main request. */
export async function safeEvent(data: { leadId?: string | null; type: string; message?: string }) {
  try {
    await prisma.event.create({
      data: { leadId: data.leadId ?? undefined, type: data.type, message: data.message },
    });
  } catch (err) {
    console.error("[db] safeEvent failed:", err);
  }
}

