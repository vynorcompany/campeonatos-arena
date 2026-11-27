"use server";
import { runFinancialMutation } from '@/lib/finance/mutation';
import { financialChargeOutcomeSchema } from '@/lib/backend/contracts/financial-mutations';
export async function createFinancialEntryAction(form: FormData) { return runFinancialMutation('create', form); }
export async function updateFinancialEntryAction(form: FormData) { return runFinancialMutation('update', form); }
export async function createFinancialRecurrenceAction(form: FormData) { return runFinancialMutation('recurrence', form); }
export async function generateFinancialEntryOnlineChargeAction(form: FormData) { return financialChargeOutcomeSchema.parse(await runFinancialMutation('charge', form)); }
export async function settleFinancialEntryAction(form: FormData) { return runFinancialMutation('settle', form); }
export async function settleFinancialEntriesBulkAction(form: FormData) { return runFinancialMutation('settle-bulk', form); }
export async function voidFinancialEntryAction(form: FormData) { return runFinancialMutation('void', form); }
export async function deleteFinancialEntryAction(form: FormData) { return runFinancialMutation('delete', form); }
export async function deleteFinancialEntriesBulkAction(form: FormData) { return runFinancialMutation('delete-bulk', form); }
export async function splitFinancialEntryCardAction(form: FormData) { return runFinancialMutation('split-card', form); }
