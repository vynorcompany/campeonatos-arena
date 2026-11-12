
import Link from "next/link";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { PhoneInput } from "@/components/forms/phone-input";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { viewStyles } from "./page.utilities";
﻿import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import { requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import {
  generateCategoryBracketAction,
  updateCategoryBracketMatchScheduleAction,
  updateTournamentCategoryFormatAction,
} from "@/lib/actions/tournament";
import { RegistrationEditForm, RegistrationPaymentFields } from "@/components/tournaments/registration-edit-form";
import { getTournamentScheduleConflicts } from "@/lib/services/tournament";
import { ReviewedCheckoutRelease } from "@/components/finance/reviewed-checkout-release";
import { canPerformPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { canEditManualTournamentRegistration } from "@/lib/tournaments/registration-deletion";

type BracketItem = {
  categoryId: string;
  matches: Array<{
    id: string;
    label: string;
    homeRegistration: { leadName: string; partnerName: string } | null;
    awayRegistration: { leadName: string; partnerName: string } | null;
    scheduledTime: string;
    courtName: string;
  }>;
};

export default async function TournamentRegistrationsPage({searchParams}:{searchParams:Promise<{tournamentId?:string;q?:string}>}) {
  const filters=await searchParams;
  const query=(filters.q??"").trim().toLocaleLowerCase("pt-BR");
  const auth = await requireModuleView("tournaments");
  if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) redirect("/jogos");
  const tenantDb = arenaDatabase(auth.arenaId);
  const canResolveReview = canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const events=await tenantDb.tournament.findMany({where:{arenaId:auth.arenaId,status:{not:"FINISHED"}},orderBy:{createdAt:"desc"},select:{id:true,name:true}});
  const selectedId=events.find(e=>e.id===filters.tournamentId)?.id??events[0]?.id;
  let tournament: any = null;
  let categoryBrackets: BracketItem[] = [];

  try {
    tournament = await tenantDb.tournament.findFirst({
      where: {
        arenaId: auth.arenaId,
        id: selectedId,
        status: {
          not: "FINISHED"
        }
      },
      include: {
        categories: {
          where: { active: true },
          orderBy: { level: "asc" },
          include: {
            competition: {
              include: { pairs: {
                where: { active: true }, orderBy: { drawOrder: "asc" },
                include: { players: { orderBy: { slot: "asc" }, include: { player: { select: { id: true, name: true } } } } }
              } }
            },
            registrations: {
              orderBy: { createdAt: "asc" }
            }
          }
        },
        categoryBrackets: {
          include: {
            category: true,
            matches: {
              include: {
                homeRegistration: true,
                awayRegistration: true
              },
              orderBy: { roundOrder: "asc" }
            }
          }
        }
      }
    });
    categoryBrackets = tournament?.categoryBrackets ?? [];
  } catch {
    tournament = await tenantDb.tournament.findFirst({
      where: {
        arenaId: auth.arenaId,
        id: selectedId,
        status: {
          not: "FINISHED"
        }
      },
      include: {
        categories: {
          where: { active: true },
          orderBy: { level: "asc" },
          include: {
            competition: {
              include: { pairs: {
                where: { active: true }, orderBy: { drawOrder: "asc" },
                include: { players: { orderBy: { slot: "asc" }, include: { player: { select: { id: true, name: true } } } } }
              } }
            },
            registrations: {
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });
  }

  if (!tournament) {
    return <SectionCard title="Inscrições" hideHeading><p className={viewStyles.muted}>Nenhum torneio ativo.</p></SectionCard>;
  }

  const bankAccounts = await tenantDb.bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  const conflicts = await getTournamentScheduleConflicts(tournament.id, auth.arenaId);
  const matchesQuery=(names:string)=>!query||names.toLocaleLowerCase("pt-BR").includes(query);
  const categories=tournament.categories.filter((category:any)=>!query||category.registrations.some((reg:any)=>matchesQuery(`${reg.leadName} ${reg.partnerName}`))||category.competition?.pairs.some((pair:any)=>matchesQuery(pair.players.map((p:any)=>p.player.name).join(" ")+" "+pair.name)));


  return (
    <div className={viewStyles.stack_md}>
      <h1 className="tw:sr-only">Inscrições</h1><form className={ui.filters} action="/torneios/inscricoes"><label className={`${ui.field} tw:w-full tw:max-w-[320px]`}>Evento<select name="tournamentId" defaultValue={tournament.id}>{events.map(event=><option key={event.id} value={event.id}>{event.name}</option>)}</select></label><label className={`${ui.field} tw:w-full tw:max-w-[300px]`}>Pesquisar dupla<input name="q" defaultValue={filters.q} placeholder="Nome de um dos atletas" type="search"/></label><button type="submit" className={ui.primary}>Aplicar filtros</button></form>

      {tournament.registrationPhase === "REGISTRATIONS" && tournament.categories.some((category:any)=>!category.competition) ? <p className="tw:m-0 tw:rounded tw:bg-[#f2f6fb] tw:px-3 tw:py-2 tw:text-xs">Encerre as inscrições para montar o chaveamento.</p>:null}

      {conflicts.length ? <details className={ui.panel}><summary className="tw:cursor-pointer tw:text-xs tw:font-medium tw:text-red-700">{conflicts.length} conflitos de agenda</summary><ul className={viewStyles.simple_list}>{conflicts.map(conflict=><li key={`${conflict.playerId}-${conflict.scheduledTime}`} className={viewStyles.simple_item}><strong>{conflict.scheduledTime}</strong><span>{conflict.labels.join(" | ")}</span></li>)}</ul></details>:null}

      {categories.map((category: any) => {
        const bracket = categoryBrackets.find((item) => item.categoryId === category.id);
        const pairs=category.competition?.pairs??[];
        const represented=(registration:any)=>pairs.some((pair:any)=>{const ids=pair.players.map((p:any)=>p.player.id);return ids.includes(registration.leadPlayerId)&&ids.includes(registration.partnerPlayerId);});
        const confirmedCount = category.registrations.filter((reg: any) => reg.status === "CONFIRMED").length;
        return (
          <details key={category.id} className={ui.list} open><summary className="tw:flex tw:cursor-pointer tw:flex-col tw:items-start tw:justify-between tw:gap-1 tw:sm:flex-row tw:sm:items-center tw:border-b tw:border-[var(--line)] tw:bg-[#f2f6fb] tw:px-3 tw:py-2 tw:text-sm tw:font-medium"><span>{category.name}</span><span className="tw:text-xs tw:font-normal">{category.competition ? `${pairs.length} duplas ativas` : `${confirmedCount} confirmadas · ${category.registrations.length} inscrições`}</span></summary><div className="tw:p-3 tw:grid tw:min-w-0 tw:gap-3">
            {!category.competition ? <div className="stack-sm tw:[margin-bottom:0.75rem]">
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
                <SubmitButton label="Salvar formato" pendingLabel="Salvando..." className={viewStyles.button} />
              </form>
              {tournament.registrationPhase === "REGISTRATIONS" ? (
                <button type="button" className={viewStyles.button_button_primary} disabled>
                  Montar chaveamento da categoria
                </button>
              ) : (
                <form action={generateCategoryBracketAction} className={viewStyles.section_actions}>
                  <input type="hidden" name="tournamentId" value={tournament.id} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <SubmitButton
                    label="Montar chaveamento da categoria"
                    pendingLabel="Montando..."
                    className={viewStyles.button_button_primary}
                  />
                </form>
              )}
            </div> : <div className="tw:flex tw:justify-end"><Link className={ui.primary} href={`/torneios/${tournament.id}/categorias/${category.id}?tab=registrations`}>Gerenciar inscrições</Link></div>}

            <div className={viewStyles.simple_list}>
              {pairs.filter((pair:any)=>matchesQuery(pair.players.map((p:any)=>p.player.name).join(" ")+" "+pair.name)).map((pair:any)=><article key={pair.id} className="tw:flex tw:min-w-0 tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[var(--line)] tw:py-2 tw:text-xs"><div className="tw:min-w-0"><strong className="tw:block tw:break-words">{pair.players.map((p:any)=>p.player.name).join(" / ")||pair.name}</strong><span className="tw:text-[#087443]">Dupla ativa</span></div><Link className={ui.secondary} href={`/torneios/${tournament.id}/categorias/${category.id}?tab=registrations`}>Abrir</Link></article>)}
              {category.registrations.filter((reg:any)=>!represented(reg)&&matchesQuery(`${reg.leadName} ${reg.partnerName}`)).map((registration: any) => (
                <div key={registration.id} className={viewStyles.simple_item}>
                  <div className={viewStyles.stack_xs_2}>
                    <strong>{registration.leadName} / {registration.partnerName}</strong>
                    <span>{registration.paymentStatus === "REVIEW" ? "Pagamento em análise" : registration.paymentStatus === "REFUNDED" || registration.status === "CANCELED" ? "Inscrição cancelada" : registration.status === "CONFIRMED" ? "Confirmada" : "Pagamento pendente"} · {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(registration.amountCents / 100)}</span>
                    {registration.paymentStatus === "REVIEW" ? <ReviewedCheckoutRelease kind="registration" recordId={registration.id} paymentId={registration.mercadoPagoPaymentId} clientName={`${registration.leadName} / ${registration.partnerName}`} canResolve={canResolveReview} /> : registration.paymentStatus === "REFUNDED" || registration.status === "CANCELED" ? <p className={viewStyles.muted}>Pagamento estornado ou inscrição cancelada. A dupla pode fazer uma nova inscrição.</p> : !canEditManualTournamentRegistration(registration) ? <p className={viewStyles.muted}>{registration.status === "CONFIRMED" ? "Dupla confirmada: correções devem preservar seus vínculos com os jogos." : "Inscrição com cobrança online: confira o pagamento antes de alterar os dados."}</p> : <details>
                      <summary className="tw:[cursor:pointer] tw:[color:var(--brand)] tw:font-medium">Editar inscrição</summary>
                      <RegistrationEditForm className={viewStyles.grid_form}>
                        <input type="hidden" name="registrationId" value={registration.id} />
                        <input type="hidden" name="tournamentId" value={tournament.id} />
                        <label className={viewStyles.field}>Categoria
                          <SmartEntitySelect createKind="tournament-category" contextId={tournament.id} label="Categoria" name="categoryId" defaultValue={registration.categoryId} required>
                            {tournament.categories.map((item: any) => (
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
                        <RegistrationPaymentFields amountCents={registration.amountCents} accounts={bankAccounts} />
                        <div className={viewStyles.field_field_submit}>
                          <SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
                        </div>
                      </RegistrationEditForm>
                    </details>}
                  </div>
                </div>
              ))}
              {!category.registrations.length && !pairs.length ? <p className={viewStyles.muted}>Sem inscrições.</p> : null}
            </div>

            {bracket ? (
              <details className="tw:min-w-0 tw:border-t tw:border-[var(--line)] tw:pt-3"><summary className="tw:cursor-pointer tw:text-xs tw:font-medium">Jogos da chave · {bracket.matches.length}</summary>
                {bracket.matches.map((match) => (
                  <form key={match.id} action={updateCategoryBracketMatchScheduleAction} className={viewStyles.simple_item}>
                    <input type="hidden" name="matchId" value={match.id} />
                    <span>{match.label}: {match.homeRegistration?.leadName ?? "A definir"} / {match.homeRegistration?.partnerName ?? "-"} x {match.awayRegistration?.leadName ?? "A definir"} / {match.awayRegistration?.partnerName ?? "-"}</span>
                    <div className={viewStyles.section_actions}>
                      <input name="scheduledTime" defaultValue={match.scheduledTime} placeholder="18:00" />
                      <input name="courtName" defaultValue={match.courtName} placeholder="Quadra" />
                      <SubmitButton label="Salvar" pendingLabel="..." className={viewStyles.button} />
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

