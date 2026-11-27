import "server-only";
import {revalidatePath} from "next/cache";
import {checkinPayload,remoteCheckinMutation} from "@/lib/backend/checkin-client";
import type{CheckinOperation} from "@/lib/backend/contracts/checkin";
export async function runCheckinMutation(operation:CheckinOperation,form:FormData){
 let result;try{const input=checkinPayload(operation,form),origin=process.env.VX4_BACKEND_ORIGIN;result=origin?await remoteCheckinMutation(origin,operation,input):await(await import("@/lib/backend/services/checkin-mutations")).executeCheckinMutation(operation,input.fields);}catch{return{error:"Não foi possível confirmar o check-in. Confira sua presença antes de tentar novamente."};}
 if(!result.error){const slug=String(form.get("arenaSlug")??"");if(operation==="configure"){revalidatePath("/agenda/configuracao");revalidatePath("/configuracoes/checkin");}if(operation==="court"||operation==="lesson"){revalidatePath(`/checkin/${slug}`);revalidatePath("/home");}if(operation==="court")revalidatePath("/agenda");if(operation==="lesson"){revalidatePath(`/classificacao/${slug}`);revalidatePath("/aulas");}}
 return result;
}
