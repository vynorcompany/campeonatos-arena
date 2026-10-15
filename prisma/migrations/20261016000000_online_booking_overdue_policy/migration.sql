-- Null keeps the policy disabled until an arena explicitly configures it.
ALTER TABLE "Arena" ADD COLUMN "onlineBookingOverdueBlockDays" INTEGER;
