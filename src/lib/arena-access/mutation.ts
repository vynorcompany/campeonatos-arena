import "server-only";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {remoteAccessMutation} from "@/lib/backend/arena-access-client";
import type {AccessOperation} from "@/lib/backend/contracts/arena-access";
export async function runAccessMutation(operation:AccessOperation,form:FormData) {
 const origin=process.env.VX4_BACKEND_ORIGIN;
 const result=origin?await remoteAccessMutation(origin,operation,form):await(async()=>{const core=await import('@/lib/backend/services/permission-profiles');return operation==='create'?core.createPermissionProfileAction(form):operation==='update'?core.updatePermissionProfileAction(form):core.deletePermissionProfileAction(form);})();
 revalidatePath('/arena');revalidatePath('/painel');
 if(operation==='create')redirect(`/arena/perfis/${result.profileId}`);
 if(operation==='delete')redirect('/arena?section=profiles');
 revalidatePath(`/arena/perfis/${result.profileId}`);
}
