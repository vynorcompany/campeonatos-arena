import"server-only";
import * as profile from"./public-player-profile";
import{privacyAction}from"./privacy";
import{startPublicFinancialEntryPaymentAction}from"./public-finance-payment";
import{portalAccountOutcomes,portalAccountInputSchema,type PortalAccountOperation}from"../contracts/portal-account";
export async function executePortalAccountMutation(operation:PortalAccountOperation,input:ReturnType<ReturnType<typeof portalAccountInputSchema>["parse"]>){const form=new FormData();for(const[key,values]of Object.entries(input.fields))for(const value of values)form.append(key,value);if(input.file)form.set("photo",new File([Buffer.from(input.file.base64,"base64")],input.file.name,{type:input.file.type}));const result=operation==="profile"?await profile.updatePublicPlayerProfileAction({error:null,success:null},form):operation==="availability"?await profile.updateTournamentAvailabilityAction(form):operation==="partner"?await profile.requestDoublesPartnerAction(form):operation==="privacy"?await privacyAction({error:null},form):await startPublicFinancialEntryPaymentAction(form);return portalAccountOutcomes[operation].parse(result);}
