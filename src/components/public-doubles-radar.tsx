import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-doubles-radar.utilities";
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
const mobileRadarSkin = [
  "tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:bg-white! tw:viewport-700:p-0! tw:viewport-700:dark:border-[#244759]! tw:viewport-700:dark:bg-[#102f42]!",
  "tw:viewport-700:[&_.doubles-radar-hero]:min-h-0! tw:viewport-700:[&_.doubles-radar-hero]:bg-transparent! tw:viewport-700:[&_.doubles-radar-hero]:[background-image:none]! tw:viewport-700:[&_.doubles-radar-hero_>_span]:hidden!",
  "tw:viewport-700:[&_.doubles-radar-hero_h2]:text-[#133047]! tw:viewport-700:[&_.doubles-radar-hero_p]:text-[#607e8d]! tw:viewport-700:dark:[&_.doubles-radar-hero_h2]:text-[#eff8f8]! tw:viewport-700:dark:[&_.doubles-radar-hero_p]:text-[#a1bccb]!",
  "tw:viewport-700:[&_.doubles-radar-status]:border-[#d8e5e9]! tw:viewport-700:[&_.doubles-radar-status]:bg-[#f5f8f8]! tw:viewport-700:[&_.doubles-radar-status]:[background-image:none]! tw:viewport-700:[&_.doubles-radar-status_strong]:text-[#133047]! tw:viewport-700:[&_.doubles-radar-status_p]:text-[#607e8d]!",
  "tw:viewport-700:dark:[&_.doubles-radar-status]:border-[#244759]! tw:viewport-700:dark:[&_.doubles-radar-status]:bg-[#14374a]! tw:viewport-700:dark:[&_.doubles-radar-status_strong]:text-[#eff8f8]! tw:viewport-700:dark:[&_.doubles-radar-status_p]:text-[#a1bccb]!",
  "tw:viewport-700:[&_.doubles-radar-status_button]:bg-[#078f7c]! tw:viewport-700:[&_.doubles-radar-status_button]:[background-image:none]! tw:viewport-700:dark:[&_.doubles-radar-status_button]:bg-[#5bdec1]!",
  "tw:viewport-700:[&_.doubles-radar-filters]:border-[#d8e5e9]! tw:viewport-700:[&_.doubles-radar-filters]:bg-white! tw:viewport-700:[&_.doubles-radar-filters]:[background-image:none]! tw:viewport-700:[&_.doubles-radar-filters_strong]:text-[#133047]! tw:viewport-700:[&_.doubles-radar-filters_label]:text-[#133047]!",
  "tw:viewport-700:[&_.doubles-radar-filters_select]:border-[#c9dbe2]! tw:viewport-700:[&_.doubles-radar-filters_select]:bg-[#f5f8f8]! tw:viewport-700:[&_.doubles-radar-filters_select]:text-[#133047]!",
  "tw:viewport-700:[&_.doubles-radar-filters_select]:[background-image:none]!",
  "tw:viewport-700:dark:[&_.doubles-radar-filters]:border-[#244759]! tw:viewport-700:dark:[&_.doubles-radar-filters]:bg-[#102f42]! tw:viewport-700:dark:[&_.doubles-radar-filters_strong]:text-[#eff8f8]! tw:viewport-700:dark:[&_.doubles-radar-filters_label]:text-[#eff8f8]!",
  "tw:viewport-700:dark:[&_.doubles-radar-filters_select]:border-[#366075]! tw:viewport-700:dark:[&_.doubles-radar-filters_select]:bg-[#14374a]! tw:viewport-700:dark:[&_.doubles-radar-filters_select]:text-[#eff8f8]!",
  "tw:viewport-700:[&_.doubles-radar-filters_button]:bg-[#078f7c]! tw:viewport-700:dark:[&_.doubles-radar-filters_button]:bg-[#5bdec1]!",
  "tw:viewport-700:[&_.doubles-radar-list_>_header_strong]:text-[#133047]! tw:viewport-700:dark:[&_.doubles-radar-list_>_header_strong]:text-[#eff8f8]!",
  "tw:viewport-700:[&_.doubles-radar-empty]:bg-[#f5f8f8]! tw:viewport-700:[&_.doubles-radar-empty_strong]:text-[#133047]! tw:viewport-700:[&_.doubles-radar-empty_span]:text-[#607e8d]!",
  "tw:viewport-700:dark:[&_.doubles-radar-empty]:bg-[#14374a]! tw:viewport-700:dark:[&_.doubles-radar-empty_strong]:text-[#eff8f8]! tw:viewport-700:dark:[&_.doubles-radar-empty_span]:text-[#a1bccb]!",
].join(" ");

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

  return <section className={cx(viewStyles.athlete_portal_content_panel_doubles_radar, mobileRadarSkin)}>
    <header className={viewStyles.doubles_radar_hero}>
      <span>RADAR DE DUPLAS</span>
      <h2>Encontre seu parceiro de torneio</h2>
      <p>Filtre atletas da arena e conheça o jogo de quem está pronto para entrar em quadra.</p>
      <RadarIcon icon="ball" />
    </header>

    {radar.selectedAthlete ? <section className={viewStyles.doubles_radar_profile}>
      <Link href={href({ gender: selectedGender, category: selectedCategory })} className={viewStyles.doubles_radar_back}>← Voltar ao Radar</Link>
      <PlayerAvatar className={viewStyles.doubles_radar_profile_avatar} photoUrl={radar.selectedAthlete.photoUrl} name={radar.selectedAthlete.name} />
      <div><span className={viewStyles.doubles_radar_availability}>{radar.selectedAthlete.availability === "LOOKING_FOR_PARTNER" ? "Procurando dupla" : "Disponível para torneio"}</span><h3>{radar.selectedAthlete.name}</h3><p>Perfil esportivo disponível para atletas da {" "}arena.</p></div>
      <dl><div><dt>Categorias</dt><dd>{radar.selectedAthlete.categories.join(" · ")}</dd></div><div><dt>Gênero</dt><dd>{radar.selectedAthlete.gender || "Não informado"}</dd></div><div><dt>Lado de jogo</dt><dd>{sideLabel[radar.selectedAthlete.padelSide] ?? "Ainda não informado"}</dd></div></dl>
      <SafeActionForm action={requestDoublesPartnerAction} className={viewStyles.doubles_radar_request} successMessage="Solicitação enviada. O atleta verá o aviso no Portal."><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="targetPlayerId" value={radar.selectedAthlete.id} /><SubmitButton label="Convidar para formar dupla" pendingLabel="Enviando..." className={viewStyles.button_button_primary_button_small} /></SafeActionForm>
      <p className={viewStyles.doubles_radar_profile_note}>Os dados de contato continuam protegidos. O convite será entregue como notificação no Portal do atleta.</p>
    </section> : <>
      <section className={cx(`${viewStyles.doubles_radar_status} is-${currentAvailability.toLowerCase()}`)}>
        <div><span aria-hidden="true"><RadarIcon icon="radar" /></span><div><strong>{current.title}</strong><p>{current.detail}</p></div></div>
        <SafeActionForm action={updateTournamentAvailabilityAction} successMessage="Seu status no Radar foi atualizado.">
          <input type="hidden" name="arenaSlug" value={arenaSlug} />
          <input type="hidden" name="tournamentAvailability" value={nextStatus} />
          <SubmitButton label={current.action} pendingLabel="Atualizando..." className={viewStyles.button_button_primary_button_small} />
        </SafeActionForm>
      </section>

      {radar.notifications.length ? <section className={viewStyles.doubles_radar_notifications} aria-label="Pedidos de dupla recebidos">
        <strong>Pedidos recebidos</strong>
        {radar.notifications.map((notification) => <article key={notification.id}><span aria-hidden="true"><RadarIcon icon="radar" /></span><div><b>{notification.title}</b><p>{notification.message}</p></div></article>)}
      </section> : null}

      <form className={viewStyles.doubles_radar_filters} method="get">
        <input type="hidden" name="section" value="radar" />
        <strong><RadarIcon icon="filter" /> Filtrar atletas</strong>
        <label>Sexo<select name="radarGender" defaultValue={selectedGender ?? ""}><option value="">Todos</option>{availableGenders.map((gender) => <option key={gender} value={gender}>{gender}</option>)}</select></label>
        <label>Categoria<select name="radarCategory" defaultValue={selectedCategory ?? ""}><option value="">Todas</option>{availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <div><button className={viewStyles.button_button_primary_button_small} type="submit">Filtrar</button>{selectedGender || selectedCategory ? <Link className={viewStyles.button_button_small} href={href({})}>Limpar</Link> : null}</div>
      </form>
      <div className={viewStyles.doubles_radar_list}><header><strong>Atletas encontrados</strong><span>{radar.athletes.length} atleta{radar.athletes.length === 1 ? "" : "s"}</span></header>
        {radar.athletes.length ? radar.athletes.map((athlete) => <article key={athlete.id}>
          <PlayerAvatar className={viewStyles.doubles_radar_avatar} photoUrl={athlete.photoUrl} name={athlete.name} />
          <div className={viewStyles.doubles_radar_athlete_copy}><div><strong>{athlete.name}</strong><span className={viewStyles.doubles_radar_availability}>{athlete.availability === "LOOKING_FOR_PARTNER" ? "Procurando dupla" : "Disponível"}</span></div><p>{athlete.categories.join(" · ")} · {athlete.gender || "Gênero não informado"}</p><small>{sideLabel[athlete.padelSide] ?? "Lado de jogo não informado"}</small></div>
          <Link className={viewStyles.button_button_small} href={href({ gender: selectedGender, category: selectedCategory, athleteId: athlete.id })}>Ver perfil</Link>
        </article>) : <div className={viewStyles.doubles_radar_empty}><strong>Nenhum atleta encontrado</strong><span>Tente ampliar os filtros ou aguarde novos atletas entrarem no radar.</span></div>}
      </div>
    </>}
  </section>;
}

function RadarIcon({ icon }: { icon: "radar" | "ball" | "filter" }) {
  const shapes = {
    radar: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.4" /><path d="M12 12 17.5 6.5M12 3v2M21 12h-2M12 21v-2M3 12h2" /><circle cx="17.5" cy="6.5" r="1" /></>,
    ball: <><circle cx="12" cy="12" r="8.5" /><path d="M5.2 6.8c2.4 1.1 4 3.1 4.4 5.5.4 2.4-.5 4.7-2.3 6.3M18.8 17.2c-2.4-1.1-4-3.1-4.4-5.5-.4-2.4.5-4.7 2.3-6.3" /></>,
    filter: <><path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" /></>,
  };
  return <svg className={cx(`${viewStyles.doubles_radar_icon} is-${icon}`)} viewBox="0 0 24 24" aria-hidden="true">{shapes[icon]}</svg>;
}
