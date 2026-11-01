import { financialQuestion } from "./financial-question";
import { loadClientActivity } from "../reports/client-activity";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { arenaToday, arenaDateInput, arenaWallClockToInstant } from "../calendar/arena-wall-clock";
import { attachBookingCourts, dashboardEntrySelect, dashboardFinancialRows } from "../reports/dashboard-data";
import { getOutstandingCents } from "../finance/settlements";

const normalized = (s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v/100);
export function assistantPeriod(input:string, now=new Date()) {
 const text=normalized(input), today=arenaToday(now); let from=new Date(today.getFullYear(),today.getMonth(),1),to=new Date(today);
 const explicit=[...text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/g)];
 if(explicit.length){const dates=explicit.map(m=>new Date(Number(m[3]||today.getFullYear()),Number(m[2])-1,Number(m[1])));if(dates.some((d,i)=>d.getMonth()!==Number(explicit[i][2])-1||d.getDate()!==Number(explicit[i][1])))throw Error("Informe uma data válida.");from=dates[0];to=dates.at(-1)!;}
 else if(/ontem/.test(text)){from=new Date(today.getFullYear(),today.getMonth(),today.getDate()-1);to=new Date(from);}
 else if(/amanha/.test(text)){from=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);to=new Date(from);}
 else if(/hoje/.test(text)){from=new Date(today);to=new Date(today);}
 else if(/mes passado|mes anterior/.test(text)){from=new Date(today.getFullYear(),today.getMonth()-1,1);to=new Date(today.getFullYear(),today.getMonth(),0);}
 else if(/proximo mes/.test(text)){from=new Date(today.getFullYear(),today.getMonth()+1,1);to=new Date(today.getFullYear(),today.getMonth()+2,0);}
 else if(/este mes|nesse mes|mes atual/.test(text)){from=new Date(today.getFullYear(),today.getMonth(),1);to=new Date(today.getFullYear(),today.getMonth()+1,0);}
 else if(/este ano|ano atual/.test(text)){from=new Date(today.getFullYear(),0,1);to=new Date(today);}
 else if(/janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/.test(text)){const names=["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];const month=names.findIndex(name=>new RegExp(`\\b${name}\\b`).test(text));const year=Number(text.match(/\b(20\d{2})\b/)?.[1]||today.getFullYear());from=new Date(year,month,1);to=new Date(year,month+1,0);}
 else {const days=text.match(/ultimos?\s+(\d+)\s+dias/);if(days){const n=Number(days[1]);if(n<1||n>366)throw Error("Consulte até 366 dias por vez.");from=new Date(today.getFullYear(),today.getMonth(),today.getDate()-n+1);}}
 if(from>to||to.getTime()-from.getTime()>366*86400000)throw Error("Informe um período de até 366 dias, com as datas em ordem.");to.setHours(23,59,59,999);return {from,to};
}
const catalog = [
 ["Player", "Clientes", "players:view", /cliente|atleta|contato/],
 ["Teacher", "Professores", "teachers:view", /professor/],
 ["Student", "Alunos", "teachers:view", /aluno/],
 ["ClassGroup", "Turmas", "teachers:view", /turma/],
 ["LessonCreditBatch", "Créditos de aulas", "teachers:view", /credit.*aula|saldo.*aula/],
 ["LessonCreditRequest", "Pedidos de reposição", "teachers:view", /reposic|reagend/],
 ["Lesson", "Aulas", "teachers:view", /aula/],
 ["Plan", "Planos e pacotes", "teachers:view", /plano|pacote/],
 ["ScheduleOccurrence", "Reservas e agenda", "calendar:view", /reserva|agendamento|agenda/],
 ["Court", "Quadras", "calendar:view", /quadra/],
 ["Comanda", "Comandas", "pos:view", /comanda/],
 ["StockMovement", "Movimentos de estoque", "stock:view", /moviment.*estoque|baixa.*estoque/],
 ["Product", "Produtos e serviços", "stock:view", /produto|servico|estoque/],
 ["FiscalDocument", "Documentos fiscais", "finance:reports:view", /nota fiscal|nfce|nfe|fiscal/],
 ["Supplier", "Fornecedores", "finance:payable:view", /fornecedor/],
 ["EmployeePayrollEntry", "Folha de pagamento", "finance:payable:view", /folha|salario/],
 ["RankingProfile", "Rankings", "tournaments:view", /ranking|pontuacao/],
 ["CategoryMatch", "Jogos", "tournaments:view", /jogo|partida|resultado/],
 ["CategoryPair", "Duplas", "tournaments:view", /dupla/],
 ["Tournament", "Eventos", "tournaments:view", /torneio|evento|liga/],
 ["WhatsAppConversation", "Conversas", "support:whatsapp:manage", /whatsapp|conversa/],
 ["AuditEvent", "Auditoria", "arena:settings", /auditoria/],
 ["CheckinRecord", "Check-ins", "calendar:view", /check.?in|presenca/],
 ["FinancialRecurrence", "Recorrências financeiras", "finance:reports:view", /recorrencia/],
] as const;
export function assistantReadIntent(input:string) {
 const text=normalized(input);
 const finance=financialQuestion(input);
 if(finance && (!/quadra/.test(text) || /faturamento|receita|fluxo|caixa|financeiro/.test(text))) return {kind:"finance" as const, ...finance};
 const entry=catalog.find(row=>row[3].test(text));return entry?{kind:"records" as const,model:entry[0],label:entry[1],permission:entry[2]}:null;
}
const labels:Record<string,string>={name:"Nome",title:"Título",label:"Identificação",description:"Descrição",status:"Status",active:"Ativo",phone:"Telefone",email:"E-mail",amountCents:"Valor",priceCents:"Preço",totalCents:"Total",stockQuantity:"Estoque",remainingClasses:"Créditos",createdAt:"Cadastro",startsAt:"Início",endsAt:"Fim",scheduledAt:"Data",dueDate:"Vencimento",paidAt:"Pagamento",bookingTypeName:"Tipo",quantity:"Quantidade",serviceName:"Serviço",reason:"Motivo",classesDelta:"Aulas",kind:"Tipo"};
const dateFields=["startsAt","scheduledAt","paidAt","createdAt"];
type ReadDb = Pick<PrismaClient,"financialEntry"> & Record<string,unknown>;
export async function readArenaData(tx:Prisma.TransactionClient,arenaId:string,input:string,canRead:(permission:string)=>boolean,now=new Date()):Promise<string|null>{
 const intent=assistantReadIntent(input);if(!intent)return null;if(!canRead(intent.permission))throw Error("Você não tem permissão para consultar este módulo.");
 const {from,to}=assistantPeriod(input,now);const text=normalized(input);const period=`${from.toLocaleDateString("pt-BR")} a ${to.toLocaleDateString("pt-BR")}`;
 if(intent.kind==="finance"){
  const pending = ["receivable", "payable", "overdue"].includes(intent.mode);
  const includeOverdue = /ate hoje|inclu.*(?:atras|vencid)|(?:atrasad|vencid).* e /.test(text);
  // Due dates from finance forms are calendar dates stored at UTC midnight.
  // Receipts below are real instants and keep the arena timezone conversion.
  const dueFrom = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  const dueTo = new Date(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999));
  const today = arenaToday(now);
  const dueToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dueRange = { gte: dueFrom, lte: dueTo };
  const paidRange = { gte: arenaWallClockToInstant(from), lte: arenaWallClockToInstant(to) };
  const entries = await tx.financialEntry.findMany({
    where: pending ? { arenaId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] }, type: intent.mode === "payable" ? "EXPENSE" : { in: ["REVENUE", "INCOME"] }, dueDate: intent.mode === "overdue" ? { lt: dueToday } : includeOverdue ? { lte: dueTo } : dueRange }
      : { arenaId, status: { not: "VOIDED" }, OR: [{ paidAt: paidRange }, { status: "PAID", paidAt: null, createdAt: paidRange }, { settlements: { some: { paidAt: paidRange } } }] },
    select: dashboardEntrySelect, orderBy: [{ dueDate: "asc" }, { id: "asc" }],
  });
  const permitted = entries.filter(e => canRead(e.type === "EXPENSE" ? "finance:payable:view" : "finance:receivable:view"));
  const details = intent.details;
  if (pending) {
    const debts = permitted.filter(e => getOutstandingCents(e.amountCents, e.settlements) > 0);
    const sum = debts.reduce((total, e) => total + getOutstandingCents(e.amountCents, e.settlements), 0);
    const label = intent.mode === "overdue" ? "Inadimplência até hoje" : intent.mode === "payable" ? "A pagar" : "A receber";
    const singleDay = from.toDateString() === to.toDateString();
    const dayLabel = from.toDateString() === today.toDateString() ? "hoje" : `em ${from.toLocaleDateString("pt-BR")}`;
    const scope = intent.mode === "overdue" ? "" : includeOverdue ? ` · vencimentos até ${to.toLocaleDateString("pt-BR")}` : singleDay ? ` · vencimento ${dayLabel}` : ` · vencimentos de ${period}`;
    const summary = `${label}: ${money(sum)}${scope}. ${debts.length} ${debts.length === 1 ? "lançamento" : "lançamentos"} em aberto.`;
    if (!details) return summary;
    return summary + "\n" + debts.slice(0, 50).map(e => `${e.player?.name || e.counterpartyName || "Sem nome"} · ${e.description}: ${money(getOutstandingCents(e.amountCents, e.settlements))} · venc. ${e.dueDate?.toLocaleDateString("pt-BR", {timeZone:"UTC"})}`).join("\n") + (debts.length > 50 ? "\nExibindo os primeiros 50; o total inclui todos." : "");
  }
  if (/quadra/.test(text)) await attachBookingCourts(tx, arenaId, permitted);
  const rows = dashboardFinancialRows(permitted, "caixa", from, to);
  const revenue = rows.filter(e => e.type === "REVENUE"), expense = rows.filter(e => e.type === "EXPENSE");
  const total = (values: { value: number }[]) => values.reduce((sum, e) => sum + e.value, 0);
  if (/quadra/.test(text)) {
    const courts = new Map<string, number>();
    for (const row of revenue) {
      const links = row.scheduleParticipant?.occurrence.occurrenceCourts.map(c => ({ id: c.courtId, name: c.court.name })) ?? row.bookingCourts ?? [];
      for (const c of links) courts.set(c.name, (courts.get(c.name) || 0) + row.value / links.length);
    }
    return `Faturamento por quadra · ${period}\n${[...courts].map(([name, value]) => `${name}: ${money(value)}`).join("\n") || "Nenhuma receita de quadra no período."}`;
  }
  const summary = intent.mode === "received" ? `Recebido: ${money(total(revenue))} · ${period}.`
    : intent.mode === "spent" ? `Pago: ${money(total(expense))} · ${period}.`
    : `Fluxo de caixa · ${period}\nEntradas: ${canRead("finance:receivable:view") ? money(total(revenue)) : "Acesso restrito"}\nSaídas: ${canRead("finance:payable:view") ? money(total(expense)) : "Acesso restrito"}\nResultado: ${canRead("finance:receivable:view") && canRead("finance:payable:view") ? money(total(revenue) - total(expense)) : "Acesso restrito"}`;
  const grouped = new Map<string, number>();
  if (/categoria|forma.*pagamento/.test(text)) for (const row of revenue) { const key = /categoria/.test(text) ? row.category : row.paymentMethod; grouped.set(key, (grouped.get(key) || 0) + row.value); }
  if (grouped.size) return summary + "\n" + [...grouped].map(([name, value]) => `${name || "Não informado"}: ${money(value)}`).join("\n");
  if (!details) return summary;
  const selected = intent.mode === "received" ? revenue : intent.mode === "spent" ? expense : rows;
  return summary + "\n" + selected.slice(0, 50).map(e => `${e.date.toLocaleDateString("pt-BR")} · ${e.counterpartyName} · ${e.description}: ${money(e.value)}`).join("\n") + (selected.length > 50 ? "\nExibindo as primeiras 50 baixas; o total inclui todas." : "");
 }

 if(intent.model==="Player" && /\b(?:ativos|inativos)\b/.test(text)){const activity=await loadClientActivity(tx,arenaId,now);const list=/inativos/.test(text)?activity.inactive:activity.active;return `Clientes ${/inativos/.test(text)?"inativos":"ativos"}: ${list.length} · janela de 120 dias.\n${list.slice(0,50).map(c=>`${c.name}${c.phone?` · ${c.phone}`:""}`).join("\n")}${list.length>50?"\nExibindo os primeiros 50 cadastros.":""}`;}
 const schema=Prisma.dmmf.datamodel.models.find(m=>m.name===intent.model);if(!schema) return `Módulo ${intent.label} indisponível.`;
 const delegateName=intent.model[0].toLowerCase()+intent.model.slice(1);
 const db=(tx as unknown as ReadDb)[delegateName] as {findMany(args:unknown):Promise<Record<string,unknown>[]>;count(args:unknown):Promise<number>};
 const allowed=schema.fields.filter(f=>f.kind!=="object"&&!f.isList&&labels[f.name]).map(f=>f.name);
 const select=Object.fromEntries(["id",...allowed].map(k=>[k,true]));const where:Record<string,unknown>=schema.fields.some(f=>f.name==="arenaId")?{arenaId}:intent.model==="CategoryMatch"||intent.model==="CategoryPair"?{competition:{arenaId}}:{}; if(!Object.keys(where).length) throw Error("Consulta sem vínculo de arena não permitida.");
 const quoted=input.match(/["“]([^"”]+)["”]/)?.[1];if(quoted){const fields=allowed.filter(k=>["name","title","label","description","phone","email"].includes(k));if(fields.length)where.OR=fields.map(key=>({[key]:{contains:quoted,mode:"insensitive"}}));}
 if(/\b(?:hoje|ontem|mes|dias|\d{1,2}\/\d{1,2})\b/.test(text)){const field=dateFields.find(key=>allowed.includes(key));if(field)where[field]={gte:["startsAt","scheduledAt"].includes(field)?from:arenaWallClockToInstant(from),lte:["startsAt","scheduledAt"].includes(field)?to:arenaWallClockToInstant(to)};}
 if(/inativ/.test(text)&&allowed.includes("active"))where.active=false;else if(/\bativ/.test(text)&&allowed.includes("active"))where.active=true;
 if(/abert/.test(text)&&allowed.includes("status"))where.status=intent.model==="Comanda"?"OPEN":"PENDING";
 const [count,records]=await Promise.all([db.count({where}),db.findMany({where,select,take:50,orderBy:allowed.includes("name")?{name:"asc"}:allowed.includes("createdAt")?{createdAt:"desc"}:{id:"asc"}})]);
 return `${intent.label}: ${count} registros${records.length<count?` (primeiros ${records.length})`:""}.\n${records.map(row=>allowed.filter(k=>row[k]!==null&&row[k]!=="").map(k=>`${labels[k]}: ${row[k] instanceof Date?arenaDateInput(row[k] as Date):k.endsWith("Cents")?money(Number(row[k])):typeof row[k]==="boolean"?row[k]?"Sim":"Não":String(row[k])}`).join(" · ")).join("\n")}`;
}
