import { TournamentRegistrationRow } from "@/components/tournaments/tournament-registration-row";
import { ReceiveOnsiteRegistrationButton } from "@/components/tournaments/receive-onsite-registration-button";

import Link from "next/link";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { PhoneInput } from "@/components/forms/phone-input";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { viewStyles } from "./page.utilities";
import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import { requireModuleView } from "@/lib/auth/guards";
import { getTournamentGeneralRegistrations } from "@/lib/tournaments/registration-queries";
import {
  generateCategoryBracketAction,
  updateCategoryBracketMatchScheduleAction,
  updateTournamentCategoryFormatAction,
} from "@/lib/actions/tournament";
import { RegistrationEditForm, RegistrationPaymentFields } from "@/components/tournaments/registration-edit-form";
import { ReviewedCheckoutRelease } from "@/components/finance/reviewed-checkout-release";
import { canPerformPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

const formatRegistrationMoney = (cents: number) => new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(cents/100);
const registrationCanceled = (registration: any) => registration.paymentStatus === "REFUNDED" || registration.status === "CANCELED";
const registrationSituation = (registration: any) => registrationCanceled(registration) ? "Cancelada" : registration.status === "CONFIRMED" ? "Confirmada" : "Pendente";
const registrationPayment = (registration: any) => registration.paymentStatus === "REVIEW" ? "Em análise" : registration.paymentStatus === "REFUNDED" ? "Estornado" : registration.paymentStatus === "PAID" ? "Pago" : registrationCanceled(registration) ? "Cancelado" : registration.paymentProvider === "PAY_ON_SITE" ? "Pagamento no local" : "Pagamento pendente";

export default async function TournamentRegistrationsPage({searchParams}:{searchParams:Promise<{tournamentId?:string;q?:string}>}) {
  const filters=await searchParams;
  const query=(filters.q??"").trim().toLocaleLowerCase("pt-BR");
  const auth = await requireModuleView("tournaments");
  if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) redirect("/jogos");
  const canResolveReview = canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const { events, tournament, categoryBrackets, bankAccounts, conflicts } = await getTournamentGeneralRegistrations(filters.tournamentId);

  if (!tournament) {
    return <SectionCard title="Inscrições" hideHeading><p className={viewStyles.muted}>Nenhum torneio ativo.</p></SectionCard>;
  }

  const matchesQuery=(names:string)=>!query||names.toLocaleLowerCase("pt-BR").includes(query);
  const categories=tournament.categories.filter((category:any)=>!query||category.registrations.some((reg:any)=>matchesQuery(`${reg.leadName} ${reg.partnerName} ${reg.thirdName ?? ""}`))||category.competition?.pairs.some((pair:any)=>matchesQuery(pair.players.map((p:any)=>p.player.name).join(" ")+" "+pair.name)));


  return (
    <div className={viewStyles.stack_md}>
      <h1 className="tw:sr-only">Inscrições</h1><form action="/torneios/inscricoes" className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(220px,320px)_minmax(200px,300px)_auto] tw:items-end tw:justify-start tw:gap-2 tw:[&_:is(input,select)]:min-h-8! tw:[&_:is(input,select)]:rounded-md tw:[&_:is(input,select)]:border tw:[&_:is(input,select)]:border-[#bccbde] tw:[&_:is(input,select)]:bg-white tw:[&_:is(input,select)]:px-2 tw:[&_:is(input,select)]:py-1.5 tw:[&_:is(input,select)]:text-xs tw:[&_:is(input,select)]:text-[#202c3c] tw:viewport-760:grid-cols-1"><label className="tw:grid tw:min-w-0 tw:gap-1 tw:text-xs tw:text-[#354f70]">Evento<select name="tournamentId" defaultValue={tournament.id}>{events.map(event=><option key={event.id} value={event.id}>{event.name}</option>)}</select></label><label className="tw:grid tw:min-w-0 tw:gap-1 tw:text-xs tw:text-[#354f70]">Participante ou equipe<input name="q" defaultValue={filters.q} placeholder="Nome de um dos atletas" type="search"/></label><button type="submit" className={ui.primary}>Aplicar filtros</button></form>

      {tournament.registrationPhase === "REGISTRATIONS" && tournament.categories.some((category:any)=>!category.competition && category.registrationType !== "INDIVIDUAL") ? <p className="tw:m-0 tw:rounded tw:bg-[#174983] tw:text-white tw:px-3 tw:py-2 tw:text-xs">Encerre as inscrições para montar o chaveamento.</p>:null}

      {conflicts.length ? <details className={ui.panel}><summary className="tw:cursor-pointer tw:text-xs tw:font-medium tw:text-red-700">{conflicts.length} conflitos de agenda</summary><ul className={viewStyles.simple_list}>{conflicts.map(conflict=><li key={conflict.key} className={viewStyles.simple_item}><strong>{conflict.scheduledTime}</strong><span>{conflict.labels.join(" | ")}</span></li>)}</ul></details>:null}

      {categories.map((category: any) => {
        const bracket = categoryBrackets.find((item) => item.categoryId === category.id);
        const pairs=category.competition?.pairs??[];
        const represented=(registration:any)=>pairs.some((pair:any)=>{const ids=pair.players.map((p:any)=>p.player.id);return ids.includes(registration.leadPlayerId)&&ids.includes(registration.partnerPlayerId)&&(!registration.thirdPlayerId||ids.includes(registration.thirdPlayerId));});
        const confirmedCount = category.registrations.filter((reg: any) => reg.status === "CONFIRMED").length;
        return (
          <details key={category.id} className={ui.list} open><summary className="tw:flex tw:cursor-pointer tw:flex-col tw:items-start tw:justify-between tw:gap-1 tw:sm:flex-row tw:sm:items-center tw:border-b tw:border-[var(--line)] tw:bg-[#174983] tw:text-white tw:px-3 tw:py-1.5 tw:text-sm tw:font-medium"><span>{category.name}</span><span className="tw:text-xs tw:font-normal">{category.competition ? `${pairs.length} ${category.competition.format === "TRIO" ? "trios ativos" : "duplas ativas"}` : `${confirmedCount} confirmadas · ${category.registrations.length} inscrições`}</span></summary><div className="tw:px-2 tw:py-2 tw:grid tw:min-w-0 tw:gap-2">
            {!category.competition && category.registrationType !== "INDIVIDUAL" ? <div className="stack-sm tw:[margin-bottom:0.75rem]">
              <form action={updateTournamentCategoryFormatAction} className={viewStyles.section_actions}>
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="categoryId" value={category.id} />
                <select name="groupCount" defaultValue={String((category as any).groupCount ?? 4)} disabled={tournament.registrationPhase === "REGISTRATIONS"}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <option key={index + 1} value={index + 1}>{index + 1} grupos</option>
                  ))}
                </select>
                <select name="pairsPerGroup" defaultValue={String((category as any).pairsPerGroup ?? 3)} disabled={tournament.registrationPhase === "REGISTRATIONS"}>
                  {Array.from({ length: 15 }).map((_, index) => (
                    <option key={index + 2} value={index + 2}>{index + 2} duplas/grupo</option>
                  ))}
                </select>
                <SubmitButton label="Salvar formato" pendingLabel="Salvando..." className={ui.primary} />
              </form>
              {tournament.registrationPhase === "REGISTRATIONS" ? (
                <button type="button" className={ui.success} disabled>
                  Montar chaveamento da categoria
                </button>
              ) : (
                <form action={generateCategoryBracketAction} className={viewStyles.section_actions}>
                  <input type="hidden" name="tournamentId" value={tournament.id} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <SubmitButton
                    label="Montar chaveamento da categoria"
                    pendingLabel="Montando..."
                    className={ui.success}
                  />
                </form>
              )}
            </div> : <div className="tw:flex tw:justify-end"><Link className={ui.primary} href={`/torneios/${tournament.id}/categorias/${category.id}?tab=registrations`}>Gerenciar inscrições</Link></div>}

            <div className="tw:min-w-0 tw:rounded-md tw:border tw:border-[#cbd9e9]"><table className="tw:w-full tw:table-fixed tw:border-collapse tw:text-left tw:viewport-760:block"><colgroup className="tw:viewport-760:hidden"><col className="tw:w-[38%]"/><col className="tw:w-[13%]"/><col className="tw:w-[14%]"/><col className="tw:w-[20%]"/><col className="tw:w-[15%]"/></colgroup><thead className="tw:bg-[#174983] tw:text-xs tw:text-white tw:viewport-760:hidden"><tr className="tw:[&>th]:px-3 tw:[&>th]:py-1.5 tw:[&>th]:font-normal"><th>Participante / Equipe</th><th>Valor</th><th>Situação</th><th>Pagamento</th><th className="tw:text-right">Ações</th></tr></thead><tbody className="tw:viewport-760:block">
              {pairs.filter((pair:any)=>matchesQuery(pair.players.map((p:any)=>p.player.name).join(" ")+" "+pair.name)).map((pair:any)=>{
                const ids=pair.players.map((item:any)=>item.player.id);
                const matchingRegistrations=category.registrations.filter((registration:any)=>ids.includes(registration.leadPlayerId)&&ids.includes(registration.partnerPlayerId)&&(!registration.thirdPlayerId||ids.includes(registration.thirdPlayerId)));
                const newestRegistrations=[...matchingRegistrations].reverse();
                const linkedRegistration=newestRegistrations.find((registration:any)=>!registrationCanceled(registration)) ?? newestRegistrations[0];
                const canReceive=linkedRegistration?.paymentProvider === "PAY_ON_SITE" && linkedRegistration.status === "CONFIRMED" && linkedRegistration.paymentStatus === "PENDING" && canPerformPermission("finance:receivable:settle",auth.arenaRole,auth.systemRole,auth.editPermissions);
                return <TournamentRegistrationRow showCategory={false} key={pair.id} name={pair.players.map((item:any)=>item.player.name).join(" / ")||pair.name} category={category.name} amount={linkedRegistration ? formatRegistrationMoney(linkedRegistration.amountCents) : "—"} situation={linkedRegistration ? registrationSituation(linkedRegistration) : category.competition?.format === "TRIO" ? "Trio ativo" : "Dupla ativa"} payment={linkedRegistration ? registrationPayment(linkedRegistration) : "Sem cobrança vinculada"} canceled={linkedRegistration ? registrationCanceled(linkedRegistration) : false} pending={linkedRegistration?.paymentStatus === "PENDING" || linkedRegistration?.paymentStatus === "REVIEW"} actions={<>{canReceive ? <ReceiveOnsiteRegistrationButton registrationId={linkedRegistration.id} accounts={bankAccounts}/> : null}<Link className={ui.primary} href={`/torneios/${tournament.id}/categorias/${category.id}?tab=registrations`}>Abrir</Link></>}><Link className={ui.primary} href={`/torneios/${tournament.id}/categorias/${category.id}?tab=registrations`}>Gerenciar equipe</Link></TournamentRegistrationRow>;
              })}
              {category.registrations.filter((reg:any)=>!represented(reg)&&matchesQuery(`${reg.leadName} ${reg.partnerName} ${reg.thirdName ?? ""}`)).map((registration: any) => (
                <TournamentRegistrationRow showCategory={false} key={registration.id} name={[registration.leadName,registration.partnerName,registration.thirdName].filter(Boolean).join(" / ")} category={category.name} amount={formatRegistrationMoney(registration.amountCents)} situation={registrationSituation(registration)} payment={registrationPayment(registration)} canceled={registrationCanceled(registration)} pending={registration.paymentStatus === "PENDING" || registration.paymentStatus === "REVIEW"} actions={registration.paymentProvider === "PAY_ON_SITE" && registration.status === "CONFIRMED" && registration.paymentStatus === "PENDING" && canPerformPermission("finance:receivable:settle",auth.arenaRole,auth.systemRole,auth.editPermissions) ? <ReceiveOnsiteRegistrationButton registrationId={registration.id} accounts={bankAccounts}/> : null}>
                    {registration.paymentStatus === "REVIEW" ? <ReviewedCheckoutRelease kind="registration" recordId={registration.id} paymentId={registration.mercadoPagoPaymentId} clientName={`${registration.leadName} / ${registration.partnerName}`} canResolve={canResolveReview} /> : registration.paymentStatus === "REFUNDED" || registration.status === "CANCELED" ? <p className={viewStyles.muted}>Pagamento estornado ou inscrição cancelada. É possível fazer uma nova inscrição.</p> : !registration.canEdit ? <p className={viewStyles.muted}>{registration.status === "CONFIRMED" ? "Inscrição confirmada: correções devem preservar seus vínculos com o evento." : "Inscrição com cobrança online: confira o pagamento antes de alterar os dados."}</p> : <details>
                      <summary className="tw:[cursor:pointer] tw:[color:var(--brand)] tw:font-medium">Editar inscrição</summary>
                      <RegistrationEditForm className={viewStyles.grid_form}>
                        <input type="hidden" name="registrationId" value={registration.id} /><input type="hidden" name="registrationType" value={category.registrationType ?? "PAIR"}/>
                        <input type="hidden" name="tournamentId" value={tournament.id} />
                        <label className={viewStyles.field}>Categoria
                          <SmartEntitySelect label="Categoria" name="categoryId" defaultValue={registration.categoryId} required>
                            {tournament.categories.filter((item: any) => (item.registrationType ?? "PAIR") === (category.registrationType ?? "PAIR") && (item.competition?.format === "TRIO") === (category.competition?.format === "TRIO")).map((item: any) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </SmartEntitySelect>
                        </label>
                        <label className={viewStyles.field}>Atleta 1
                          <input name="leadName" defaultValue={registration.leadName} required />
                        </label>
                        <label className={viewStyles.field}>Telefone atleta 1
                          <PhoneInput name="leadPhone" defaultValue={registration.leadPhone} required />
                        </label>
                        <label className={viewStyles.field}>CPF atleta 1
                          <input name="leadCpf" defaultValue={registration.leadCpf} required />
                        </label>
                        <label className={viewStyles.field}>Nascimento atleta 1 (opcional)
                          <input name="leadBirthDate" type="date" defaultValue={registration.leadBirthDate ? new Date(registration.leadBirthDate).toISOString().slice(0, 10) : ""} />
                        </label>
                        {category.registrationType !== "INDIVIDUAL" ? <>
                        <label className={viewStyles.field}>Atleta 2
                          <input name="partnerName" defaultValue={registration.partnerName} required />
                        </label>
                        <label className={viewStyles.field}>Telefone atleta 2
                          <PhoneInput name="partnerPhone" defaultValue={registration.partnerPhone} required />
                        </label>
                        <label className={viewStyles.field}>CPF atleta 2
                          <input name="partnerCpf" defaultValue={registration.partnerCpf} required />
                        </label>
                        <label className={viewStyles.field}>Nascimento atleta 2 (opcional)
                          <input name="partnerBirthDate" type="date" defaultValue={registration.partnerBirthDate ? new Date(registration.partnerBirthDate).toISOString().slice(0, 10) : ""} />
                        </label>
                        </> : null}
                        {category.competition?.format === "TRIO" ? <><label className={viewStyles.field}>Atleta 3<input name="thirdName" defaultValue={registration.thirdName} required /></label><label className={viewStyles.field}>Telefone atleta 3<PhoneInput name="thirdPhone" defaultValue={registration.thirdPhone} required /></label><label className={viewStyles.field}>CPF atleta 3<input name="thirdCpf" defaultValue={registration.thirdCpf} required /></label><label className={viewStyles.field}>Nascimento atleta 3 (opcional)<input name="thirdBirthDate" type="date" defaultValue={registration.thirdBirthDate ? new Date(registration.thirdBirthDate).toISOString().slice(0,10) : ""} /></label></> : null}
                        <RegistrationPaymentFields amountCents={registration.amountCents} accounts={bankAccounts} />
                        <div className={viewStyles.field_field_submit}>
                          <SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className={ui.success} />
                        </div>
                      </RegistrationEditForm>
                    </details>}
                </TournamentRegistrationRow>
              ))}
              {!category.registrations.length && !pairs.length ? <tr><td colSpan={5} className="tw:p-3 tw:text-sm tw:text-[#465c75]">Sem inscrições.</td></tr> : null}
            </tbody></table></div>

            {bracket ? (
              <details className="tw:min-w-0 tw:border-t tw:border-[var(--line)] tw:pt-3"><summary className="tw:cursor-pointer tw:text-xs tw:font-medium">Jogos da chave · {bracket.matches.length}</summary>
                {bracket.matches.map((match) => (
                  <form key={match.id} action={updateCategoryBracketMatchScheduleAction} className={viewStyles.simple_item}>
                    <input type="hidden" name="matchId" value={match.id} />
                    <span>{match.label}: {match.homeRegistration?.leadName ?? "A definir"} / {match.homeRegistration?.partnerName ?? "-"} x {match.awayRegistration?.leadName ?? "A definir"} / {match.awayRegistration?.partnerName ?? "-"}</span>
                    <div className={viewStyles.section_actions}>
                      <input name="scheduledTime" defaultValue={match.scheduledTime} placeholder="18:00" />
                      <input name="courtName" defaultValue={match.courtName} placeholder="Quadra" />
                      <SubmitButton label="Salvar" pendingLabel="..." className={ui.primary} />
                    </div>
                  </form>
                ))}
              </details>
            ) : null}
          </div></details>
        );
      })}
      {!categories.length?<p className={ui.empty}>Nenhuma inscrição encontrada para esta pesquisa.</p>:null}
    </div>
  );
}

