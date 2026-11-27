import { BoletoQueueTable } from "@/components/finance/boleto-queue-table";
import { canPerformPermission } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/guards";
import { getBoletoQueue } from "@/lib/finance/boleto-queue-data";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export default async function BoletoQueuePage(props:{searchParams:Promise<{status?:string;q?:string}>}) {
 const auth=await requirePermission("finance:receivable:view"),params=await props.searchParams;
 const status=["queue","issued","canceled"].includes(params.status||"")?params.status!:"queue";
 const q=String(params.q||"").trim().slice(0,120);
 const { rows, capped } = await getBoletoQueue(auth.arenaId,status as "queue"|"issued"|"canceled",q);
 const canEdit=canPerformPermission("finance:receivable:edit",auth.arenaRole,auth.systemRole,auth.editPermissions);
 return <div className={ui.page}><form className={ui.filters}><label className={ui.field}>Pesquisar<input name="q" defaultValue={q} placeholder="Cliente ou lançamento"/></label><label className={ui.field}>Exibição<select name="status" defaultValue={status}><option value="queue">Aguardando emissão</option><option value="issued">Emitidos</option><option value="canceled">Cancelados</option></select></label><button className={ui.primary}>Filtrar</button></form><BoletoQueueTable canGenerate={canPerformPermission("finance:receivable:settle",auth.arenaRole,auth.systemRole,auth.editPermissions)} canEdit={canEdit} canceled={status==="canceled"} rows={rows}/>{capped?<p className={ui.empty}>Exibindo até 200 registros. Use a pesquisa para localizar uma cobrança.</p>:null}</div>;
}
