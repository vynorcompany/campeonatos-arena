import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

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
  const [products, sales, stockMovements] = await Promise.all([
    prisma.product.findMany({ where: { arenaId: auth.arenaId }, orderBy: { name: "asc" } }),
    prisma.sale.findMany({ where: { arenaId: auth.arenaId, createdAt: { gte: start, lt: end } } }),
    prisma.stockMovement.findMany({
      where: { arenaId: auth.arenaId, createdAt: { gte: start, lt: end } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);
  const pdvRevenue = sales.reduce((total, sale) => total + sale.totalCents, 0);
  const stockValue = products.reduce((total, product) => total + product.stockQuantity * product.priceCents, 0);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Financeiro</p>
          <h1>PDV e estoque</h1>
          <p className="muted">Veja o impacto financeiro das vendas e do estoque parado.</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{formatMoney(pdvRevenue)}</strong>
          <span>vendas do mês no PDV</span>
        </div>
        <div className="stat-card">
          <strong>{formatMoney(stockValue)}</strong>
          <span>valor em estoque</span>
        </div>
        <div className="stat-card">
          <strong>{products.length}</strong>
          <span>produtos cadastrados</span>
        </div>
      </div>

      <SectionCard title="Movimentações do mês" description="Entradas, saídas, vendas e ajustes de estoque.">
        <div className="simple-list">
          {stockMovements.map((movement) => (
            <div className="simple-item" key={movement.id}>
              <strong>{movement.product.name}</strong>
              <span>
                {movement.type} de {movement.quantity} un. - {movement.reason || "Sem motivo"}
              </span>
            </div>
          ))}
          {!stockMovements.length ? <p className="muted">Nenhuma movimentação de estoque neste mês.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
