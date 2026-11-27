"use server";
import{runPortalAccountMutation}from"@/lib/portal/account-mutation";
import{portalPrivacyOutcomeSchema}from"@/lib/backend/contracts/portal-account";
export type PrivacyActionState={error:string|null;notice?:string;download?:string;closed?:boolean};
export async function privacyAction(_:PrivacyActionState,form:FormData):Promise<PrivacyActionState>{return portalPrivacyOutcomeSchema.parse(await runPortalAccountMutation("privacy",form));}
