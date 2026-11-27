import "server-only";
import {revalidatePath} from "next/cache";
import {remoteConfigurationMutation} from "@/lib/backend/arena-configuration-client";
import type {ConfigurationOperation} from "@/lib/backend/contracts/arena-configuration";
export async function runConfigurationMutation(operation:ConfigurationOperation,form:FormData){
 const origin=process.env.VX4_BACKEND_ORIGIN;
 const result=origin?await remoteConfigurationMutation(origin,operation,form).catch(()=>({error:'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.',success:null})):await(await import('@/lib/backend/services/arena-configuration-mutations')).executeConfigurationMutation(operation,form);
 if(!result.error){for(const path of ['/arena','/painel','/arena/portal-cliente','/proximos-jogos/tv'])revalidatePath(path);if('cacheSlugs'in result)for(const slug of result.cacheSlugs??[])revalidatePath(`/classificacao/${encodeURIComponent(slug)}`);}
 return{error:result.error,success:result.success,...('secret'in result&&result.secret?{secret:result.secret}:{})};
}
