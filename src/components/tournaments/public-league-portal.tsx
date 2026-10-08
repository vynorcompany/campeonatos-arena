"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-league-portal.utilities";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recordOwnLeagueMatchResultAction,
  respondLeagueProposalAction,
} from "@/lib/actions/league-challenges";
import { requestLeagueMedicalSubstitutionAction } from "@/lib/actions/league-medical-substitutions";
import { LeagueMatchScheduleModal } from "@/components/tournaments/league-match-schedule-modal";

type Portal = NonNullable<
  Awaited<
    ReturnType<
      typeof import("@/lib/services/public-league-portal").getPublicLeaguePortal
    >
  >
>;

export function PublicLeaguePortal({
  arenaSlug,
  playerName,
  portal,
  view = "games",
  showPrize = true,
}: {
  arenaSlug: string;
  playerName: string;
  portal: Portal;
  view?: "games" | "pairs";
  showPrize?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (
    form: HTMLFormElement,
    action: (data: FormData) => Promise<void | { error: string }>,
    success: string,
  ) =>
    startTransition(async () => {
      try {
        const result = await action(new FormData(form));
        if (result && "error" in result) {
          setMessage(result.error);
          return;
        }
        setMessage(success);
        // A resposta altera dados renderizados no servidor (status da proposta
        // e agenda). Sem o refresh o botão parece não ter funcionado até a
        // pessoa atualizar o navegador manualmente.
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a ação.",
        );
      }
    });
  const ownPairs = portal.pairs.filter(
    (pair) => pair.categoryId === portal.selectedLeagueCategoryId,
  );
  const challenges = portal.challenges.filter(
    (challenge) => challenge.categoryId === portal.selectedLeagueCategoryId,
  );
  const selectedCategory = portal.leagueCategories.find(
    (category) => category.id === portal.selectedLeagueCategoryId,
  );
  const leagueResultsByWeek = Array.from(
    portal.leagueResults
      .reduce((weeks, result) => {
        const block = result.block ?? 0;
        const current = weeks.get(block) ?? {
          block,
          period: result.period,
          results: [] as typeof portal.leagueResults,
        };
        current.results.push(result);
        weeks.set(block, current);
        return weeks;
      }, new Map<number, { block: number; period: string; results: typeof portal.leagueResults }>())
      .values(),
  );
  const [selectedWeekBlock, setSelectedWeekBlock] = useState<number | null>(
    null,
  );
  const selectedWeek =
    leagueResultsByWeek.find((week) => week.block === selectedWeekBlock) ??
    leagueResultsByWeek[0];
  const selectedWeekIndex = leagueResultsByWeek.findIndex((week) => week.block === selectedWeek?.block);

  useEffect(() => {
    const focusNotifiedMatch = () => {
      const matchId = window.location.hash.match(/^#jogo-([^?]+)/)?.[1];
      if (!matchId) return;
      const result = portal.leagueResults.find((item) => item.id === matchId);
      if (result) setSelectedWeekBlock(result.block ?? 0);

      // O hash é somente um comando pontual vindo do aviso. Após ler o alvo,
      // limpamos a URL para que um refresh não dispare o foco novamente.
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );

      window.setTimeout(() => {
        const visibleMatch = document.getElementById(`jogo-${matchId}`);
        if (!visibleMatch) return;
        visibleMatch.scrollIntoView({ behavior: "smooth", block: "center" });
        visibleMatch.classList.remove("is-notification-highlight");
        window.requestAnimationFrame(() =>
          visibleMatch.classList.add("is-notification-highlight"),
        );
        window.setTimeout(
          () => visibleMatch.classList.remove("is-notification-highlight"),
          2600,
        );
      }, 180);
    };

    focusNotifiedMatch();
    window.addEventListener("hashchange", focusNotifiedMatch);
    return () => window.removeEventListener("hashchange", focusNotifiedMatch);
  }, [portal.leagueResults]);

  return (
    <section className={cx(viewStyles.public_league_portal_section_card_stack_md, "tw:viewport-700:mx-0! tw:viewport-700:mt-2! tw:viewport-700:w-full! tw:viewport-700:border-0! tw:viewport-700:bg-transparent! tw:viewport-700:p-0! tw:viewport-700:shadow-none! tw:viewport-700:text-[#133047]! tw:viewport-700:dark:text-[#eafff3]!")}>
      <header
        className={
          cx(view === "pairs"
            ? viewStyles.public_league_portal_header
            : viewStyles.public_league_portal_header_public_league_portal_hero_card, "tw:viewport-700:hidden!")
        }
      >
        {view === "pairs" ? (
          <h2>Duplas da Liga</h2>
        ) : (
          <>
            <span>TORNEIOS DA ARENA</span>
            <h2>Olá, {playerName}</h2>
            <p>
              Confira os jogos e resultados da sua categoria. As ações da sua
              dupla aparecem aqui.
            </p>
            <b aria-hidden="true">
              MAIS
              <br />
              JOGOS
              <br />
              MAIS
              <br />
              HISTÓRIAS
            </b>
          </>
        )}
      </header>
      {selectedCategory ? (
        <form
          method="get"
          action={`/classificacao/${arenaSlug}`}
          className="portal-league-category-card tw:viewport-700:my-2! tw:viewport-700:rounded-xl! tw:viewport-700:border! tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:bg-white! tw:viewport-700:[background-image:none]! tw:viewport-700:p-3! tw:viewport-700:shadow-none! tw:viewport-700:dark:border-[#2a6155]! tw:viewport-700:dark:bg-[#0b302a]! tw:viewport-700:[&_>_header]:hidden! tw:viewport-700:[&_>_p]:hidden! tw:viewport-700:[&_.portal-league-category-actions]:hidden! tw:viewport-700:[&_label]:text-[#607e8d]! tw:viewport-700:dark:[&_label]:text-[#a4c8b9]! tw:viewport-700:[&_select]:border-[#d8e5e9]! tw:viewport-700:[&_select]:bg-white! tw:viewport-700:[&_select]:[background-image:none]! tw:viewport-700:[&_select]:text-[#133047]! tw:viewport-700:dark:[&_select]:border-[#2a6155]! tw:viewport-700:dark:[&_select]:bg-[#0b302a]! tw:viewport-700:dark:[&_select]:text-[#eafff3]!"
        >
          <input type="hidden" name="arena" value={arenaSlug} />
          <input type="hidden" name="section" value="leagues" />
          <input type="hidden" name="leagueTab" value={view} />
          <input type="hidden" name="tab" value="games" />
          <header>
            <strong>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m4 8 8-4 8 4-8 4-8-4ZM6.5 10.2V15c2.8 2 8.2 2 11 0v-4.8M20 8v7" />
              </svg>
              Categoria da liga
            </strong>
            {selectedCategory.member ? (
              <b>
                <span>✓</span>Você já está inscrito nesta categoria
              </b>
            ) : null}
          </header>
          <label>
            <span>Categoria</span>
            <select
              name="leagueCategory"
              defaultValue={portal.selectedLeagueCategoryId ?? ""}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            >
              {portal.leagueCategories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.label}
                  {category.member ? " · Minha Liga" : ""}
                </option>
              ))}
            </select>
          </label>
          <p className={viewStyles.portal_league_category_context}>
            {selectedCategory.member
              ? "Você participa desta categoria. As ações da sua dupla aparecem abaixo."
              : "Visualização pública: acompanhe as duplas e os resultados desta categoria."}
          </p>
          <div className="portal-league-category-actions">
            <p className="portal-league-registration-fee">
              <span>Inscrição</span>
              <strong>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(selectedCategory.registrationFeeCents / 100)}
              </strong>
              <small>por atleta</small>
            </p>
          </div>
        </form>
      ) : (
        <form
          method="get"
          action={`/classificacao/${arenaSlug}`}
          className={viewStyles.portal_league_category_picker}
        >
          <input type="hidden" name="arena" value={arenaSlug} />
          <input type="hidden" name="section" value="leagues" />
          <input type="hidden" name="leagueTab" value={view} />
          <input type="hidden" name="tab" value="games" />
          <label>
            <span>Categoria da Liga</span>
            <select
              name="leagueCategory"
              defaultValue={portal.selectedLeagueCategoryId ?? ""}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            >
              {portal.leagueCategories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        </form>
      )}
      {view === "pairs" ? (
        <><section className={cx(viewStyles.portal_league_pairs, "tw:viewport-700:hidden!")}>
          <h3>Duplas inscritas</h3>
          {portal.selectedLeaguePairs.length ? (
            <div>
              {portal.selectedLeaguePairs.map((pair) => (
                <article key={pair.id}>
                  <div>
                    <strong>{pair.name}</strong>
                  </div>
                  {pair.groupName ? <small>{pair.groupName}</small> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className={viewStyles.muted}>Ainda não há duplas nesta categoria.</p>
          )}
        </section>
        <section className="tw:mx-1 tw:mt-3 tw:mb-24 tw:hidden tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-4 tw:viewport-700:block tw:dark:border-[#3e8b70] tw:dark:bg-[#104c3b]">
          <div className="tw:mb-3 tw:flex tw:items-center tw:justify-between tw:gap-3"><h2 className="tw:m-0 tw:text-base tw:font-semibold tw:text-[#133047]! tw:dark:text-[#eafff3]!">Duplas inscritas</h2><span className="tw:text-xs tw:text-[#607e8d]! tw:dark:text-[#a4c8b9]!">{portal.selectedLeaguePairs.length}</span></div>
          {portal.selectedLeaguePairs.length ? <div className="tw:grid tw:gap-2">{portal.selectedLeaguePairs.map((pair, index) => <article key={pair.id} className="tw:flex tw:items-start tw:gap-3 tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-[#f5f8f8] tw:p-3 tw:dark:border-[#2a6155] tw:dark:bg-[#104138]"><span className="tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-[#def2ed] tw:text-xs tw:font-semibold tw:text-[#087b63]! tw:dark:bg-[#16483d] tw:dark:text-[#5bdec1]!">{index + 1}</span><div className="tw:min-w-0"><strong className="tw:block tw:break-words tw:text-sm tw:leading-snug tw:text-[#133047]! tw:dark:text-[#eafff3]!">{pair.name}</strong>{pair.groupName ? <small className="tw:mt-1 tw:block tw:text-xs tw:text-[#607e8d]! tw:dark:text-[#a4c8b9]!">{pair.groupName}</small> : null}</div></article>)}</div> : <p className="tw:m-0 tw:text-sm tw:text-[#607e8d]! tw:dark:text-[#a4c8b9]!">Ainda não há duplas nesta categoria.</p>}
        </section></>
      ) : (
        <>
          {portal.leagueNotifications.length ? (
            <section className={viewStyles.public_portal_notifications}>
              {portal.leagueNotifications.map((notification) => (
                <a
                  className={viewStyles.public_portal_notification_reservation}
                  href={notification.href || "#"}
                  key={notification.id}
                >
                  <span
                    className={viewStyles.public_portal_notification_icon}
                    aria-hidden="true"
                  >
                    ⌁
                  </span>
                  <span className={viewStyles.public_portal_notification_copy}>
                    <strong>{notification.title}</strong>
                    <small>{notification.message}</small>
                  </span>
                  <span className={viewStyles.public_portal_notification_view}>Ver</span>
                </a>
              ))}
            </section>
          ) : null}
          {showPrize && portal.prizes.length ? (
            <section className={viewStyles.public_league_prizes}>
              <h3>Premiação da Liga</h3>
              {portal.prizes.map((prize) => (
                <article key={prize.id}>
                  <strong>
                    {prize.eventName} · {prize.categoryName}
                  </strong>
                  <p className={viewStyles.public_league_prize_description}>
                    {prize.description}
                  </p>
                </article>
              ))}
            </section>
          ) : null}
          <section className={cx(viewStyles.portal_league_results, "tw:viewport-700:[&_h3]:text-[#133047]! tw:viewport-700:dark:[&_h3]:text-[#eafff3]! tw:viewport-700:[&_>_header_>_small]:hidden! tw:viewport-700:[&_>_header_span]:hidden!")}>
            <header>
              <div>
                <span>CALENDÁRIO DA LIGA</span>
                <h3>Jogos e resultados</h3>
              </div>
              <small>Organizado por semana</small>
            </header>
            {leagueResultsByWeek.length ? (
              <div className={viewStyles.portal_league_week_list}>
                <div className={cx(viewStyles.portal_league_week_tabs, "tw:viewport-700:hidden!")} role="tablist" aria-label="Semana da Liga">
                  {leagueResultsByWeek.map((week) => (
                    <button
                      aria-selected={selectedWeek?.block === week.block}
                      className={cx(selectedWeek?.block === week.block ? "active" : "")}
                      key={week.block}
                      onClick={() => setSelectedWeekBlock(week.block)}
                      role="tab"
                      type="button"
                    >
                      Sem. {week.block || "—"}
                    </button>
                  ))}
                </div>
                {selectedWeek ? <nav className="tw:hidden tw:viewport-700:flex tw:items-center tw:justify-between tw:gap-3 tw:py-2 tw:viewport-700:[&_strong]:text-[#133047]! tw:viewport-700:dark:[&_strong]:text-[#eafff3]!" aria-label="Selecionar semana da Liga"><button type="button" onClick={() => setSelectedWeekBlock(leagueResultsByWeek[selectedWeekIndex - 1]?.block ?? selectedWeek.block)} disabled={selectedWeekIndex <= 0} aria-label="Semana anterior" className="tw:grid tw:size-9 tw:shrink-0 tw:place-items-center tw:rounded-full tw:border tw:border-[#d8e5e9] tw:bg-white tw:text-[#133047] tw:disabled:opacity-35 tw:dark:border-[#3e8b70] tw:dark:bg-[#104c3b] tw:dark:text-[#eafff3]">‹</button><span className="tw:min-w-0 tw:text-center"><strong className="tw:block tw:text-sm tw:font-semibold tw:text-[#133047] tw:dark:text-[#eafff3]">Semana {selectedWeek.block} de {leagueResultsByWeek.length}</strong><small className="tw:block tw:text-[.7rem] tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">{selectedWeek.period}</small></span><button type="button" onClick={() => setSelectedWeekBlock(leagueResultsByWeek[selectedWeekIndex + 1]?.block ?? selectedWeek.block)} disabled={selectedWeekIndex >= leagueResultsByWeek.length - 1} aria-label="Próxima semana" className="tw:grid tw:size-9 tw:shrink-0 tw:place-items-center tw:rounded-full tw:border tw:border-[#d8e5e9] tw:bg-white tw:text-[#133047] tw:disabled:opacity-35 tw:dark:border-[#3e8b70] tw:dark:bg-[#104c3b] tw:dark:text-[#eafff3]">›</button></nav> : null}
                {selectedWeek ? (
                  <section className={cx(viewStyles.portal_league_week, "tw:viewport-700:border-0! tw:viewport-700:bg-transparent! tw:viewport-700:[&_>_header]:hidden! tw:viewport-700:[&_>_div]:gap-2!")} key={selectedWeek.block}>
                    <header>
                      <div>
                        <strong>Semana {selectedWeek.block || "—"}</strong>
                        <span>Período: {selectedWeek.period}</span>
                      </div>
                      <small>
                        {selectedWeek.results.length} jogo
                        {selectedWeek.results.length === 1 ? "" : "s"}
                      </small>
                    </header>
                    <div>
                      {selectedWeek.results.map((result) => (
                        <article id={`jogo-${result.id}`} key={result.id} className="tw:viewport-700:block! tw:viewport-700:rounded-2xl! tw:viewport-700:border! tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:bg-white! tw:viewport-700:p-3! tw:viewport-700:dark:border-[#2a6155]! tw:viewport-700:dark:bg-[#0b302a]! tw:viewport-700:[&_strong]:text-[#133047]! tw:viewport-700:dark:[&_strong]:text-[#eafff3]!">
                          <div className="tw:hidden tw:viewport-700:block"><div className="tw:mb-3 tw:flex tw:items-center tw:justify-between tw:gap-2 tw:text-[.67rem] tw:font-medium tw:text-[#607e8d] tw:dark:text-[#a4c8b9]"><span>{result.scheduledAtLabel || "Horário a definir"}</span><span>{result.finished ? "Encerrado" : result.scheduledAtLabel ? "Agendado" : "Aguardando"}</span></div><div className="tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-x-3 tw:gap-y-2"><div className="tw:min-w-0"><span className="tw:block tw:text-[.64rem] tw:font-semibold tw:uppercase tw:text-[#078f7c] tw:dark:text-[#5bdec1]">Mandante</span><strong className="tw:mt-1 tw:block tw:text-sm tw:leading-snug tw:font-semibold tw:text-[#133047] tw:dark:text-[#eafff3]">{result.homePairName}</strong></div><b className="tw:text-base tw:text-[#078f7c] tw:dark:text-[#5bdec1]">{result.finished ? result.homeScore ?? 0 : ""}</b><div className="tw:min-w-0"><span className="tw:block tw:text-[.64rem] tw:font-semibold tw:uppercase tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">Visitante</span><strong className="tw:mt-1 tw:block tw:text-sm tw:leading-snug tw:font-semibold tw:text-[#133047] tw:dark:text-[#eafff3]">{result.awayPairName}</strong></div><b className="tw:text-base tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">{result.finished ? result.awayScore ?? 0 : ""}</b></div>{result.finished && result.setScores.length ? <div className="tw:mt-3 tw:flex tw:justify-between tw:border-t tw:border-[#d8e5e9] tw:pt-2 tw:text-[.7rem] tw:dark:border-[#2a6155]"><span className="tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">Games</span><strong className="tw:text-[#133047] tw:dark:text-[#eafff3]">{result.setScores.map(([home, away]) => `${home}–${away}`).join(" · ")}</strong></div> : null}</div>
                          <strong className={cx(viewStyles.portal_league_match_sides, "tw:viewport-700:hidden!")}>
                            <span className="portal-league-match-home">
                              <small
                                className={cx(`portal-league-match-home-status ${result.finished ? "is-finished" : result.scheduledAtLabel ? "is-scheduled" : "is-waiting"}`)}
                              >
                                {result.finished
                                  ? "Encerrado"
                                  : result.scheduledAtLabel
                                    ? "Agendado"
                                    : "Aguardando"}
                              </small>
                              <i>Mandante</i>
                              <span className="portal-league-match-pair-name">
                                {result.homePairName}
                              </span>
                              {result.scheduledAtLabel ? (
                                <small className="portal-league-match-home-schedule">
                                  {result.scheduledAtLabel}
                                </small>
                              ) : null}
                            </span>
                            <b className={viewStyles.portal_league_match_score}>
                              {result.finished
                                ? `${result.homeScore ?? 0} × ${result.awayScore ?? 0}`
                                : "×"}
                              {result.finished && result.setScores.length ? (
                                <small>
                                  {result.setScores
                                    .map(([home, away]) => `${home}–${away}`)
                                    .join(" · ")}
                                </small>
                              ) : null}
                            </b>
                            <span className="portal-league-match-away">
                              <i>Visitante</i>
                              <span className="portal-league-match-pair-name">
                                {result.awayPairName}
                              </span>
                            </span>
                          </strong>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <p className={viewStyles.muted}>Ainda não há jogos para esta categoria.</p>
            )}
          </section>
          {ownPairs.length ? (
            <section className={viewStyles.public_portal_pairs}>
              {ownPairs.map((pair) => (
                <article className={viewStyles.public_portal_pair} key={pair.id}>
                  <header>
                    <strong>{pair.name}</strong>
                  </header>
                  {pair.opponents.length ? (
                    <LeagueMatchScheduleModal
                      arenaSlug={arenaSlug}
                      proposerPairId={pair.id}
                      proposerName={pair.name}
                      opponents={pair.opponents}
                      slots={portal.slots}
                      onMessage={setMessage}
                    />
                  ) : null}
                  {pair.opponents.map((opponent) => (
                    <details
                      className={viewStyles.public_league_result_entry}
                      key={`resultado-${opponent.matchId}`}
                    >
                      <summary>
                        Registrar resultado · Semana {opponent.block ?? "—"} ·{" "}
                        {opponent.name}
                      </summary>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          submit(
                            event.currentTarget,
                            recordOwnLeagueMatchResultAction,
                            "Resultado registrado e enviado à dupla visitante.",
                          );
                        }}
                        className={viewStyles.public_league_result_form}
                      >
                        <input
                          type="hidden"
                          name="arenaSlug"
                          value={arenaSlug}
                        />
                        <input
                          type="hidden"
                          name="matchId"
                          value={opponent.matchId}
                        />
                        <span>Set</span>
                        <strong>{pair.name}</strong>
                        <strong>{opponent.name}</strong>
                        {[
                          ["homeSet1", "awaySet1", "1"],
                          ["homeSet2", "awaySet2", "2"],
                          ["homeSet3", "awaySet3", "3"],
                        ].map(([home, away, set]) => (
                          <span
                            className={viewStyles.public_league_result_score}
                            key={set}
                          >
                            <i>{set}</i>
                            <input
                              name={home}
                              type="number"
                              min="0"
                              aria-label={`Set ${set} de ${pair.name}`}
                            />
                            <input
                              name={away}
                              type="number"
                              min="0"
                              aria-label={`Set ${set} de ${opponent.name}`}
                            />
                          </span>
                        ))}
                        <small>
                          Informe os dois primeiros sets; o terceiro é apenas
                          para desempate.
                        </small>
                        <button
                          type="submit"
                          className={viewStyles.button_button_primary}
                          disabled={pending}
                        >
                          {pending ? "Salvando..." : "Salvar resultado"}
                        </button>
                      </form>
                    </details>
                  ))}
                  <details className={viewStyles.public_medical_request}>
                    <summary>Solicitar substituição médica</summary>
                    {pair.medicalRequestPending ? (
                      <p className={viewStyles.muted}>
                        Solicitação já enviada para a arena.
                      </p>
                    ) : (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          submit(
                            event.currentTarget,
                            requestLeagueMedicalSubstitutionAction,
                            "Solicitação enviada para a arena.",
                          );
                        }}
                      >
                        <input
                          type="hidden"
                          name="arenaSlug"
                          value={arenaSlug}
                        />
                        <input type="hidden" name="pairId" value={pair.id} />
                        <label>
                          Atleta afastado
                          <select name="previousPlayerId">
                            {pair.players.map((player) => (
                              <option value={player.id} key={player.id}>
                                {player.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Substituto
                          <select name="replacementPlayerId">
                            {portal.replacementPlayers
                              .filter(
                                (player) =>
                                  !pair.players.some(
                                    (member) => member.id === player.id,
                                  ),
                              )
                              .map((player) => (
                                <option value={player.id} key={player.id}>
                                  {player.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Motivo médico
                          <textarea name="reason" minLength={10} required />
                        </label>
                        <button
                          type="submit"
                          className={viewStyles.button}
                          disabled={pending}
                        >
                          Enviar solicitação
                        </button>
                      </form>
                    )}
                  </details>
                </article>
              ))}
            </section>
          ) : null}
          <section className={viewStyles.public_challenge_list}>
            <h3>Sugestões de horário</h3>
            {challenges.length ? (
              challenges.map((challenge) => (
                <article id={`desafio-${challenge.id}`} key={challenge.id}>
                  <div className={viewStyles.public_challenge_details}>
                    <div className={viewStyles.public_challenge_title_row}>
                      <strong>
                        Semana {challenge.block ?? "—"} · {challenge.proposer} ×{" "}
                        {challenge.opponent}
                      </strong>
                      {challenge.status === "ACCEPTED" ? (
                        <span className={viewStyles.public_league_reservation_status}>
                          <b aria-hidden="true">✓</b> Reserva confirmada
                        </span>
                      ) : null}
                    </div>
                    <span>
                      {challenge.court} · {challenge.proposedAt}
                    </span>
                    {challenge.status === "PENDING" ? (
                      <small>Responder até {challenge.responseDueAt}</small>
                    ) : challenge.status === "REJECTED" ? (
                      <small>Recusado</small>
                    ) : null}
                  </div>
                  {challenge.incoming && challenge.status === "PENDING" ? (
                    <div className={viewStyles.public_challenge_actions}>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          submit(
                            event.currentTarget,
                            respondLeagueProposalAction,
                            "Sugestão aceita.",
                          );
                        }}
                      >
                        <input
                          type="hidden"
                          name="arenaSlug"
                          value={arenaSlug}
                        />
                        <input
                          type="hidden"
                          name="proposalId"
                          value={challenge.id}
                        />
                        <input type="hidden" name="response" value="ACCEPTED" />
                        <button
                          className={viewStyles.button_button_primary}
                          disabled={pending}
                        >
                          Aceitar
                        </button>
                      </form>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          submit(
                            event.currentTarget,
                            respondLeagueProposalAction,
                            "Sugestão recusada.",
                          );
                        }}
                      >
                        <input
                          type="hidden"
                          name="arenaSlug"
                          value={arenaSlug}
                        />
                        <input
                          type="hidden"
                          name="proposalId"
                          value={challenge.id}
                        />
                        <input type="hidden" name="response" value="REJECTED" />
                        <button className={viewStyles.button} disabled={pending}>
                          Recusar
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p className={viewStyles.muted}>Nenhuma sugestão nesta categoria.</p>
            )}
          </section>
        </>
      )}
      {message ? (
        <p className={viewStyles.public_booking_message} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
