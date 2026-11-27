"use server";
import { runAgencyBillingMutation } from "@/lib/agency/billing-mutation";
export async function saveAgencyPlanAction(form: FormData) { return runAgencyBillingMutation("plan", form); }
export async function assignAgencyPlanAction(form: FormData) { return runAgencyBillingMutation("assign", form); }
export async function setAgencySubscriptionStatusAction(form: FormData) { return runAgencyBillingMutation("status", form); }
export async function prepareAgencyInvoiceAction(form: FormData) { return runAgencyBillingMutation("checkout", form); }
export async function saveAgencyBillingGraceAction(form: FormData) { return runAgencyBillingMutation("grace", form); }
