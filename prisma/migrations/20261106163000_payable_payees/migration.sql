ALTER TABLE "FinancialEntry" ADD COLUMN "payeeEmployeeId" TEXT, ADD COLUMN "payeeTeacherId" TEXT;
ALTER TABLE "FinancialRecurrence" ADD COLUMN "payeeEmployeeId" TEXT, ADD COLUMN "payeeTeacherId" TEXT;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_payeeEmployeeId_fkey" FOREIGN KEY ("payeeEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT "FinancialEntry_payeeTeacherId_fkey" FOREIGN KEY ("payeeTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialRecurrence" ADD CONSTRAINT "FinancialRecurrence_payeeEmployeeId_fkey" FOREIGN KEY ("payeeEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT "FinancialRecurrence_payeeTeacherId_fkey" FOREIGN KEY ("payeeTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "FinancialEntry_arenaId_payeeEmployeeId_idx" ON "FinancialEntry"("arenaId", "payeeEmployeeId");
CREATE INDEX "FinancialEntry_arenaId_payeeTeacherId_idx" ON "FinancialEntry"("arenaId", "payeeTeacherId");
CREATE INDEX "FinancialRecurrence_arenaId_payeeEmployeeId_idx" ON "FinancialRecurrence"("arenaId", "payeeEmployeeId");
CREATE INDEX "FinancialRecurrence_arenaId_payeeTeacherId_idx" ON "FinancialRecurrence"("arenaId", "payeeTeacherId");
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_one_payee" CHECK (num_nonnulls("supplierId", "payeeEmployeeId", "payeeTeacherId") <= 1);
ALTER TABLE "FinancialRecurrence" ADD CONSTRAINT "FinancialRecurrence_one_payee" CHECK (num_nonnulls("supplierId", "payeeEmployeeId", "payeeTeacherId") <= 1);

CREATE FUNCTION public.assert_payable_payee_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."payeeEmployeeId" IS NOT NULL OR NEW."payeeTeacherId" IS NOT NULL) AND NEW.type <> 'EXPENSE' THEN
    RAISE EXCEPTION 'Payee requires an expense' USING ERRCODE = '23514';
  END IF;
  IF NEW."payeeEmployeeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ArenaMember" WHERE "arenaId" = NEW."arenaId" AND "userId" = NEW."payeeEmployeeId") THEN
    RAISE EXCEPTION 'Employee belongs to another arena' USING ERRCODE = '42501';
  END IF;
  IF NEW."payeeTeacherId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Teacher" WHERE "arenaId" = NEW."arenaId" AND id = NEW."payeeTeacherId") THEN
    RAISE EXCEPTION 'Teacher belongs to another arena' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER payable_payee_scope BEFORE INSERT OR UPDATE OF "arenaId", "type", "payeeEmployeeId", "payeeTeacherId" ON "FinancialEntry" FOR EACH ROW EXECUTE FUNCTION public.assert_payable_payee_scope();
CREATE TRIGGER payable_payee_scope BEFORE INSERT OR UPDATE OF "arenaId", "type", "payeeEmployeeId", "payeeTeacherId" ON "FinancialRecurrence" FOR EACH ROW EXECUTE FUNCTION public.assert_payable_payee_scope();
