import 'server-only';
import { arenaDatabase } from '@/lib/arena-database';
import { printerSettingsDataSchema, policySettingsDataSchema, privacySettingsDataSchema } from '@/lib/backend/contracts/arena-settings';
export async function resolvePrinterSettings(arenaId: string) {
 const settings = await arenaDatabase(arenaId).arenaOperationalSettings.findUnique({ where: { arenaId }, select: { printerPaper: true, printerCopies: true } });
 return printerSettingsDataSchema.parse({ settings });
}
export async function resolvePolicySettings(arenaId: string) {
 const db = arenaDatabase(arenaId); const [arena,settings] = await Promise.all([db.arena.findUniqueOrThrow({where:{id:arenaId},select:{slug:true}}),db.arenaOperationalSettings.findUnique({where:{arenaId},select:{cancellationPolicy:true,cancellationPolicyPublished:true}})]);
 return policySettingsDataSchema.parse({ arena,settings });
}
export async function resolvePrivacySettings(arenaId: string, query: string) {
 const db = arenaDatabase(arenaId);
 const [requests,references] = await Promise.all([
  db.privacyRequest.findMany({where:{arenaId},orderBy:[{status:'desc'},{createdAt:'desc'}],take:100,select:{id:true,kind:true,status:true,message:true,response:true,createdAt:true,player:{select:{name:true}}}}),
  db.erasedContactReference.findMany({where:{arenaId,...(query?{OR:[{id:query},{player:{privacyRequests:{some:{id:query}}}}]}:{})},orderBy:{createdAt:'desc'},take:100,select:{id:true,player:{select:{privacyRequests:{where:{kind:'ERASURE',status:'COMPLETED'},orderBy:{createdAt:'desc'},take:1,select:{id:true}}}}}})
 ]);
 return privacySettingsDataSchema.parse({requests:requests.map(row=>({...row,createdAt:row.createdAt.toISOString()})),references});
}
