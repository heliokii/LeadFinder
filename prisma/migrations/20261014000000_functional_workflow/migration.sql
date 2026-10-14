ALTER TABLE "Draft" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
UPDATE "Draft" SET "updatedAt" = "createdAt" WHERE "updatedAt" = '1970-01-01 00:00:00';

CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "note" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FollowUp_leadId_idx" ON "FollowUp"("leadId");
CREATE INDEX "FollowUp_dueAt_idx" ON "FollowUp"("dueAt");
CREATE INDEX "FollowUp_completedAt_idx" ON "FollowUp"("completedAt");
