import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { createStockBalanceAction } from "@/lib/actions/pos";
import { prisma } from "@/lib/prisma";

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

export default async function StockBalancePage() {
  const auth = await requireModuleView("stock");
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
    <div className="stack-md workspace-page stock-balance-page">
      <h1 className="sr-only">Balanço de estoque</h1>
      <header className="page-header">
        <Link href="/pdv/estoque" className="button">Voltar ao estoque</Link>
      </header>

      <SectionCard title="Contagem física" description="Ao finalizar, o sistema ajusta somente as divergências e registra o furo de cada produto no histórico abaixo.">
        <SafeActionForm action={createStockBalanceAction} className="stock-balance-form" successMessage="Balanço registrado. As divergências foram atualizadas no relatório abaixo.">
          <label className="field stock-balance-reason">
            <span>Observação do balanço (opcional)</span>
            <input name="reason" maxLength={80} placeholder="Ex.: fechamento de turno" />
          </label>
          <div className="stock-balance-table" role="table" aria-label="Produtos para balanço">
            <div className="stock-balance-row stock-balance-head" role="row"><span>Produto</span><span>Sistema</span><span>Estoque mínimo</span><span>Contagem real</span></div>
            {products.map((product) => (
              <label className="stock-balance-row" key={product.id}>
                <span><strong>{product.name}</strong><small>{product.sku || "Sem SKU"}</small></span>
                <b>{product.stockQuantity}</b>
                <span>{product.minStock}</span>
                <input name={`count_${product.id}`} inputMode="numeric" type="number" min="0" step="1" placeholder="Não contado" aria-label={`Contagem real de ${product.name}`} />
              </label>
            ))}
          </div>
          {!products.length ? <p className="muted">Cadastre produtos ativos para iniciar o balanço.</p> : null}
          <div className="stock-balance-actions"><SubmitButton label="Finalizar balanço" pendingLabel="Registrando balanço..." className="button button-primary" /></div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Relatório de divergências" description="Últimos ajustes originados por balanços de estoque.">
        {movements.length ? <div className="stock-balance-report">
          {movements.map((movement) => {
            const match = movement.reason.match(/sistema: (\d+) \| contado: (\d+) \| diferença: ([+-]?\d+)/);
            const difference = match ? Number(match[3]) : 0;
            return <article key={movement.id} className={difference === 0 ? "" : difference < 0 ? "is-loss" : "is-surplus"}>
              <div><strong>{movement.product.name}</strong><span>{movement.createdAt.toLocaleString("pt-BR")}</span><small>{movement.reason}</small></div>
              <b>{signed(difference)}</b>
            </article>;
          })}
        </div> : <p className="muted">Nenhum balanço concluído ainda.</p>}
      </SectionCard>
    </div>
  );
}
