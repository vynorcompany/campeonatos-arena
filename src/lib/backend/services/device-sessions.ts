import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/auth/database';
import { deviceSessionsDataSchema } from '@/lib/backend/contracts/arena-settings';
export async function resolveDeviceSessions(userId: string, token?: string) {
 const current = token ? await prisma.session.findFirst({where:{userId,token:{in:[token,createHash('sha256').update(token).digest('hex')]}},select:{id:true}}) : null;
 const sessions = await prisma.session.findMany({where:{userId,expiresAt:{gt:new Date()}},select:{id:true,deviceLabel:true,createdAt:true,lastSeenAt:true,expiresAt:true},orderBy:{lastSeenAt:'desc'},take:100});
 return deviceSessionsDataSchema.parse({currentId:current?.id??null,sessions:sessions.map(row=>({...row,createdAt:row.createdAt.toISOString(),lastSeenAt:row.lastSeenAt.toISOString(),expiresAt:row.expiresAt.toISOString()}))});
}
