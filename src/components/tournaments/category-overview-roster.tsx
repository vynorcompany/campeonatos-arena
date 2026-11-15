import Link from "next/link";
import { ClientAvatar } from "@/components/players/client-avatar";
import { LeagueIcon } from "./league-icon";
import { tournamentWorkspace as ui } from "./tournament-workspace";

type Pair = { id: string; name: string; groupId: string | null; players: { player: { id: string; name: string } }[] };
export function CategoryOverviewRoster({ pairs, groups, registrationsHref }: { pairs: Pair[]; groups: { id: string; name: string }[]; registrationsHref: string }) {
 return <section className="tw:grid tw:min-w-0 tw:gap-2" aria-label="Duplas da categoria">
  <div className={`${ui.head} tw:grid-cols-[minmax(0,1fr)_minmax(120px,.4fr)_64px]`}><span>Dupla</span><span>Grupo</span><span>Ações</span></div>
  <div className={ui.list}>{pairs.length ? pairs.map(pair=><article key={pair.id} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_minmax(120px,.4fr)_64px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto]`}>
   <div className="tw:grid tw:min-w-0 tw:gap-1">{pair.players.length ? pair.players.map(({player})=><span key={player.id} className="tw:flex tw:min-w-0 tw:items-center tw:gap-2"><ClientAvatar name={player.name}/><span className="tw:min-w-0 tw:break-words">{player.name}</span></span>) : <span>{pair.name}</span>}</div>
   <span className="tw:text-xs tw:text-[var(--muted)] tw:viewport-760:col-start-1">{groups.find(group=>group.id===pair.groupId)?.name ?? "Aguardando sorteio"}</span>
   <Link href={`${registrationsHref}#pair-${pair.id}`} className={`${ui.icon} tw:viewport-760:col-start-2 tw:viewport-760:row-start-1`} aria-label={`Gerenciar dupla ${pair.name}`} title="Gerenciar dupla"><LeagueIcon name="edit"/></Link>
  </article>) : <p className={ui.empty}>Nenhuma dupla inscrita.</p>}</div>
 </section>;
}
