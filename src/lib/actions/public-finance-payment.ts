"use server";
import{runPortalAccountMutation}from"@/lib/portal/account-mutation";
export async function startPublicFinancialEntryPaymentAction(form:FormData){const result=await runPortalAccountMutation("payment",form);if("checkoutUrl"in result)return{checkoutUrl:result.checkoutUrl};throw Error("error"in result&&result.error?result.error:"Não foi possível abrir o pagamento.");}
