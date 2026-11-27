import "server-only";
import { withArenaTransaction } from "@/lib/rls";
import { ensureArenaPermissionProfiles } from "@/lib/backend/services/permission-profiles";
import { accessProfilesSchema,accessProfileSchema,accessUsersSchema } from "@/lib/backend/contracts/arena-access";
export async function resolveAccessProfiles(arenaId:string) {
  await ensureArenaPermissionProfiles(arenaId);
  const profiles=await withArenaTransaction(arenaId,tx=>tx.permissionProfile.findMany({where:{arenaId,active:true},select:{id:true,name:true,description:true,members:{select:{user:{select:{name:true}}},orderBy:{user:{name:"asc"}}}},orderBy:{name:"asc"}}));
  return accessProfilesSchema.parse({profiles});
}
export async function resolveAccessProfile(arenaId:string,id:string) {
  const profile=await withArenaTransaction(arenaId,tx=>tx.permissionProfile.findFirst({where:{id,arenaId},select:{id:true,name:true,description:true,viewPermissions:true,editPermissions:true,_count:{select:{members:true}}}}));
  return accessProfileSchema.parse(profile);
}
export async function resolveAccessUsers(arenaId:string,query:string) {
  await ensureArenaPermissionProfiles(arenaId);
  const [members,profiles,invites]=await withArenaTransaction(arenaId,tx=>Promise.all([
    tx.arenaMember.findMany({where:{arenaId,...(query?{user:{OR:[{name:{contains:query,mode:"insensitive"}},{email:{contains:query,mode:"insensitive"}}]}}:{})},select:{id:true,userId:true,role:true,permissionProfileId:true,viewPermissions:true,editPermissions:true,user:{select:{name:true,email:true}},permissionProfile:{select:{id:true,name:true}}},orderBy:[{role:"desc"},{user:{name:"asc"}}]}),
    tx.permissionProfile.findMany({where:{arenaId,active:true},select:{id:true,name:true},orderBy:{name:"asc"}}),
    tx.accountActionToken.findMany({where:{arenaId,kind:"INVITE",usedAt:null,expiresAt:{gt:new Date()},...(query?{OR:[{name:{contains:query,mode:"insensitive"}},{email:{contains:query,mode:"insensitive"}}]}:{})},select:{id:true,email:true,name:true,expiresAt:true},orderBy:{createdAt:"desc"},take:50})
  ]));
  return accessUsersSchema.parse({members,profiles,invites:invites.map(row=>({...row,expiresAt:row.expiresAt.toISOString()}))});
}
