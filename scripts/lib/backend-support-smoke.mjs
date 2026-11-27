import { createForeignArenaFixture } from './backend-foreign-fixtures.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function assertSupportSmoke(db, origin, arenaId, cookie, staffId) {
  const tag = 'SupportContract' + randomUUID();
  const other = await createForeignArenaFixture(db, 'support');
  const staff = await db.user.findUniqueOrThrow({where:{id:staffId},select:{systemRole:true}});
  const foreign = await db.supportTicket.create({data:{arenaId:other.id,requesterId:staffId,code:tag+'-foreign',title:'Chamado de outra arena',description:'Descrição sintética estrangeira'}});
  const post = (operation,body,requestOrigin='http://127.0.0.1:3014') => fetch(`${origin}/api/management/support/actions/${operation}`,{method:'POST',headers:{cookie,origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
  const read = (path='',authCookie=cookie) => fetch(`${origin}/api/management/support${path}`,{headers:{cookie:authCookie},redirect:'manual'});
  const create = {title:tag,category:'BUG',priority:'HIGH',description:'Descrição sintética do chamado de suporte'};
  try {
    assert.equal((await read('','')).status,307);
    assert.equal((await read('?arenaId='+other.id)).status,400);
    assert.equal((await read('/agency')).status,403);
    assert.equal((await post('create',create,'https://foreign.invalid')).status,403);
    assert.equal((await post('create',{...create,arenaId:other.id})).status,400);
    assert.equal((await post('create',{...create,requesterId:'goal-test'})).status,400);
    assert.equal((await post('create',{...create,title:'x'})).status,400);
    assert.deepEqual(await (await post('create',create)).json(),{error:null});
    const ticket = await db.supportTicket.findFirstOrThrow({where:{arenaId,title:tag}});
    assert.equal(ticket.requesterId,staffId);assert.equal(ticket.status,'OPEN');
    assert.equal(await db.supportTicketMessage.count({where:{ticketId:ticket.id,authorId:staffId,body:create.description}}),1);
    assert.equal((await post('update',{ticketId:ticket.id,status:'RESOLVED',priority:'LOW'})).status,403);
    assert.equal((await post('message',{ticketId:ticket.id,body:'Resposta não autorizada'})).status,403);
    await db.user.update({where:{id:staffId},data:{systemRole:'MANAGER'}});
    const agency = await read('/agency');assert.equal(agency.status,200);assert.equal(agency.headers.get('cache-control'),'private, no-store');
    const agencyData = await agency.json();assert.ok(agencyData.tickets.some(row=>row.id===foreign.id));
    const agencyUser = agencyData.agencyUsers.find(row=>row.id===staffId);assert.deepEqual(Object.keys(agencyUser).sort(),['id','name']);
    assert.deepEqual(await (await post('message',{ticketId:ticket.id,body:'Resposta pública sintética'})).json(),{error:null});
    assert.deepEqual(await (await post('message',{ticketId:ticket.id,body:'NOTA_INTERNA_PRIVADA_'+tag,internal:'on'})).json(),{error:null});
    const updated = await db.supportTicket.findUniqueOrThrow({where:{id:ticket.id}});assert.equal(updated.status,'IN_PROGRESS');assert.equal(updated.assigneeId,staffId);
    const raw = await db.supportTicketMessage.findMany({where:{ticketId:ticket.id}});assert.equal(raw.filter(row=>row.internal).length,1);assert.equal(raw.length,3);
    const agencyWithNotes = await (await read('/agency')).json();assert.ok(agencyWithNotes.tickets.find(row=>row.id===ticket.id).messages.some(row=>row.body.startsWith('NOTA_INTERNA_PRIVADA_')));
    await db.user.update({where:{id:staffId},data:{systemRole:staff.systemRole}});
    const response=await read();assert.equal(response.headers.get('cache-control'),'private, no-store');const data=await response.json();
    assert.equal(data.tickets.some(row=>row.id===foreign.id),false);const own=data.tickets.find(row=>row.id===ticket.id);assert.deepEqual(own.messages,[{body:'Resposta pública sintética'}]);
    for(const key of ['passwordHash','requesterId','assigneeId','internal','authorId','NOTA_INTERNA_PRIVADA_'])assert.equal(JSON.stringify(data).includes(key),false,key);
    await db.user.update({where:{id:staffId},data:{systemRole:'MANAGER'}});
    assert.deepEqual(await (await post('update',{ticketId:ticket.id,status:'RESOLVED',priority:'LOW'})).json(),{error:null});
    const resolved=await db.supportTicket.findUniqueOrThrow({where:{id:ticket.id}});assert.equal(resolved.status,'RESOLVED');assert.equal(resolved.priority,'LOW');assert.ok(resolved.resolvedAt);
    assert.equal((await (await read('/agency')).json()).tickets.some(row=>row.id===ticket.id),false);
    assert.deepEqual(await (await post('update',{ticketId:ticket.id,status:'OPEN',priority:'HIGH'})).json(),{error:null});
    assert.equal((await db.supportTicket.findUniqueOrThrow({where:{id:ticket.id}})).resolvedAt,null);
    return {supportTicketId:ticket.id};
  } finally {
    await db.user.update({where:{id:staffId},data:{systemRole:staff.systemRole}});
    await db.supportTicket.delete({where:{id:foreign.id}});
  }
}
