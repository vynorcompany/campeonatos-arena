import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { createTvSponsorAction, deleteTvSponsorAction, updateTvSponsorAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const asCurrency = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export default async function SponsorshipManagementPage() {
  const auth = await requireModuleView("tv");
  const sponsors = await prisma.tvSponsor.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] });
  return <div className="stack-md">
    <header className="page-header"><div className="stack-xs"><p className="eyebrow">Tela da TV</p><h1>Gestão de patrocínios</h1><p className="muted">Cadastre o plano, as entregas e a marca de cada parceiro. A escolha para a TV é feita nas configurações de slides.</p></div><Link className="button button-secondary" href="/proximos-jogos/apresentacao">Voltar à TV</Link></header>
    <SectionCard title="Novo patrocinador" description="Os dados comerciais ficam centralizados aqui; a TV exibe somente os parceiros selecionados.">
      <SafeActionForm action={createTvSponsorAction} className="grid-form" resetOnSuccess successMessage="Patrocinador cadastrado.">
        <div className="field"><label htmlFor="new-sponsor-name">Nome</label><input id="new-sponsor-name" name="name" required placeholder="Ex.: Marca parceira" /></div>
        <div className="field"><label htmlFor="new-sponsor-type">Tipo de patrocínio</label><input id="new-sponsor-type" name="sponsorshipType" placeholder="Ex.: Mensal, permuta" /></div>
        <div className="field"><label htmlFor="new-sponsor-plan">Plano</label><input id="new-sponsor-plan" name="subtitle" placeholder="Ex.: Patrocinador ouro" /></div>
        <div className="field"><label htmlFor="new-sponsor-amount">Valor mensal (R$)</label><input id="new-sponsor-amount" name="monthlyAmount" inputMode="decimal" defaultValue="0,00" /></div>
        <div className="field"><label htmlFor="new-sponsor-order">Ordem</label><input id="new-sponsor-order" name="displayOrder" type="number" min="1" defaultValue={sponsors.length + 1} /></div>
        <div className="field"><label htmlFor="new-sponsor-logo">Logo</label><input id="new-sponsor-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></div>
        <div className="field form-full"><label htmlFor="new-sponsor-benefits">Entregas incluídas</label><textarea id="new-sponsor-benefits" name="benefits" rows={3} placeholder="Ex.: jogos da liga, aulas, presença no telão e posts." /></div>
        <div className="form-full"><SubmitButton label="Cadastrar patrocinador" pendingLabel="Salvando..." className="button button-primary" /></div>
      </SafeActionForm>
    </SectionCard>
    <SectionCard title="Patrocinadores cadastrados" description="Atualize os dados de cada parceiro sem poluir a configuração da TV.">
      <div className="sponsor-management-list">{sponsors.length ? sponsors.map((sponsor) => <article key={sponsor.id} className="sponsor-management-card"><div className="sponsor-card-header">{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt={`Logo de ${sponsor.name}`} className="tv-sponsor-form-logo" /> : null}<div><strong>{sponsor.name}</strong><p className="muted">{sponsor.sponsorshipType || "Tipo não informado"} · R$ {asCurrency(sponsor.monthlyAmountCents)}/mês</p></div></div><SafeActionForm action={updateTvSponsorAction} className="grid-form" successMessage="Patrocinador atualizado."><input type="hidden" name="sponsorId" value={sponsor.id} /><div className="field"><label htmlFor={`${sponsor.id}-name`}>Nome</label><input id={`${sponsor.id}-name`} name="name" defaultValue={sponsor.name} required /></div><div className="field"><label htmlFor={`${sponsor.id}-type`}>Tipo</label><input id={`${sponsor.id}-type`} name="sponsorshipType" defaultValue={sponsor.sponsorshipType} /></div><div className="field"><label htmlFor={`${sponsor.id}-plan`}>Plano</label><input id={`${sponsor.id}-plan`} name="subtitle" defaultValue={sponsor.subtitle} /></div><div className="field"><label htmlFor={`${sponsor.id}-amount`}>Valor mensal (R$)</label><input id={`${sponsor.id}-amount`} name="monthlyAmount" inputMode="decimal" defaultValue={asCurrency(sponsor.monthlyAmountCents)} /></div><div className="field"><label htmlFor={`${sponsor.id}-order`}>Ordem</label><input id={`${sponsor.id}-order`} name="displayOrder" type="number" min="1" defaultValue={sponsor.displayOrder} /></div><div className="field"><label htmlFor={`${sponsor.id}-logo`}>Nova logo</label><input id={`${sponsor.id}-logo`} name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></div><div className="field form-full"><label htmlFor={`${sponsor.id}-benefits`}>Entregas incluídas</label><textarea id={`${sponsor.id}-benefits`} name="benefits" rows={3} defaultValue={sponsor.benefits} /></div><div className="form-full"><SubmitButton label="Salvar" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm><SafeActionForm action={deleteTvSponsorAction} successMessage="Patrocinador excluído."><input type="hidden" name="sponsorId" value={sponsor.id} /><SubmitButton label="Excluir patrocinador" pendingLabel="Excluindo..." className="button button-danger" /></SafeActionForm></article>) : <p className="muted">Nenhum patrocinador cadastrado.</p>}</div>
    </SectionCard>
  </div>;
}
