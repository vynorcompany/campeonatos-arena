import "server-only";
import { withArenaTransaction } from "@/lib/rls";
import { supportWorkspaceSchema, agencySupportWorkspaceSchema } from "@/lib/backend/contracts/support";

export async function resolveSupportWorkspace(arenaId: string) {
  const tickets = await withArenaTransaction(arenaId, tx => tx.supportTicket.findMany({
    where: {arenaId},
    select: {
      id:true, code:true, title:true, description:true, category:true, priority:true, status:true, updatedAt:true,
      requester:{select:{name:true}}, assignee:{select:{name:true}},
      messages:{where:{internal:false}, select:{body:true}, orderBy:{createdAt:"desc"}, take:1}
    },
    orderBy:[{status:"asc"},{updatedAt:"desc"}]
  }));
  return supportWorkspaceSchema.parse({tickets:tickets.map(ticket=>({...ticket,updatedAt:ticket.updatedAt.toISOString()}))});
}

export async function resolveAgencySupportWorkspace() {
  const {agencyDatabase:db} = await import("@/lib/auth/database");
  const [tickets,agencyUsers] = await Promise.all([
    db.supportTicket.findMany({where:{status:{notIn:["RESOLVED","CLOSED"]}}, select:{
      id:true,code:true,title:true,description:true,status:true,priority:true,assigneeId:true,
      arena:{select:{name:true}},requester:{select:{name:true}},
      messages:{select:{id:true,body:true,internal:true,author:{select:{name:true}}},orderBy:{createdAt:"desc"},take:3}
    },orderBy:[{priority:"desc"},{updatedAt:"desc"}]}),
    db.user.findMany({where:{systemRole:{in:["SUPER_ADMIN","ADMIN","MANAGER"]}},select:{id:true,name:true},orderBy:{name:"asc"}})
  ]);
  return agencySupportWorkspaceSchema.parse({tickets,agencyUsers});
}
