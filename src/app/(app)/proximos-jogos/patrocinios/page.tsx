import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { createTvSponsorAction, deleteTvSponsorAction, updateTvSponsorAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const asCurrency = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const planOptions = ["Bronze", "Prata", "Ouro", "Master"];
const typeOptions = ["Mensal", "Evento", "Liga", "Permuta"];
const benefitOptions = ["Jogos", "Aulas", "Tela da TV", "Redes sociais"];

function SponsorFields({ prefix, sponsor, order }: { prefix: string; sponsor?: { name: string; sponsorshipType: string; subtitle: string; monthlyAmountCents: number; benefits: string }; order: number }) {
  const selectedBenefits = sponsor?.benefits.split("·").map((item) => item.trim()).filter(Boolean) ?? [];
  return <>
    <input type="hidden" name="displayOrder" value={order} />
    <div className="field"><label htmlFor={`${prefix}-name`}>Patrocinador</label><input id={`${prefix}-name`} name="name" required defaultValue={sponsor?.name ?? ""} placeholder="Nome da empresa" /></div>
    <div className="field"><label htmlFor={`${prefix}-type`}>Tipo</label><select id={`${prefix}-type`} name="sponsorshipType" defaultValue={sponsor?.sponsorshipType || "Mensal"}>{typeOptions.map((type) => <option key={type}>{type}</option>)}</select></div>
    <div className="field"><label htmlFor={`${prefix}-plan`}>Plano</label><select id={`${prefix}-plan`} name="subtitle" defaultValue={sponsor?.subtitle || "Bronze"}>{planOptions.map((plan) => <option key={plan}>{plan}</option>)}</select></div>
    <div className="field"><label htmlFor={`${prefix}-amount`}>Valor mensal (R$)</label><input id={`${prefix}-amount`} name="monthlyAmount" inputMode="decimal" defaultValue={asCurrency(sponsor?.monthlyAmountCents ?? 0)} required /></div>
    <div className="field"><label htmlFor={`${prefix}-logo`}>Logo</label><input id={`${prefix}-logo`} name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></div>
    <fieldset className="sponsor-benefit-options form-full"><legend>Entregas incluídas</legend>{benefitOptions.map((benefit) => <label key={benefit}><input name="benefits" type="checkbox" value={benefit} defaultChecked={selectedBenefits.includes(benefit)} />{benefit}</label>)}</fieldset>
  </>;
}

export default async function SponsorshipManagementPage() {
  const auth = await requireModuleView("tv");
  const sponsors = await prisma.tvSponsor.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] });
  return <div className="stack-md sponsorship-management-page">
    <header className="page-header"><div className="stack-xs"><p className="eyebrow">Gestão comercial</p><h1>Gestão de patrocínios</h1><p className="muted">Organize parceiros por plano e defina as entregas contratadas. A seleção para a TV é feita separadamente.</p></div></header>
    <SectionCard title="Planos de patrocínio" description="Cadastre o parceiro e escolha as opções do plano; os dados ficam organizados em cartões.">
      <details className="sponsor-plan-create"><summary className="button button-primary">Novo patrocinador</summary><SafeActionForm action={createTvSponsorAction} className="grid-form sponsor-plan-form" resetOnSuccess successMessage="Patrocinador cadastrado."><SponsorFields prefix="new-sponsor" order={sponsors.length + 1} /><div className="form-full"><SubmitButton label="Cadastrar patrocinador" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm></details>
      <div className="sponsor-management-list">{sponsors.length ? sponsors.map((sponsor) => <article key={sponsor.id} className="sponsor-management-card"><header className="sponsor-card-header">{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt={`Logo de ${sponsor.name}`} className="tv-sponsor-form-logo" /> : <span className="sponsor-logo-placeholder" aria-hidden="true">{sponsor.name.slice(0, 1)}</span>}<div><strong>{sponsor.name}</strong><p className="muted">{sponsor.subtitle || "Plano não informado"} · {sponsor.sponsorshipType || "Mensal"}</p><b>R$ {asCurrency(sponsor.monthlyAmountCents)}/mês</b></div></header><div className="sponsor-benefit-tags">{sponsor.benefits ? sponsor.benefits.split("·").map((benefit) => <span key={benefit}>{benefit.trim()}</span>) : <span>Sem entregas definidas</span>}</div><details className="sponsor-plan-edit"><summary>Editar plano</summary><SafeActionForm action={updateTvSponsorAction} className="grid-form sponsor-plan-form" successMessage="Patrocinador atualizado."><input type="hidden" name="sponsorId" value={sponsor.id} /><SponsorFields prefix={sponsor.id} sponsor={sponsor} order={sponsor.displayOrder} /><div className="form-full"><SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm></details><SafeActionForm action={deleteTvSponsorAction} successMessage="Patrocinador excluído."><input type="hidden" name="sponsorId" value={sponsor.id} /><SubmitButton label="Excluir patrocinador" pendingLabel="Excluindo..." className="button button-danger button-small" /></SafeActionForm></article>) : <p className="muted">Nenhum patrocinador cadastrado.</p>}</div>
    </SectionCard>
  </div>;
}
