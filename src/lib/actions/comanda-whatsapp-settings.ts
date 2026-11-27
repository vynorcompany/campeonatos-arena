"use server";
import{runFinancialMutation}from"@/lib/finance/mutation";
export async function saveComandaWhatsappSettingsAction(form:FormData){const result=await runFinancialMutation("settings-save-comanda-whatsapp",form);return{error:result&&"error"in result?result.error:null};}
export async function sendPendingComandaWhatsappAction(){const result=await runFinancialMutation("settings-send-pending-comanda-whatsapp",new FormData());return{error:result&&"error"in result?result.error:null};}
