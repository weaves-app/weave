CREATE TABLE "NotificationRequestBudget" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "nextAllowedAt" TIMESTAMPTZ NOT NULL,
  "expiresAt" TIMESTAMPTZ,
  CONSTRAINT "NotificationRequestBudget_expiry_after_cooldown" CHECK ("expiresAt" IS NULL OR "expiresAt" >= "nextAllowedAt"),
  CONSTRAINT "NotificationRequestBudget_only_global_nonexpiring" CHECK ("expiresAt" IS NOT NULL OR right(key,9) = ':provider' OR right(key,8) = ':cleanup')
);
CREATE INDEX "NotificationRequestBudget_expiresAt_idx" ON "NotificationRequestBudget"("expiresAt");
