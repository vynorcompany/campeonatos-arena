-- Match the project's tenant-reference contract while preserving the original SET NULL action.
SET lock_timeout = '5s';
SET statement_timeout = '120s';
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "tenant_link_entry_payee_teacher" FOREIGN KEY ("payeeTeacherId", "arenaId") REFERENCES "Teacher" ("id", "arenaId") ON UPDATE CASCADE ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "FinancialRecurrence" ADD CONSTRAINT "tenant_link_recurrence_payee_teacher" FOREIGN KEY ("payeeTeacherId", "arenaId") REFERENCES "Teacher" ("id", "arenaId") ON UPDATE CASCADE ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
RESET lock_timeout;
RESET statement_timeout;
