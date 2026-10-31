ALTER TABLE "WhatsAppMessage" ADD COLUMN "mediaFileName" TEXT NOT NULL DEFAULT '';
UPDATE "WhatsAppMessage" SET "mediaFileName" = left(regexp_replace(COALESCE("providerPayload"->'documentMessage'->>'fileName', ''), '[\x00-\x1F\x7F]', '', 'g'), 240)
WHERE "mediaType" = 'DOCUMENT' AND "providerPayload" IS NOT NULL;
