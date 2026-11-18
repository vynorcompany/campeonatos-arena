-- Existing unpaid local/manual registrations become receivables too. Paid receipts,
-- review/refund cases, canceled registrations and expired online holds stay untouched.
-- Lock the parent registration, as receipts do, to avoid racing an in-flight payment.
DO $$
DECLARE registration RECORD;
BEGIN
  FOR registration IN
    SELECT r.*, t."arenaId", t.name AS "eventName"
    FROM "PublicTournamentRegistration" r JOIN "Tournament" t ON t.id = r."tournamentId"
    WHERE r."amountCents" > 0 AND r."paymentStatus" = 'PENDING'
      AND r.status IN ('CONFIRMED', 'PENDING_PAYMENT')
      AND r."paymentProvider" IN ('MANUAL', 'PAY_ON_SITE')
    ORDER BY r.id FOR UPDATE OF r
  LOOP
    PERFORM set_config('app.arena_id', registration."arenaId", true);
    INSERT INTO "FinancialEntry" (id, "arenaId", "playerId", "bankAccountId", type, category, description, "counterpartyName", "amountCents", status, "dueDate", "competenceDate", source, "externalReference", "createdAt", "updatedAt")
    SELECT 'event_receivable_' || registration.id, registration."arenaId", registration."leadPlayerId", registration."paymentBankAccountId", 'REVENUE', 'Inscrições de torneios',
      'Inscrição · ' || registration."eventName" || ' · ' || concat_ws(' / ', nullif(registration."leadName", ''), nullif(registration."partnerName", ''), nullif(registration."thirdName", '')),
      concat_ws(' / ', nullif(registration."leadName", ''), nullif(registration."partnerName", ''), nullif(registration."thirdName", '')),
      registration."amountCents", 'PENDING', registration."createdAt", registration."createdAt", 'TOURNAMENT_REGISTRATION', registration.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM "FinancialEntry" e WHERE e."arenaId" = registration."arenaId" AND e.source = 'TOURNAMENT_REGISTRATION' AND e."externalReference" = registration.id)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
