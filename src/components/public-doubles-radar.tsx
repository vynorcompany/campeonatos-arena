import Link from "next/link";
import { PlayerAvatar } from "@/components/player-avatar";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { requestDoublesPartnerAction, updateTournamentAvailabilityAction } from "@/lib/actions/public-player-profile";
import type { DoublesRadar } from "@/lib/services/public-doubles-radar";

const sideLabel: Record<string, string> = {
  RIGHT: "Joga na direita",
  LEFT: "Joga na esquerda",
  BOTH: "Joga nos dois lados",
};

const availabilityCopy = {
  OFF: { title: "Radar pausado", detail: "Você não aparece para outros atletas no momento.", action: "Ficar disponível" },
  AVAILABLE: { title: "Disponível para torneio", detail: "Seu perfil já está no radar da arena.", action: "Procurar dupla" },
  LOOKING_FOR_PARTNER: { title: "Procurando dupla", detail: "Outros atletas podem ver que você busca um parceiro.", action: "Pausar radar" },
} as const;
const radarGenders = ["Feminino", "Masculino", "Outro"];
const radarCategories = ["Iniciante", "7ª categoria", "6ª categoria", "5ª categoria", "4ª categoria", "3ª categoria", "2ª categoria", "1ª categoria", "Profissional"];

function href(filters: { gender?: string; category?: string; athleteId?: string }) {
  const query = new URLSearchParams({ section: "radar" });
  if (filters.gender) query.set("radarGender", filters.gender);
  if (filters.category) query.set("radarCategory", filters.category);
  if (filters.athleteId) query.set("athlete", filters.athleteId);
  return `?${query.toString()}`;
}

export function PublicDoublesRadar({
  arenaSlug,
  radar,
  currentAvailability,
  selectedGender,
  selectedCategory,
}: {
  arenaSlug: string;
  radar: DoublesRadar | null;
  currentAvailability: "OFF" | "AVAILABLE" | "LOOKING_FOR_PARTNER";
  selectedGender?: string;
  selectedCategory?: string;
}) {
  if (!radar) return null;
  const current = availabilityCopy[currentAvailability];
  const nextStatus = currentAvailability === "OFF" ? "AVAILABLE" : currentAvailability === "AVAILABLE" ? "LOOKING_FOR_PARTNER" : "OFF";
  const availableGenders = [...new Set([...radarGenders, ...radar.genders])];
  const availableCategories = [...new Set([...radarCategories, ...radar.categories])];

  return <section className="athlete-portal-content-panel doubles-radar">
    <header>
      <span>RADAR DE DUPLAS</span>
      <h2>Encontre seu parceiro de torneio</h2>
      <p>Filtre atletas da arena e conheça o jogo de quem está pronto para entrar em quadra.</p>
    </header>

    <section className={`doubles-radar-status is-${currentAvailability.toLowerCase()}`}>
      <div><span aria-hidden="true">🎾</span><div><strong>{current.title}</strong><p>{current.detail}</p></div></div>
      <SafeActionForm action={updateTournamentAvailabilityAction} successMessage="Seu status no Radar foi atualizado.">
        <input type="hidden" name="arenaSlug" value={arenaSlug} />
        <input type="hidden" name="tournamentAvailability" value={nextStatus} />
        <SubmitButton label={current.action} pendingLabel="Atualizando..." className="button button-primary button-small" />
      </SafeActionForm>
    </section>

    {radar.notifications.length ? <section className="doubles-radar-notifications" aria-label="Pedidos de dupla recebidos">
      <strong>Pedidos recebidos</strong>
      {radar.notifications.map((notification) => <article key={notification.id}><span aria-hidden="true">🎾</span><div><b>{notification.title}</b><p>{notification.message}</p></div></article>)}
    </section> : null}

    {radar.selectedAthlete ? <section className="doubles-radar-profile">
      <Link href={href({ gender: selectedGender, category: selectedCategory })} className="doubles-radar-back">← Voltar ao Radar</Link>
      <PlayerAvatar className="doubles-radar-profile-avatar" photoUrl={radar.selectedAthlete.photoUrl} name={radar.selectedAthlete.name} />
      <div><span className="doubles-radar-availability">{radar.selectedAthlete.availability === "LOOKING_FOR_PARTNER" ? "Procurando dupla" : "Disponível para torneio"}</span><h3>{radar.selectedAthlete.name}</h3><p>Perfil esportivo disponível para atletas da {" "}arena.</p></div>
      <dl><div><dt>Categorias</dt><dd>{radar.selectedAthlete.categories.join(" · ")}</dd></div><div><dt>Gênero</dt><dd>{radar.selectedAthlete.gender || "Não informado"}</dd></div><div><dt>Lado de jogo</dt><dd>{sideLabel[radar.selectedAthlete.padelSide] ?? "Ainda não informado"}</dd></div></dl>
      <SafeActionForm action={requestDoublesPartnerAction} className="doubles-radar-request" successMessage="Solicitação enviada. O atleta verá o aviso no Portal."><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="targetPlayerId" value={radar.selectedAthlete.id} /><SubmitButton label="Convidar para formar dupla" pendingLabel="Enviando..." className="button button-primary button-small" /></SafeActionForm>
      <p className="doubles-radar-profile-note">Os dados de contato continuam protegidos. O convite será entregue como notificação no Portal do atleta.</p>
    </section> : <>
      <form className="doubles-radar-filters" method="get">
        <input type="hidden" name="section" value="radar" />
        <label>Sexo<select name="radarGender" defaultValue={selectedGender ?? ""}><option value="">Todos</option>{availableGenders.map((gender) => <option key={gender} value={gender}>{gender}</option>)}</select></label>
        <label>Categoria<select name="radarCategory" defaultValue={selectedCategory ?? ""}><option value="">Todas</option>{availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <div><button className="button button-primary button-small" type="submit">Filtrar</button>{selectedGender || selectedCategory ? <Link className="button button-small" href={href({})}>Limpar</Link> : null}</div>
      </form>
      <div className="doubles-radar-list">
        {radar.athletes.length ? radar.athletes.map((athlete) => <article key={athlete.id}>
          <PlayerAvatar className="doubles-radar-avatar" photoUrl={athlete.photoUrl} name={athlete.name} />
          <div className="doubles-radar-athlete-copy"><div><strong>{athlete.name}</strong><span className="doubles-radar-availability">{athlete.availability === "LOOKING_FOR_PARTNER" ? "Procurando dupla" : "Disponível"}</span></div><p>{athlete.categories.join(" · ")} · {athlete.gender || "Gênero não informado"}</p><small>{sideLabel[athlete.padelSide] ?? "Lado de jogo não informado"}</small></div>
          <Link className="button button-small" href={href({ gender: selectedGender, category: selectedCategory, athleteId: athlete.id })}>Ver perfil</Link>
        </article>) : <div className="doubles-radar-empty"><strong>Nenhum atleta encontrado</strong><span>Tente ampliar os filtros ou aguarde novos atletas entrarem no radar.</span></div>}
      </div>
    </>}
  </section>;
}
