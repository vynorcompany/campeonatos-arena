"use server";
import{runPortalAccountMutation}from"@/lib/portal/account-mutation";
import{publicProfileOutcomeSchema,portalSimpleOutcomeSchema}from"@/lib/backend/contracts/portal-account";
export type PublicProfileActionState={error:string|null;success:string|null};
export async function updateTournamentAvailabilityAction(form:FormData){return portalSimpleOutcomeSchema.parse(await runPortalAccountMutation("availability",form));}
export async function requestDoublesPartnerAction(form:FormData){return portalSimpleOutcomeSchema.parse(await runPortalAccountMutation("partner",form));}
export async function updatePublicPlayerProfileAction(_:PublicProfileActionState,form:FormData):Promise<PublicProfileActionState>{const result=await runPortalAccountMutation("profile",form),parsed=publicProfileOutcomeSchema.safeParse(result);return parsed.success?parsed.data:{error:"error"in result?result.error:"Não foi possível confirmar a atualização do perfil.",success:null};}
