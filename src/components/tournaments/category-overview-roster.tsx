import Link from "next/link";
import { ClientAvatar } from "@/components/players/client-avatar";
import { LeagueIcon } from "./league-icon";
import { tournamentWorkspace as ui } from "./tournament-workspace";

type Pair = { id: string; name: string; groupId: string | null; players: { player: { id: string; name: string } }[] };
export function CategoryOverviewRoster({ pairs, groups, registrationsHref, trio = false }: { pairs: Pair[]; groups: { id: string; name: string }[]; registrationsHref: string; trio?: boolean }) {
 return <section className="tw:grid tw:min-w-0 tw:gap-3 tw:rounded-md tw:border tw:border-[#e1e4e9] tw:bg-white tw:p-4" aria-label={trio ? "Trios da categoria" : "Duplas da categoria"}>
  <header className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><h2 className="tw:m-0 tw:text-base tw:font-medium">{trio ? "Trios" : "Duplas"} <span className="tw:text-xs tw:font-normal tw:text-[#465c75]">· {pairs.length}</span></h2><Link href={registrationsHref} className={ui.primary}>Gerenciar</Link></header>
  <div className={`${ui.head} tw:grid-cols-[minmax(0,1fr)_minmax(120px,.4fr)_64px]`}><span>{trio ? "Trio" : "Dupla"}</span><span>Grupo</span><span>Ações</span></div>
  <div className={ui.list}>{pairs.length ? pairs.map(pair=><article key={pair.id} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_minmax(120px,.4fr)_64px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto]`}>
   <div className="tw:grid tw:min-w-0 tw:gap-1">{pair.players.length ? pair.players.map(({player})=><span key={player.id} className="tw:flex tw:min-w-0 tw:items-center tw:gap-2"><ClientAvatar name={player.name}/><span className="tw:min-w-0 tw:break-words">{player.name}</span></span>) : <span>{pair.name}</span>}</div>
   <span className="tw:text-xs tw:text-[var(--muted)] tw:viewport-760:col-start-1">{groups.find(group=>group.id===pair.groupId)?.name ?? "Aguardando sorteio"}</span>
   <Link href={`${registrationsHref}#pair-${pair.id}`} className={`${ui.icon} tw:viewport-760:col-start-2 tw:viewport-760:row-start-1`} aria-label={`Gerenciar ${trio ? "trio" : "dupla"} ${pair.name}`} title="Gerenciar dupla"><LeagueIcon name="edit"/></Link>
  </article>) : <p className={ui.empty}>{trio ? "Nenhum trio inscrito." : "Nenhuma dupla inscrita."}</p>}</div>
 </section>;
}
