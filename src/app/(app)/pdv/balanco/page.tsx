import { arenaDatabase } from "@/lib/arena-database";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { createStockBalanceAction } from "@/lib/actions/pos";
import { prisma } from "@/lib/prisma";

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

export default async function StockBalancePage() {
  const auth = await requireModuleView("stock");
  const prisma = arenaDatabase(auth.arenaId);
  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { arenaId: auth.arenaId, active: true },
      select: { id: true, name: true, sku: true, stockQuantity: true, minStock: true },
      orderBy: { name: "asc" }
    }),
    prisma.stockMovement.findMany({
      where: { arenaId: auth.arenaId, type: "ADJUST", reason: { startsWith: "Balanço " } },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 40
    })
  ]);

  return (
    <div className={viewStyles.stack_md_workspace_page_stock_balance_page}>
      <h1 className={viewStyles.sr_only}>Balanço de estoque</h1>
      <header className={viewStyles.page_header}>
        <Link href="/pdv/estoque" className={viewStyles.button}>Voltar ao estoque</Link>
      </header>

      <section className={ui.page}><div className={ui.toolbar}><p>Informe a contagem física. As divergências são ajustadas e registradas no histórico.</p></div>
        <SafeActionForm action={createStockBalanceAction} className={viewStyles.stock_balance_form} successMessage="Balanço registrado. As divergências foram atualizadas no relatório abaixo.">
          <label className={viewStyles.field_stock_balance_reason}>
            <span>Observação do balanço (opcional)</span>
            <input name="reason" maxLength={80} placeholder="Ex.: fechamento de turno" />
          </label>
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
      </section>

      <section className={ui.page}><h2 className="tw:m-0 tw:text-sm tw:font-semibold">Relatório de divergências</h2>
        {movements.length ? <div className={viewStyles.stock_balance_report}>
          {movements.map((movement) => {
            const match = movement.reason.match(/sistema: (\d+) \| contado: (\d+) \| diferença: ([+-]?\d+)/);
            const difference = match ? Number(match[3]) : 0;
            return <article key={movement.id} className={cx(difference === 0 ? "" : difference < 0 ? "is-loss" : "is-surplus")}>
              <div><strong>{movement.product.name}</strong><span>{movement.createdAt.toLocaleString("pt-BR")}</span><small>{movement.reason}</small></div>
              <b>{signed(difference)}</b>
            </article>;
          })}
        </div> : <p className={viewStyles.muted}>Nenhum balanço concluído ainda.</p>}
      </section>
    </div>
  );
}
