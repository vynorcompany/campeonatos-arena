import 'server-only';
import { prisma } from '@/lib/prisma';
import { regulationHistoryDataSchema,regulationPublicDataSchema } from '@/lib/backend/contracts/regulation';
export async function resolveRegulationHistory(arenaId:string){const documents=await prisma.regulationDocument.findMany({where:{arenaId},orderBy:{createdAt:'desc'},take:10,select:{id:true,content:true,publicSlug:true,createdAt:true,createdBy:{select:{name:true,email:true}},_count:{select:{acceptances:true}}}});return regulationHistoryDataSchema.parse({documents:documents.map(row=>({...row,createdAt:row.createdAt.toISOString()}))});}
export async function resolvePublicRegulation(publicSlug:string){const document=await prisma.regulationDocument.findFirst({where:{publicSlug,active:true},select:{id:true,content:true,arena:{select:{name:true,logoUrl:true}}}});return regulationPublicDataSchema.parse(document);}
