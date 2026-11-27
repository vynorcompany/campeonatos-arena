"use server";
import{remoteSmartLookup}from"@/lib/backend/lookup-client";
export async function createSmartLookupAction(form:FormData){try{const origin=process.env.VX4_BACKEND_ORIGIN;return origin?await remoteSmartLookup(origin,form):await(await import("@/lib/backend/services/smart-lookup")).createSmartLookupAction(form);}catch{return{error:"Não foi possível confirmar o cadastro. Confira a listagem antes de tentar novamente."};}}
