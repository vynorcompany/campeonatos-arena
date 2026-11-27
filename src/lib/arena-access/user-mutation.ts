import "server-only";
import {revalidatePath} from "next/cache";
import {remoteUserMutation} from "@/lib/backend/user-mutations-client";
import type {UserOperation,UserActionState} from "@/lib/backend/contracts/user-mutations";
export async function runUserMutation(operation:UserOperation,form:FormData):Promise<UserActionState>{
 const origin=process.env.VX4_BACKEND_ORIGIN;let result:UserActionState;
 if(origin)result=await remoteUserMutation(origin,operation,form).catch(()=>({error:'Não foi possível confirmar a alteração. Confira o acesso antes de tentar novamente.',success:null}));
 else{const core=await import('@/lib/backend/services/user-actions');if(operation==='role')await core.updateArenaUserRoleAction(form);else if(operation==='update')await core.updateArenaUserAction(form);else if(operation==='remove')await core.removeArenaUserAction(form);else return finish(operation==='own-profile'?await core.updateOwnProfileAction({error:null,success:null},form):await core.updateOwnPasswordAction({error:null,success:null},form));result={error:null,success:null};}
 return finish(result);
}
function finish(result:UserActionState){if(!result.error){for(const path of ['/painel','/usuarios','/minha-conta','/arena'])revalidatePath(path);}return result;}
