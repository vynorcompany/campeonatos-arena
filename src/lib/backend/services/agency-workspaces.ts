import "server-only";
import {agencyDatabase} from "@/lib/auth/database";
import {agencyUsersSchema,agencyArenasSchema} from "@/lib/backend/contracts/agency-mutations";
export async function resolveAgencyUsers(){return agencyUsersSchema.parse({users:await agencyDatabase.user.findMany({select:{id:true,name:true,email:true,systemRole:true,memberships:{select:{id:true,role:true,arena:{select:{name:true}}},orderBy:{createdAt:'desc'}}},orderBy:{createdAt:'desc'}})});}
export async function resolveAgencyArenas(){const arenas=await agencyDatabase.arena.findMany({select:{id:true,name:true,slug:true,legalName:true,cnpj:true,email:true,phone:true,city:true,state:true,agencyNotes:true,accountStatus:true,archivedAt:true,_count:{select:{members:true,supportTickets:true}}},orderBy:[{accountStatus:'asc'},{name:'asc'}]});return agencyArenasSchema.parse({arenas:arenas.map(row=>({...row,archivedAt:row.archivedAt?.toISOString()??null}))});}
