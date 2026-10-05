import { viewStyles } from "./permission-profiles-management.utilities";
import Link from "next/link";
import { createPermissionProfileAction } from "@/lib/actions/permission-profile";
import { SectionCard } from "@/components/section-card";

export function PermissionProfilesManagement({ profiles }: { profiles: { id: string; name: string; description: string; members: { user: { name: string } }[] }[] }) {
  const orderedProfiles = [...profiles].sort((a, b) => {
    const order = ["Administrador", "Financeiro", "Balcão"];
    const first = order.indexOf(a.name);
    const second = order.indexOf(b.name);
    return (first === -1 ? order.length : first) - (second === -1 ? order.length : second) || a.name.localeCompare(b.name, "pt-BR");
  });

  return <SectionCard title="Perfis de usuário" description="Defina os acessos que serão aplicados aos usuários vinculados a cada perfil." className={viewStyles.permission_profiles_card}>
    <details className={viewStyles.setting_create_panel_permission_profile_create_panel}>
      <summary className={viewStyles.button_button_primary_button_small}>Novo perfil</summary>
      <form action={createPermissionProfileAction} className={viewStyles.permission_profile_create_form}>
        <label className={viewStyles.field}>Nome do perfil<input name="name" placeholder="Ex.: Recepção" minLength={2} required /></label>
        <label className={viewStyles.field}>Descrição<input name="description" placeholder="Ex.: Pode abrir e finalizar comandas" /></label>
        <button className={viewStyles.button_button_primary_button_small}>Criar perfil</button>
      </form>
    </details>
    <div className={viewStyles.standard_list_permission_profiles_list} role="table" aria-label="Perfis de usuário">
      <div className={viewStyles.standard_list_head} role="row"><span>Perfil</span><span>Descrição</span><span>Usuários</span><span>Ação</span></div>
      {orderedProfiles.map((profile) => <Link key={profile.id} href={`/arena/perfis/${profile.id}`} className={viewStyles.standard_list_row} role="row"><strong>{profile.name}</strong><span>{profile.description || "Sem descrição"}</span><span className={viewStyles.permission_profile_members}>{profile.members.length ? profile.members.map(({ user }) => user.name).join(" · ") : "Nenhum usuário vinculado"}</span><span className={viewStyles.standard_list_action}>Configurar <b aria-hidden="true">›</b></span></Link>)}
      {!orderedProfiles.length ? <p className={viewStyles.standard_list_empty}>Nenhum perfil criado.</p> : null}
    </div>
  </SectionCard>;
}
