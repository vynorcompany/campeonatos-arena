-- Preserve closed sessions while allowing another opening on the same day.
DROP INDEX "CashRegister_arenaId_referenceDate_key";
CREATE UNIQUE INDEX "CashRegister_one_open_per_day"
ON "CashRegister"("arenaId", "referenceDate") WHERE "status" = 'OPEN';
