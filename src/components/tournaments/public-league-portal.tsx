"use client";
import { PortalChoice } from "@/components/portal/portal-choice";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-league-portal.utilities";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recordOwnLeagueMatchResultAction,
} from "@/lib/actions/league-challenges";
import { requestLeagueMedicalSubstitutionAction } from "@/lib/actions/league-medical-substitutions";
import Link from "next/link";
import { arenaBookingPath } from "@/lib/arena-booking-path";

type Portal = NonNullable<
  Awaited<
    ReturnType<
      typeof import("@/lib/services/public-league-portal").getPublicLeaguePortal
    >
  >
>;

export function PublicLeaguePortal({
  arenaSlug,
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
  const mutedText = cx(viewStyles.muted, "tw:text-[#606874]! tw:dark:text-[#a4b3c8]!");
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
    <section className={cx(viewStyles.public_league_portal_section_card_stack_md, "tw:viewport-700:mx-0! tw:viewport-700:mt-2! tw:viewport-700:w-full! tw:viewport-700:min-w-0! tw:viewport-700:grid-cols-[minmax(0,1fr)]! tw:viewport-700:border-0! tw:viewport-700:bg-transparent! tw:viewport-700:p-0! tw:viewport-700:shadow-none! tw:viewport-700:text-[#133047]! tw:viewport-700:dark:text-[#eaf3ff]!")}>
      {selectedCategory ? (
        <form
          method="get"
          action={`/classificacao/${arenaSlug}`}
          className="portal-league-category-card tw:grid tw:min-w-0 tw:gap-3 tw:rounded-lg tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-4 tw:text-[#133047] tw:dark:border-[#2a4161] tw:dark:bg-[#0b1a30] tw:dark:text-[#eaf3ff] tw:viewport-700:p-3"
        >
          <input type="hidden" name="arena" value={arenaSlug} />
          <input type="hidden" name="section" value="leagues" />
          <input type="hidden" name="leagueTab" value={view} />
          <input type="hidden" name="tab" value="games" />
          <div>
            <PortalChoice label="Categoria" name="leagueCategory" defaultValue={portal.selectedLeagueCategoryId ?? ""} options={portal.leagueCategories.map(category => ({ value: category.id, label: category.label }))} />
          </div>
          <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:text-xs">
            <span className="tw:text-[#606874] tw:dark:text-[#a4b3c8]">{selectedCategory.member ? "Sua categoria" : "Categoria pública"}</span>
            <span>Inscrição: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedCategory.registrationFeeCents / 100)} por atleta</span>
          </div>
        </form>
      ) : portal.leagueCategories.length ? (
        <form
          method="get"
          action={`/classificacao/${arenaSlug}`}
          className={viewStyles.portal_league_category_picker}
        >
          <input type="hidden" name="arena" value={arenaSlug} />
          <input type="hidden" name="section" value="leagues" />
          <input type="hidden" name="leagueTab" value={view} />
          <input type="hidden" name="tab" value="games" />
          <div>
            <PortalChoice label="Categoria" name="leagueCategory" defaultValue={portal.selectedLeagueCategoryId ?? ""} options={portal.leagueCategories.map(category => ({ value: category.id, label: category.label }))} />
          </div>
        </form>
      ) : null}
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
            <p className={mutedText}>{portal.leagueCategories.length ? "Ainda não há duplas nesta categoria." : "Nenhuma categoria de liga ativa."}</p>
          )}
        </section>
        <section aria-label="Duplas inscritas" className="tw:mx-1 tw:mt-3 tw:mb-24 tw:hidden tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-4 tw:viewport-700:block tw:dark:border-[#3e5e8b] tw:dark:bg-[#10294c]">
          <div className="tw:mb-3 tw:flex tw:items-center tw:justify-between tw:gap-3"><h2 className="tw:m-0 tw:text-base tw:font-semibold tw:text-[#133047]! tw:dark:text-[#eaf3ff]!">Duplas inscritas</h2><span className="tw:text-xs tw:text-[#606874]! tw:dark:text-[#a4b3c8]!">{portal.selectedLeaguePairs.length}</span></div>
          {portal.selectedLeaguePairs.length ? <div className="tw:grid tw:gap-2">{portal.selectedLeaguePairs.map((pair, index) => <article key={pair.id} className="tw:flex tw:items-start tw:gap-3 tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:dark:border-[#2a4161] tw:dark:bg-[#102441]"><span className="tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-[#174983] tw:text-xs tw:font-semibold tw:text-white! tw:dark:bg-[#174983] tw:dark:text-white!">{index + 1}</span><div className="tw:min-w-0"><strong className="tw:block tw:break-words tw:text-sm tw:leading-snug tw:text-[#133047]! tw:dark:text-[#eaf3ff]!">{pair.name}</strong>{pair.groupName ? <small className="tw:mt-1 tw:block tw:text-xs tw:text-[#606874]! tw:dark:text-[#a4b3c8]!">{pair.groupName}</small> : null}</div></article>)}</div> : <p className="tw:m-0 tw:text-sm tw:text-[#606874]! tw:dark:text-[#a4b3c8]!">{portal.leagueCategories.length ? "Ainda não há duplas nesta categoria." : "Nenhuma categoria de liga ativa."}</p>}
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
          <section className={cx(viewStyles.portal_league_results, "tw:viewport-700:min-w-0! tw:viewport-700:grid-cols-[minmax(0,1fr)]! tw:viewport-700:[&_h3]:text-[#133047]! tw:viewport-700:dark:[&_h3]:text-[#eaf3ff]! tw:viewport-700:[&_>_header_>_small]:hidden! tw:viewport-700:[&_>_header_span]:hidden!")}>
            <header>
              <div>
                <span>CALENDÁRIO DA LIGA</span>
                <h3>Jogos e resultados</h3>
              </div>
              <small>Organizado por semana</small>
            </header>
            {leagueResultsByWeek.length ? (
              <div className={cx(viewStyles.portal_league_week_list, "tw:viewport-700:min-w-0! tw:viewport-700:grid-cols-[minmax(0,1fr)]!")}>
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
                {selectedWeek ? <nav className="tw:hidden tw:viewport-700:flex tw:items-center tw:justify-between tw:gap-3 tw:py-2 tw:viewport-700:[&_strong]:text-[#133047]! tw:viewport-700:dark:[&_strong]:text-[#eaf3ff]!" aria-label="Selecionar semana da Liga"><button type="button" onClick={() => setSelectedWeekBlock(leagueResultsByWeek[selectedWeekIndex - 1]?.block ?? selectedWeek.block)} disabled={selectedWeekIndex <= 0} aria-label="Semana anterior" className="tw:grid tw:size-9 tw:shrink-0 tw:place-items-center tw:rounded-full tw:border tw:border-[#d8e5e9] tw:bg-white tw:text-[#133047] tw:disabled:opacity-35 tw:dark:border-[#3e5e8b] tw:dark:bg-[#10294c] tw:dark:text-[#eaf3ff]">‹</button><span className="tw:min-w-0 tw:text-center"><strong className="tw:block tw:text-sm tw:font-semibold tw:text-[#133047] tw:dark:text-[#eaf3ff]">Semana {selectedWeek.block} de {leagueResultsByWeek.length}</strong><small className="tw:block tw:text-[.75rem] tw:text-[#4d6675]! tw:dark:text-[#a4b3c8]!">{selectedWeek.period}</small></span><button type="button" onClick={() => setSelectedWeekBlock(leagueResultsByWeek[selectedWeekIndex + 1]?.block ?? selectedWeek.block)} disabled={selectedWeekIndex >= leagueResultsByWeek.length - 1} aria-label="Próxima semana" className="tw:grid tw:size-9 tw:shrink-0 tw:place-items-center tw:rounded-full tw:border tw:border-[#d8e5e9] tw:bg-white tw:text-[#133047] tw:disabled:opacity-35 tw:dark:border-[#3e5e8b] tw:dark:bg-[#10294c] tw:dark:text-[#eaf3ff]">›</button></nav> : null}
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
                        <article id={`jogo-${result.id}`} key={result.id} className="tw:viewport-700:block! tw:viewport-700:rounded-2xl! tw:viewport-700:border! tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:bg-white! tw:viewport-700:p-3! tw:viewport-700:dark:border-[#2a4161]! tw:viewport-700:dark:bg-[#0b1a30]! tw:viewport-700:[&_strong]:text-[#133047]! tw:viewport-700:dark:[&_strong]:text-[#eaf3ff]!">
                          <div className="tw:hidden tw:viewport-700:block"><div className="tw:mb-3 tw:flex tw:items-center tw:justify-between tw:gap-2 tw:text-[.67rem] tw:font-medium tw:text-[#606874] tw:dark:text-[#a4b3c8]"><span>{result.scheduledAtLabel || "Horário a definir"}</span><span>{result.finished ? "Encerrado" : result.scheduledAtLabel ? "Agendado" : "Aguardando"}</span></div><div className="tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-x-3 tw:gap-y-2"><div className="tw:min-w-0"><span className="tw:block tw:text-[.64rem] tw:font-semibold tw:uppercase tw:text-[#08387b] tw:dark:text-[#5b92de]">Mandante</span><strong className="tw:mt-1 tw:block tw:text-sm tw:leading-snug tw:font-semibold tw:text-[#133047] tw:dark:text-[#eaf3ff]">{result.homePairName}</strong></div><b className="tw:text-base tw:text-[#08387b] tw:dark:text-[#5b92de]">{result.finished ? result.homeScore ?? 0 : ""}</b><div className="tw:min-w-0"><span className="tw:block tw:text-[.64rem] tw:font-semibold tw:uppercase tw:text-[#606874] tw:dark:text-[#a4b3c8]">Visitante</span><strong className="tw:mt-1 tw:block tw:text-sm tw:leading-snug tw:font-semibold tw:text-[#133047] tw:dark:text-[#eaf3ff]">{result.awayPairName}</strong></div><b className="tw:text-base tw:text-[#606874] tw:dark:text-[#a4b3c8]">{result.finished ? result.awayScore ?? 0 : ""}</b></div>{result.finished && result.setScores.length ? <div className="tw:mt-3 tw:flex tw:justify-between tw:border-t tw:border-[#d8e5e9] tw:pt-2 tw:text-[.7rem] tw:dark:border-[#2a4161]"><span className="tw:text-[#606874] tw:dark:text-[#a4b3c8]">Games</span><strong className="tw:text-[#133047] tw:dark:text-[#eaf3ff]">{result.setScores.map(([home, away]) => `${home}–${away}`).join(" · ")}</strong></div> : null}</div>
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
                          {!result.finished && result.canSchedule ? <Link href={`${arenaBookingPath(arenaSlug)}?match=${encodeURIComponent(result.id)}`} className="tw:mt-3 tw:inline-flex tw:items-center tw:gap-1 tw:rounded-md tw:border tw:border-blue-300 tw:px-3 tw:py-1.5 tw:text-xs tw:font-medium tw:text-blue-700 tw:dark:text-blue-200">Agendar Confronto</Link> : null}
                          {result.reservationLabel ? <small className="tw:mt-3 tw:block tw:text-xs tw:text-[#354f70] tw:dark:text-[#c2d5ee]">{result.reservationStatus === "PENDING_PAYMENT" ? "Aguardando pagamento" : result.reservationStatus === "PENDING_CONFIRMATION" ? "Aguardando confirmação" : "Reserva confirmada"} · {result.reservationLabel}</small> : null}
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <p className={mutedText}>{portal.leagueCategories.length ? "Ainda não há jogos para esta categoria." : "Nenhuma categoria de liga ativa."}</p>
            )}
          </section>
          {ownPairs.length ? (
            <section className={viewStyles.public_portal_pairs}>
              {ownPairs.map((pair) => (
                <article className={viewStyles.public_portal_pair} key={pair.id}>
                  <header>
                    <strong>{pair.name}</strong>
                  </header>
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
                      <p className={mutedText}>
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
