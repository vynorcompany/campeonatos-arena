ALTER TABLE "Tournament" ADD COLUMN "showInEventRadar" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Tournament_showInEventRadar_registrationPhase_idx" ON "Tournament"("showInEventRadar", "registrationPhase");
