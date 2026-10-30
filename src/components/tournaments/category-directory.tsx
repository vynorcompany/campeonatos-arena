import Link from "next/link";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
const formats: Record<string, string> = { LEAGUE: "Liga", THREE_GROUPS: "3 grupos", FOUR_GROUPS: "4 grupos", SIMPLE: "Simples" };
export function CategoryDirectory({ tournamentId, categories }: { tournamentId: string; categories: { id: string; name: string; competition: { format: string; pairCount: number } | null }[] }) {
  return <div className="tw:grid tw:min-w-0 tw:gap-3">
    <div className="tw:flex tw:justify-end"><Link href={`/torneios/${tournamentId}/categorias/nova`} className={ui.primary}>Adicionar categoria</Link></div>
    <section className={ui.list} aria-label="Categorias do evento">
      <div className={`${ui.head} tw:grid-cols-[minmax(0,1fr)_120px_100px_90px]`}><span>Categoria</span><span>Formato</span><span>Duplas</span><span className="tw:text-right">Ação</span></div>
      {categories.map(category => <article key={category.id} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_120px_100px_90px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto]`}><strong>{category.name}</strong><span className="tw:text-xs">{category.competition ? formats[category.competition.format] : "Configurar"}</span><span className="tw:text-xs">{category.competition?.pairCount ?? 0} duplas</span><Link href={`/torneios/${tournamentId}/categorias/${category.id}`} className={`${ui.secondary} tw:justify-self-end`}>Entrar</Link></article>)}
      {!categories.length ? <p className={ui.empty}>Nenhuma categoria cadastrada.</p> : null}
    </section>
  </div>;
}
