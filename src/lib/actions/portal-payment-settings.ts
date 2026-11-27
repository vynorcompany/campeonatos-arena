"use server";
import{runFinancialMutation}from"@/lib/finance/mutation";
export async function savePortalPaymentSettingsAction(form:FormData){const result=await runFinancialMutation("settings-save-portal-payment",form);return{error:result&&"error"in result?result.error:null};}
