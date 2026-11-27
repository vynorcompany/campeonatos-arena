import "server-only";
import {revalidatePath} from "next/cache";
import {remoteAgencyMutation} from "@/lib/backend/agency-mutations-client";
import {agencyFields,agencyInputSchema,type AgencyOperation} from "@/lib/backend/contracts/agency-mutations";
export async function runAgencyMutation(operation:AgencyOperation,form:FormData){
 const origin=process.env.VX4_BACKEND_ORIGIN;
 const result=origin?await remoteAgencyMutation(origin,operation,form).catch(()=>({error:'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.'})):await(async()=>{const input:Record<string,string>={};for(const key of agencyFields[operation]){const value=form.get(key);if(typeof value==='string')input[key]=value;}return(await import('@/lib/backend/services/agency-mutations')).executeAgencyMutation(operation,agencyInputSchema(operation).parse(input));})();
 if(!result.error){if(operation==='whatsapp-status'){if('connected'in result&&result.connected){revalidatePath('/','layout');revalidatePath('/arena');}}
 else if(operation.startsWith('whatsapp-')){if(operation!=='whatsapp-qr')revalidatePath('/','layout');revalidatePath('/arena');revalidatePath('/agencia/conexoes');}
 else{for(const path of ['/agencia','/agencia/arenas','/agencia/arenas/usuarios'])revalidatePath(path);}}
 return{...result,connected:'connected'in result?Boolean(result.connected):false};
}
