import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export default async function PosPage() {
  const auth = await requireModuleView("pos");
  const products = await prisma.product.findMany({
    where: { arenaId: auth.arenaId },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });

  return (
    <div className="product-management stack-md">
      <header className="product-management-header">
        <h1>Produtos e Serviços</h1>
        <div className="product-management-actions">
          <button type="button" className="button button-import" disabled title="Importação de nota será disponibilizada em breve">Importar nota de compra</button>
          <button type="button" className="button button-import-csv" disabled title="Importação CSV será disponibilizada em breve">Importar CSV</button>
          <Link href="/pdv/novo" className="button button-primary">Criar produto/serviço</Link>
        </div>
      </header>

      <section className="product-management-filters" aria-label="Filtros de produtos">
        <header><strong>Filtros</strong><div><button type="button" className="button button-small button-primary">Aplicar filtros</button><button type="button" className="button button-small">Limpar</button></div></header>
        <div>
          <label>Descrição<input placeholder="Nome do produto" /></label>
          <label>Código interno<input placeholder="SKU/código" /></label>
          <label>Categoria<select defaultValue=""><option value="">Todas as categorias</option></select></label>
          <label>Estoque<select defaultValue=""><option value="">Todos os níveis</option><option value="low">Abaixo do mínimo</option><option value="available">Disponível</option></select></label>
          <label className="control-toggle"><input type="checkbox" defaultChecked /><span aria-hidden="true" /><em>Ativo</em></label>
        </div>
      </section>

      <SectionCard id="estoque" title="Listagem" description="Clique em um produto para configurar dados, estoque e NFC-e.">
        <table className="data-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Mínimo</th>
              <th>Abrir</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td><Link href={`/pdv/${product.id}`} className="product-table-link"><strong>{product.name}</strong><span className="table-subtext">{product.sku || "Sem SKU"}</span></Link></td>
                <td>{formatMoney(product.priceCents)}</td>
                <td>
                  <span className={product.stockQuantity <= product.minStock ? "stock-alert" : ""}>{product.stockQuantity}</span>
                </td>
                <td>{product.minStock}</td>
                <td><Link href={`/pdv/${product.id}`} className="button button-small">Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
