-- RLS para dados operacionais críticos. O runtime define a arena com SET LOCAL
-- dentro de cada transação, evitando vazamento entre conexões do pool.
CREATE OR REPLACE FUNCTION public.current_arena_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.arena_id', true), '');
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arena_runtime') THEN
    CREATE ROLE arena_runtime NOINHERIT NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO arena_runtime;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO arena_runtime;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO arena_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO arena_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO arena_runtime;

ALTER TABLE "FinancialEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialEntry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "FinancialSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialSettlement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Comanda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comanda" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ComandaItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComandaItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SalePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalePayment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleOccurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleOccurrence" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleParticipant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleOccurrenceCourt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleOccurrenceCourt" FORCE ROW LEVEL SECURITY;

CREATE POLICY "arena_scope_financial_entry" ON "FinancialEntry"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());
CREATE POLICY "arena_scope_financial_settlement" ON "FinancialSettlement"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());
CREATE POLICY "arena_scope_comanda" ON "Comanda"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());
CREATE POLICY "arena_scope_sale" ON "Sale"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());
CREATE POLICY "arena_scope_schedule_occurrence" ON "ScheduleOccurrence"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());

CREATE POLICY "arena_scope_comanda_item" ON "ComandaItem"
  USING (EXISTS (SELECT 1 FROM "Comanda" WHERE "Comanda"."id" = "ComandaItem"."comandaId" AND "Comanda"."arenaId" = public.current_arena_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM "Comanda" WHERE "Comanda"."id" = "ComandaItem"."comandaId" AND "Comanda"."arenaId" = public.current_arena_id()));
CREATE POLICY "arena_scope_sale_payment" ON "SalePayment"
  USING (EXISTS (SELECT 1 FROM "Sale" WHERE "Sale"."id" = "SalePayment"."saleId" AND "Sale"."arenaId" = public.current_arena_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM "Sale" WHERE "Sale"."id" = "SalePayment"."saleId" AND "Sale"."arenaId" = public.current_arena_id()));
CREATE POLICY "arena_scope_sale_item" ON "SaleItem"
  USING (EXISTS (SELECT 1 FROM "Sale" WHERE "Sale"."id" = "SaleItem"."saleId" AND "Sale"."arenaId" = public.current_arena_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM "Sale" WHERE "Sale"."id" = "SaleItem"."saleId" AND "Sale"."arenaId" = public.current_arena_id()));
CREATE POLICY "arena_scope_schedule_participant" ON "ScheduleParticipant"
  USING (EXISTS (SELECT 1 FROM "ScheduleOccurrence" WHERE "ScheduleOccurrence"."id" = "ScheduleParticipant"."occurrenceId" AND "ScheduleOccurrence"."arenaId" = public.current_arena_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM "ScheduleOccurrence" WHERE "ScheduleOccurrence"."id" = "ScheduleParticipant"."occurrenceId" AND "ScheduleOccurrence"."arenaId" = public.current_arena_id()));
CREATE POLICY "arena_scope_schedule_occurrence_court" ON "ScheduleOccurrenceCourt"
  USING (EXISTS (SELECT 1 FROM "ScheduleOccurrence" WHERE "ScheduleOccurrence"."id" = "ScheduleOccurrenceCourt"."occurrenceId" AND "ScheduleOccurrence"."arenaId" = public.current_arena_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM "ScheduleOccurrence" WHERE "ScheduleOccurrence"."id" = "ScheduleOccurrenceCourt"."occurrenceId" AND "ScheduleOccurrence"."arenaId" = public.current_arena_id()));
