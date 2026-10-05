import { viewStyles } from "./page.utilities";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
  };
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function FinancePdvStockPage() {
  const auth = await requireModuleView("finance");
  const { start, end } = getMonthRange();
  const [products, sales, stockMovements] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.product.findMany({ where: { arenaId: auth.arenaId }, orderBy: { name: "asc" } }),
    tx.sale.findMany({ where: { arenaId: auth.arenaId, createdAt: { gte: start, lt: end } } }),
    tx.stockMovement.findMany({
      where: { arenaId: auth.arenaId, createdAt: { gte: start, lt: end } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]));
  const pdvRevenue = sales.reduce((total, sale) => total + sale.totalCents, 0);
  const stockValue = products.reduce((total, product) => total + product.stockQuantity * product.priceCents, 0);

  return (
    <div className={viewStyles.stack_md}>

      <div className={viewStyles.stats_grid}>
        <div className={viewStyles.stat_card}>
          <strong>{formatMoney(pdvRevenue)}</strong>
          <span>vendas do mês no PDV</span>
        </div>
        <div className={viewStyles.stat_card}>
          <strong>{formatMoney(stockValue)}</strong>
          <span>valor em estoque</span>
        </div>
        <div className={viewStyles.stat_card}>
          <strong>{products.length}</strong>
          <span>produtos cadastrados</span>
        </div>
      </div>

      <SectionCard title="Movimentações do mês" description="Entradas, saídas, vendas e ajustes de estoque.">
        <div className={viewStyles.simple_list}>
          {stockMovements.map((movement) => (
            <div className={viewStyles.simple_item} key={movement.id}>
              <strong>{movement.product.name}</strong>
              <span>
                {movement.type} de {movement.quantity} un. - {movement.reason || "Sem motivo"}
              </span>
            </div>
          ))}
          {!stockMovements.length ? <p className={viewStyles.muted}>Nenhuma movimentação de estoque neste mês.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
