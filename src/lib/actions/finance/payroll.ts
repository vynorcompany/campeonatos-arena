"use server";
import { runFinancialMutation } from "@/lib/finance/mutation";
import { financialEntryOutcomeSchema } from "@/lib/backend/contracts/financial-mutations";
export async function createTeacherMonthlyPayableAction(form: FormData) { return financialEntryOutcomeSchema.parse(await runFinancialMutation('payroll-create-teacher-monthly-payable', form)); }
export async function upsertPayrollEntryAction(form: FormData) { return runFinancialMutation('payroll-upsert-payroll-entry', form); }
