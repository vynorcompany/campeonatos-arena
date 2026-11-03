ALTER TABLE "SponsorshipPlan" ADD CONSTRAINT "SponsorshipPlan_required_schedule" CHECK (kind <> 'FIXED_COURT' OR (weekday IS NOT NULL AND "startMinute" IS NOT NULL));
