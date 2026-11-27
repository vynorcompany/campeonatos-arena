"use server";
import{runFinancialMutation}from"@/lib/finance/mutation";
export async function saveFinancialOperationsSettingsAction(form:FormData){const result=await runFinancialMutation("settings-save-financial-operations",form);return{error:result&&"error"in result?result.error:null};}
