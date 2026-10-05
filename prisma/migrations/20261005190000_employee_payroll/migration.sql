-- CreateTable
CREATE TABLE "EmployeePayrollEntry" (
    "id" TEXT NOT NULL,
    "arenaId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeName" TEXT NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "fixedSalaryCents" INTEGER NOT NULL DEFAULT 0,
    "monthlyMinutes" INTEGER NOT NULL,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimePercentage" INTEGER NOT NULL DEFAULT 50,
    "overtimeCents" INTEGER NOT NULL DEFAULT 0,
    "bonusCents" INTEGER NOT NULL DEFAULT 0,
    "benefitsCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "advanceCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "financialEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayrollEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayrollEntry_financialEntryId_key" ON "EmployeePayrollEntry"("financialEntryId");

-- CreateIndex
CREATE INDEX "EmployeePayrollEntry_arenaId_referenceMonth_idx" ON "EmployeePayrollEntry"("arenaId", "referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayrollEntry_arenaId_userId_referenceMonth_key" ON "EmployeePayrollEntry"("arenaId", "userId", "referenceMonth");

-- AddForeignKey
ALTER TABLE "EmployeePayrollEntry" ADD CONSTRAINT "EmployeePayrollEntry_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollEntry" ADD CONSTRAINT "EmployeePayrollEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayrollEntry" ADD CONSTRAINT "EmployeePayrollEntry_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "EmployeePayrollEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmployeePayrollEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "arena_scope_employee_payroll" ON "EmployeePayrollEntry"
  USING ("arenaId" = public.current_arena_id())
  WITH CHECK ("arenaId" = public.current_arena_id());
GRANT ALL PRIVILEGES ON TABLE "EmployeePayrollEntry" TO arena_runtime;
