import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { arenaDatabase } from "@/lib/arena-database";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { canEditModule } from "@/lib/permissions";
import { createStockBalanceAction } from "@/lib/actions/pos";
import { loadVisibleProductNames, visibleProductName } from "@/lib/products/visible-product-names";

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

export default async function StockBalancePage({ searchParams }: { searchParams?: Promise<{ novo?: string; historico?: string }> }) {
  const query = await searchParams;
  const creating = query?.novo === "1";
  const auth = await requireModuleView("stock");
  const canEdit = canEditModule("stock", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const prisma = arenaDatabase(auth.arenaId);
  const [products, movements] = await Promise.all([
    creating && canEdit ? prisma.product.findMany({
      where: { arenaId: auth.arenaId, active: true, isService: false },
      select: { id: true, name: true, sku: true, stockQuantity: true, minStock: true },
      orderBy: { name: "asc" }
    }) : Promise.resolve([]),
    query?.historico === "1" ? prisma.stockMovement.findMany({
      where: { arenaId: auth.arenaId, type: "ADJUST", reason: { startsWith: "Balanço " } },
      orderBy: { createdAt: "desc" },
      take: 40
    }) : Promise.resolve([])
  ]);
  const balances = !creating ? await prisma.auditEvent.findMany({ where: { arenaId: auth.arenaId, action: "STOCK_BALANCE_COMPLETED" }, select: { id: true, details: true, createdAt: true, actorName: true }, orderBy: { createdAt: "desc" }, take: 100 }) : [];
  const productNames = await loadVisibleProductNames(prisma, auth.arenaId, movements.map((movement) => movement.productId));

  return (
    <div className={viewStyles.stack_md_workspace_page_stock_balance_page}>
      <WorkspaceHeading title="Balanço de estoque">
        <Link href="/pdv/estoque" className={viewStyles.button}>Voltar ao estoque</Link>{canEdit && !creating ? <Link href="/pdv/balanco?novo=1" className={ui.primary}>Novo Balanço</Link> : null}{creating ? <Link href="/pdv/balanco" className={ui.secondary}>Voltar aos balanços</Link> : null}
      </WorkspaceHeading>

      {canEdit && creating ? <section className={ui.page}><div className={ui.toolbar}><p>Informe a contagem física. As divergências são ajustadas e registradas no histórico.</p></div>
        <SafeActionForm action={createStockBalanceAction} className={viewStyles.stock_balance_form} successHref="/pdv/balanco" successMessage="Balanço registrado.">
          <div className={viewStyles.field_stock_balance_reason}><label>
            <span>Título do balanço</span><input name="title" maxLength={100} required placeholder="Ex.: Conferência de fechamento"/></label><label><span>Observação (opcional)</span>
            <input name="reason" maxLength={80} placeholder="Ex.: fechamento de turno" />
          </label></div>
          <div className={viewStyles.stock_balance_table} role="table" aria-label="Produtos para balanço">
            <div className={viewStyles.stock_balance_row_stock_balance_head} role="row"><span>Produto</span><span>Sistema</span><span>Estoque mínimo</span><span>Contagem real</span></div>
            {products.map((product) => (
              <label className={viewStyles.stock_balance_row} key={product.id}>
                <span><strong>{product.name}</strong><small>{product.sku || "Sem SKU"}</small></span>
                <span><small><span className="tw:hidden tw:viewport-760:inline">Sistema</span></small><b>{product.stockQuantity}</b></span>
                <span><small><span className="tw:hidden tw:viewport-760:inline">Estoque mínimo</span></small>{product.minStock}</span>
                <input name={`count_${product.id}`} inputMode="numeric" type="number" min="0" step="1" placeholder="Não contado" aria-label={`Contagem real de ${product.name}`} />
              </label>
            ))}
          </div>
          {!products.length ? <p className={viewStyles.muted}>Cadastre produtos ativos para iniciar o balanço.</p> : null}
          <div className={viewStyles.stock_balance_actions}><SubmitButton label="Finalizar balanço" pendingLabel="Registrando balanço..." className={viewStyles.button_button_primary} /></div>
        </SafeActionForm>
      </section> : null}

      {!creating ? <div className={ui.list}><div className={`${ui.head} tw:grid-cols-[minmax(0,1fr)_170px_170px]`}><span>Balanço</span><span>Data</span><span>Responsável</span></div>{balances.map(balance => { const details = balance.details as { title?: string }; return <Link key={balance.id} href={`/pdv/balanco/${balance.id}`} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_170px_170px] tw:text-[#15385f] tw:no-underline tw:hover:bg-blue-50 tw:viewport-760:grid-cols-1`}><strong>{details.title || "Balanço de estoque"}</strong><time>{balance.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time><span>{balance.actorName}</span></Link>; })}{!balances.length ? <p className={ui.empty}>Nenhum balanço concluído.</p> : null}</div> : null}
      {!creating ? <Link href="/pdv/balanco?historico=1" className={ui.secondary}>Consultar ajustes anteriores</Link> : null}
      {query?.historico === "1" ? <section className={ui.page}><h2 className="tw:m-0 tw:text-sm tw:font-semibold">Ajustes anteriores</h2>
        {movements.length ? <div className={viewStyles.stock_balance_report}>
          {movements.map((movement) => {
            const match = movement.reason.match(/sistema: (\d+) \| contado: (\d+) \| diferença: ([+-]?\d+)/);
            const difference = match ? Number(match[3]) : 0;
            return <article key={movement.id} className={cx(difference === 0 ? "" : difference < 0 ? "is-loss" : "is-surplus")}>
              <div><strong>{visibleProductName(productNames, movement.productId)}</strong><span>{movement.createdAt.toLocaleString("pt-BR")}</span><small>{movement.reason}</small></div>
              <b>{signed(difference)}</b>
            </article>;
          })}
        </div> : <p className={viewStyles.muted}>Nenhum balanço concluído ainda.</p>}
      </section> : null}
    </div>
  );
}
