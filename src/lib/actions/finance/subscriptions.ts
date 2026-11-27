"use server";
import { runFinancialMutation } from "@/lib/finance/mutation";
export async function createPlanAction(form: FormData) { return runFinancialMutation('academy-create-plan', form); }
export async function createSubscriptionAction(form: FormData) { return runFinancialMutation('academy-create-subscription', form); }
export async function recordPlanPaymentAction(form: FormData) { return runFinancialMutation('academy-record-plan-payment', form); }
