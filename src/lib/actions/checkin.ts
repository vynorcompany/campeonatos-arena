"use server";
import{runCheckinMutation}from"@/lib/checkin/mutation";
export async function configureCourtCheckinAction(form:FormData){const result=await runCheckinMutation("configure",form);if(result.error)throw Error(result.error);}
export async function registerCourtCheckinAction(form:FormData){const result=await runCheckinMutation("court",form);return result.error?{error:result.error}:undefined;}
export async function registerLessonQrCheckinAction(form:FormData){const result=await runCheckinMutation("lesson",form);return result.error?{error:result.error}:undefined;}
export async function shareCheckinGameAction(form:FormData){const result=await runCheckinMutation("share",form);return result.error?{error:result.error}:"path"in result&&result.path?{path:result.path}:{error:"Não foi possível compartilhar o jogo."};}
