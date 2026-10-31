ALTER TABLE "Arena" ADD COLUMN "checkinMode" TEXT NOT NULL DEFAULT 'SELF';
ALTER TABLE "Arena" ADD CONSTRAINT "Arena_checkinMode_check" CHECK ("checkinMode" IN ('SELF', 'GROUP'));
