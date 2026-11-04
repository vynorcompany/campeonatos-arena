import { Prisma } from "@prisma/client";
import type { ArenaTransaction } from "@/lib/rls";

export class ClientMergeConflict extends Error {}
const labels: Record<string,string> = {
 PlayerAccount:"acesso ao Portal", Student:"cadastro de aluno", Teacher:"cadastro de professor",
 TournamentPlayer:"inscrição em torneio", PairPlayer:"participação em dupla", CategoryPairPlayer:"participação em categoria",
 ScheduleParticipant:"participação na mesma reserva", PlayerPortalNotificationRead:"leitura de aviso",
 ClassGroupEnrollment:"matrícula na mesma turma", LessonAttendance:"presença na mesma aula", StudentMonthlyBalance:"saldo de aulas do mesmo mês",
 TeacherStudent:"vínculo com o mesmo professor", LessonCreditBatch:"lote de créditos de aulas", Super12PairPlayer:"dupla de Super 12",
 ErasedContactReference:"registro de privacidade",
};
type Plan = { model:string; field:string; from:string; to:string; scope:Record<string,string> };
const delegate=(tx:ArenaTransaction,model:string):any=>(tx as any)[model[0].toLowerCase()+model.slice(1)];

async function conflictContext(tx:ArenaTransaction, model:Prisma.DMMF.Model, row:Record<string,any>, fields:readonly string[]) {
 const values:string[]=[];
 for(const field of fields) {
  if(["playerId","studentId","arenaId"].includes(field))continue;
  const relation=model.fields.find(f=>f.kind==="object"&&f.relationFromFields?.length===1&&f.relationFromFields[0]===field);
  if(relation && row[field]) {
   const related=await delegate(tx,relation.type).findFirst({where:{id:row[field]}});
   if(related) { const title=related.name||related.title||related.code;const date=related.startsAt instanceof Date?related.startsAt.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}):"";values.push([title,date].filter(Boolean).join(" · ")||String(row[field])); }
  } else if(row[field]!=null) values.push(String(row[field]));
 }
 return values.join(" / ")||`registro ${row.id}`;
}

/** Preflight every affected unique key before writing; never discard financial or sporting rows. */
async function referencePlans(tx:ArenaTransaction, arenaId:string, target:"Player"|"Student", from:string, to:string, skip:Set<string>) {
 const plans:Plan[]=[];
 for(const model of Prisma.dmmf.datamodel.models) for(const relation of model.fields) {
  if(relation.type!==target || !relation.relationFromFields?.length || skip.has(model.name))continue;
  const index=relation.relationToFields?.indexOf("id")??-1;
  if(index<0)throw new ClientMergeConflict(`Vínculo ${model.name} requer revisão antes da mesclagem. Nenhum dado foi alterado.`);
  const field=relation.relationFromFields[index];
  const scope:Record<string,string>=model.fields.some(f=>f.name==="arenaId")?{arenaId}:{};
  const keys=[...model.uniqueFields,...model.fields.filter(f=>f.isUnique||f.isId).map(f=>[f.name])].filter(key=>key.includes(field));
  if(keys.length) {
   const rows=await delegate(tx,model.name).findMany({where:{...scope,[field]:from}});
   for(const row of rows)for(const key of keys) {
    const candidate={...row,[field]:to};if(key.some(k=>candidate[k]===null||candidate[k]===undefined))continue;
    const where=Object.fromEntries(key.map(k=>[k,candidate[k]]));
    const clash=await delegate(tx,model.name).findFirst({where:{...where,...(row.id?{NOT:{id:row.id}}:{})}});
    if(clash)throw new ClientMergeConflict(`Não foi possível mesclar: os dois cadastros possuem ${labels[model.name]??model.name} (${await conflictContext(tx,model,row,key)}). É necessário revisar esse vínculo para preservar os dois históricos. Nenhum dado foi alterado.`);
   }
  }
  plans.push({model:model.name,field,from,to,scope});
 }
 return plans;
}

export async function transferClientHistory(tx:ArenaTransaction, arenaId:string, primary:any, duplicate:any) {
 if(primary.account&&duplicate.account)throw new ClientMergeConflict(`Os dois cadastros têm acesso ao Portal: ${primary.account.phone} e ${duplicate.account.phone}. A mesclagem não substitui credenciais de acesso. Revise qual acesso deve ser mantido. Nenhum dado foi alterado.`);
 if(primary.teacher&&duplicate.teacher)throw new ClientMergeConflict(`Os dois cadastros estão vinculados a professores: ${primary.teacher.name} e ${duplicate.teacher.name}. Revise os cadastros de professor antes de mesclar. Nenhum dado foi alterado.`);
 if(primary.guardianId===duplicate.id||duplicate.guardianId===primary.id||primary.guardianId&&duplicate.guardianId&&primary.guardianId!==duplicate.guardianId)throw new ClientMergeConflict("Os cadastros possuem vínculos de responsável/dependente conflitantes. Revise os responsáveis financeiros antes de mesclar. Nenhum dado foi alterado.");
 if(duplicate.student&&!primary.student) {
  const existing=await tx.student.findFirst({where:{arenaId,name:primary.name,id:{not:duplicate.student.id}},select:{id:true,name:true}});
  if(existing)throw new ClientMergeConflict(`Já existe outro cadastro de aluno chamado ${existing.name} (registro ${existing.id}). Revise esse vínculo antes de mesclar. Nenhum dado foi alterado.`);
 }
 const bothStudents=Boolean(primary.student&&duplicate.student);
 const plans=await referencePlans(tx,arenaId,"Player",duplicate.id,primary.id,new Set(bothStudents?["Student"]:[]));
 if(bothStudents) {
  for(const id of [primary.student.id,duplicate.student.id].sort())await tx.$queryRaw`SELECT id FROM "Student" WHERE id=${id} AND "arenaId"=${arenaId} FOR UPDATE`;
  primary.student=await tx.student.findUniqueOrThrow({where:{id:primary.student.id}});
  duplicate.student=await tx.student.findUniqueOrThrow({where:{id:duplicate.student.id}});
  plans.push(...await referencePlans(tx,arenaId,"Student",duplicate.student.id,primary.student.id,new Set()));
 }
 // Moving batches first lets the composite attendance foreign key cascade safely.
 plans.sort((a,b)=>Number(b.model==="LessonCreditBatch")-Number(a.model==="LessonCreditBatch"));
 for(const plan of plans)await delegate(tx,plan.model).updateMany({where:{...plan.scope,[plan.field]:plan.from},data:{[plan.field]:plan.to}});
 if(bothStudents) {
  for(const field of ["remainingClasses","totalClasses","attendedClasses","missedClasses"])if(!Number.isSafeInteger(primary.student[field]+duplicate.student[field])||primary.student[field]+duplicate.student[field]>2147483647)throw new ClientMergeConflict("O saldo de aulas excede o limite permitido. Revise os créditos antes de mesclar.");
  await tx.student.update({where:{id:primary.student.id},data:{remainingClasses:{increment:duplicate.student.remainingClasses},totalClasses:{increment:duplicate.student.totalClasses},attendedClasses:{increment:duplicate.student.attendedClasses},missedClasses:{increment:duplicate.student.missedClasses}}});
  await tx.student.update({where:{id:duplicate.student.id},data:{active:false,remainingClasses:0,totalClasses:0,attendedClasses:0,missedClasses:0}});
 }
}
