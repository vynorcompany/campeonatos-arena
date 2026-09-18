import Link from "next/link";
import { createPermissionProfileAction } from "@/lib/actions/permission-profile";
import { SectionCard } from "@/components/section-card";

export function PermissionProfilesManagement({ profiles }: { profiles: { id: string; name: string; description: string; _count: { members: number } }[] }) {
  const orderedProfiles = [...profiles].sort((a, b) => {
    const order = ["Administrador", "Financeiro", "Balcão"];
    const first = order.indexOf(a.name);
    const second = order.indexOf(b.name);
    return (first === -1 ? order.length : first) - (second === -1 ? order.length : second) || a.name.localeCompare(b.name, "pt-BR");
  });

  return <SectionCard title="Perfis de usuário" description="Defina os acessos que serão aplicados aos usuários vinculados a cada perfil." className="permission-profiles-card">
    <details className="setting-create-panel permission-profile-create-panel">
      <summary className="button button-primary button-small">Novo perfil</summary>
      <form action={createPermissionProfileAction} className="permission-profile-create-form">
        <label className="field">Nome do perfil<input name="name" placeholder="Ex.: Recepção" minLength={2} required /></label>
        <label className="field">Descrição<input name="description" placeholder="Ex.: Pode abrir e finalizar comandas" /></label>
        <button className="button button-primary button-small">Criar perfil</button>
      </form>
    </details>
    <div className="standard-list permission-profiles-list" role="table" aria-label="Perfis de usuário">
      <div className="standard-list-head" role="row"><span>Perfil</span><span>Descrição</span><span>Usuários</span><span>Ação</span></div>
      {orderedProfiles.map((profile) => <Link key={profile.id} href={`/arena/perfis/${profile.id}`} className="standard-list-row permission-profile-row" role="row"><strong>{profile.name}</strong><span>{profile.description || "Sem descrição"}</span><span>{profile._count.members} usuário(s)</span><span className="standard-list-action">Configurar <b aria-hidden="true">›</b></span></Link>)}
      {!orderedProfiles.length ? <p className="standard-list-empty">Nenhum perfil criado.</p> : null}
    </div>
  </SectionCard>;
}
