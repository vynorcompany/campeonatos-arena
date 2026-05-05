import { SectionCard } from "@/components/section-card";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { adjustStockAction, createProductAction } from "@/lib/actions/pos";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const paymentLabels: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  CASH: "Dinheiro",
  OTHER: "Outro"
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export default async function PosPage() {
  const auth = await requireModuleView("pos");
  const [products, sales, stockMovements] = await Promise.all([
    prisma.product.findMany({
      where: { arenaId: auth.arenaId },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    }),
    prisma.sale.findMany({
      where: { arenaId: auth.arenaId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.stockMovement.findMany({
      where: { arenaId: auth.arenaId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);

  const lowStockCount = products.filter((product) => product.stockQuantity <= product.minStock).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = sales.filter((sale) => sale.createdAt >= today);
  const todayTotal = todaySales.reduce((total, sale) => total + sale.totalCents, 0);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">PDV e estoque</p>
          <h1>Frente de caixa</h1>
          <p className="muted">
            Venda produtos, acompanhe pagamentos, controle estoque mínimo e registre entradas ou saídas de mercadorias.
          </p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{formatMoney(todayTotal)}</strong>
          <span>vendido hoje</span>
        </div>
        <div className="stat-card">
          <strong>{products.length}</strong>
          <span>produtos cadastrados</span>
        </div>
        <div className="stat-card">
          <strong>{lowStockCount}</strong>
          <span>itens em alerta de estoque</span>
        </div>
      </div>

      <SectionCard title="Frente de caixa" description="Abra o caixa dedicado para montar a venda com vários produtos, quantidades e forma de pagamento.">
        <div className="pos-launch-panel">
          <div>
            <span className="eyebrow">Caixa</span>
            <strong>Venda rápida com carrinho</strong>
            <p className="muted">Ideal para operar como um PDV de mercado: toque nos produtos, ajuste quantidades e finalize a compra.</p>
          </div>
          <Link href="/pdv/caixa" className="button button-primary">
            Abrir caixa
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Cadastrar produto" description="Produtos cadastrados aparecem na frente de caixa e no controle de estoque.">
        <SafeActionForm action={createProductAction} className="grid-form" resetOnSuccess successMessage="Produto salvo.">
          <div className="field">
            <label htmlFor="product-name">Produto</label>
            <input id="product-name" name="name" type="text" placeholder="Ex.: Agua sem gas" required />
          </div>
          <div className="field">
            <label htmlFor="product-sku">Código/SKU</label>
            <input id="product-sku" name="sku" type="text" />
          </div>
          <div className="field">
            <label htmlFor="product-price">Preço</label>
            <input id="product-price" name="price" type="text" placeholder="12,90" required />
          </div>
          <div className="field">
            <label htmlFor="product-stock">Estoque inicial</label>
            <input id="product-stock" name="stockQuantity" type="number" min="0" defaultValue="0" />
          </div>
          <div className="field">
            <label htmlFor="product-min-stock">Estoque mínimo</label>
            <input id="product-min-stock" name="minStock" type="number" min="0" defaultValue="0" />
          </div>
          <div className="field field-submit">
            <SubmitButton label="Cadastrar produto" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard id="estoque" title="Estoque" description="Ajuste entradas, saídas e contagens. Itens no mínimo aparecem destacados.">
        <table className="data-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Mínimo</th>
              <th>Ajuste</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <span className="table-subtext">{product.sku || "Sem SKU"}</span>
                </td>
                <td>{formatMoney(product.priceCents)}</td>
                <td>
                  <span className={product.stockQuantity <= product.minStock ? "stock-alert" : ""}>{product.stockQuantity}</span>
                </td>
                <td>{product.minStock}</td>
                <td>
                  <SafeActionForm action={adjustStockAction} className="inline-form stock-adjust-form" successMessage="Estoque ajustado.">
                    <input type="hidden" name="productId" value={product.id} />
                    <select name="type" defaultValue="IN" aria-label="Tipo de ajuste">
                      <option value="IN">Entrada</option>
                      <option value="OUT">Saida</option>
                      <option value="ADJUST">Contagem</option>
                    </select>
                    <input name="quantity" type="number" min="0" defaultValue="1" />
                    <input name="reason" type="text" placeholder="Motivo" />
                    <SubmitButton label="Salvar" pendingLabel="..." className="button" />
                  </SafeActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard id="historico" title="Últimas vendas" description="Histórico recente da frente de caixa.">
          <div className="simple-list">
            {sales.map((sale) => (
              <div className="simple-item" key={sale.id}>
                <strong>{sale.code}</strong>
                <span>
                  {formatMoney(sale.totalCents)} - {paymentLabels[sale.paymentMethod] ?? sale.paymentMethod} - {formatDate(sale.createdAt)}
                </span>
                <span>{sale.items.map((item) => `${item.quantity}x ${item.product.name}`).join(", ")}</span>
              </div>
            ))}
            {!sales.length ? <p className="muted">Nenhuma venda registrada ainda.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Movimentações de estoque" description="Entradas, saídas, vendas e ajustes manuais.">
          <div className="simple-list">
            {stockMovements.map((movement) => (
              <div className="simple-item" key={movement.id}>
                <strong>{movement.product.name}</strong>
                <span>
                  {movement.type} {movement.quantity} un. - {movement.reason || "Sem motivo"} - {formatDate(movement.createdAt)}
                </span>
              </div>
            ))}
            {!stockMovements.length ? <p className="muted">Nenhuma movimentação registrada ainda.</p> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
