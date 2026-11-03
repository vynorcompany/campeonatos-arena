ALTER TABLE "SponsorshipPlan" ADD COLUMN "dueDays" INTEGER[] NOT NULL DEFAULT '{}', ADD COLUMN "prorateFifthWeek" BOOLEAN NOT NULL DEFAULT false;
UPDATE "SponsorshipPlan" SET "dueDays"=ARRAY["dueDay"];
ALTER TABLE "SponsorshipPlan" DROP CONSTRAINT "SponsorshipPlan_required_schedule";
ALTER TABLE "SponsorshipPlan" DROP CONSTRAINT "SponsorshipPlan_valid_configuration";
ALTER TABLE "SponsorshipPlan" ADD CONSTRAINT "SponsorshipPlan_valid_configuration" CHECK (kind IN ('SPONSORSHIP','FIXED_COURT') AND "dueDay" BETWEEN 1 AND 28 AND "dueDays" <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]);
ALTER TABLE "ScheduleBookingSeries" ADD COLUMN "dueDay" INTEGER, ADD COLUMN "prorateFifthWeek" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ScheduleBookingSeries" ADD CONSTRAINT "ScheduleBookingSeries_due_day" CHECK ("dueDay" BETWEEN 1 AND 28);
ALTER TABLE "FinancialEntry" ADD COLUMN "boletoQueueCanceledAt" TIMESTAMP(3), ADD COLUMN "onlinePaymentCanceledAt" TIMESTAMP(3);
