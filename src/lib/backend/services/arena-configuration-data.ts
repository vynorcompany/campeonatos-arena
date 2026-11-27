import "server-only";
import {withArenaTransaction} from "@/lib/rls";
import {configurationDataSchema,agentKeysDataSchema,type ConfigurationSection} from "@/lib/backend/contracts/arena-configuration";
export async function resolveArenaConfiguration(arenaId:string,section:ConfigurationSection){
 return withArenaTransaction(arenaId,async tx=>{
  let profile=null,portal=null,connection=null;
  if(section==='data')profile=await tx.arena.findUniqueOrThrow({where:{id:arenaId},select:{name:true,legalName:true,cnpj:true,phone:true,email:true,address:true,city:true,state:true,zipCode:true,logoUrl:true}});
  if(section==='portal'){const row=await tx.arena.findUniqueOrThrow({where:{id:arenaId},select:{athletePortalShowLeagues:true,athletePortalShowBooking:true,athletePortalShowReservations:true,athletePortalShowLessons:true,athletePortalShowClasses:true,athletePortalShowDoublesRadar:true,athletePortalLogoUrl:true}});portal={showLeagues:row.athletePortalShowLeagues,showBooking:row.athletePortalShowBooking,showReservations:row.athletePortalShowReservations,showLessons:row.athletePortalShowLessons,showClasses:row.athletePortalShowClasses,showDoublesRadar:row.athletePortalShowDoublesRadar,portalLogoUrl:row.athletePortalLogoUrl};}
  if(section==='integrations'){const row=await tx.whatsAppConnection.findUnique({where:{arenaId},select:{status:true,qrCodeDataUrl:true,connectedPhone:true,lastError:true}});if(row)connection={...row,qrCodeDataUrl:row.qrCodeDataUrl.startsWith('data:image/png;base64,')?row.qrCodeDataUrl:'',lastError:row.lastError?'Não foi possível concluir a conexão. Verifique novamente.':''};}
  const [announcements,posts]=section==='portal'?await Promise.all([
   tx.portalAnnouncement.findMany({where:{arenaId},select:{id:true,title:true,message:true,active:true,pinned:true,linkUrl:true},orderBy:[{pinned:'desc'},{createdAt:'desc'}]}),
   tx.portalEventPost.findMany({where:{arenaId},select:{id:true,title:true,caption:true,imageUrl:true,linkUrl:true,active:true,pinned:true},orderBy:[{pinned:'desc'},{createdAt:'desc'}]})
  ]):[[],[]];
  return configurationDataSchema.parse({profile,portal,connection,announcements,posts});
 });
}
export async function resolveAgentKeys(arenaId:string){const keys=await withArenaTransaction(arenaId,tx=>tx.agentApiKey.findMany({where:{arenaId},select:{id:true,name:true,prefix:true,scopes:true,expiresAt:true,revokedAt:true,lastUsedAt:true},orderBy:{createdAt:'desc'},take:100}));return agentKeysDataSchema.parse({keys:keys.map(row=>({...row,expiresAt:row.expiresAt.toISOString(),revokedAt:row.revokedAt?.toISOString()??null,lastUsedAt:row.lastUsedAt?.toISOString()??null}))});}
