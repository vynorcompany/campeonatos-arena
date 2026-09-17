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

type PosPageProps = { searchParams?: Promise<{ q?: string; sku?: string; category?: string; stock?: string; active?: string }> };

export default async function PosPage(props: PosPageProps) {
  const searchParams = await props.searchParams;
  const auth = await requireModuleView("pos");
  const query = searchParams?.q?.trim() ?? "";
  const sku = searchParams?.sku?.trim() ?? "";
  const categoryId = searchParams?.category?.trim() ?? "";
  const stock = searchParams?.stock === "LOW" || searchParams?.stock === "AVAILABLE" ? searchParams.stock : "ALL";
  const active = searchParams?.active === "ACTIVE" || searchParams?.active === "INACTIVE" ? searchParams.active : "ALL";
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
    where: {
      arenaId: auth.arenaId,
      ...(active === "ALL" ? {} : { active: active === "ACTIVE" }),
      ...(categoryId ? { categoryId } : {}),
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      ...(sku ? { sku: { contains: sku, mode: "insensitive" } } : {})
    },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  }),
    prisma.productCategory.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);
  const filteredProducts = products.filter((product) => stock === "ALL" || (stock === "LOW" ? product.stockQuantity <= product.minStock : product.stockQuantity > product.minStock));

  return (
    <div className="product-management stack-md">
      <header className="product-management-header">
        <h1>Produtos e Serviços</h1>
        <div className="product-management-actions">
          <Link href="/financeiro/configuracoes/notas-fiscais" className="button button-small button-import">Importar XML/NF-e</Link>
          <button type="button" className="button button-small button-import-csv" disabled title="Importação CSV será disponibilizada em breve">Importar CSV</button>
          <Link href="/pdv/novo" className="button button-small button-primary">Criar produto/serviço</Link>
        </div>
      </header>

      <form className="product-management-filters" aria-label="Filtros de produtos">
        <header><strong>Filtros</strong><div><button type="submit" className="button button-small button-primary">Aplicar</button><Link href="/pdv" className="button button-small">Limpar</Link></div></header>
        <div>
          <label>Descrição<input name="q" defaultValue={query} placeholder="Nome do produto" /></label>
          <label>Código interno<input name="sku" defaultValue={sku} placeholder="SKU/código" /></label>
          <label>Categoria<select name="category" defaultValue={categoryId}><option value="">Todas as categorias</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Estoque<select name="stock" defaultValue={stock}><option value="ALL">Todos os níveis</option><option value="LOW">Abaixo do mínimo</option><option value="AVAILABLE">Disponível</option></select></label>
          <label>Situação<select name="active" defaultValue={active}><option value="ALL">Todos</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select></label>
        </div>
      </form>

      <SectionCard id="estoque" title="Listagem" description="Clique em um produto para configurar dados, estoque e NFC-e."><div className="product-list-head"><span>Produto</span><span>Preço de venda</span><span>Estoque</span><span>Mínimo</span><span>Ações</span></div><div className="product-list">{filteredProducts.map((product) => <article className="product-row" key={product.id}><Link href={`/pdv/${product.id}`} className="product-table-link"><strong>{product.name}</strong><span>{product.sku || "Sem SKU"}</span></Link><span>{formatMoney(product.priceCents)}</span><span className={product.stockQuantity <= product.minStock ? "stock-alert" : ""}>{product.stockQuantity}</span><span>{product.minStock}</span><Link href={`/pdv/${product.id}`} className="button button-small">Abrir</Link></article>)}{!filteredProducts.length ? <p className="client-empty">Nenhum produto corresponde aos filtros.</p> : null}</div></SectionCard>
    </div>
  );
}
