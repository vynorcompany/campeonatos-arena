import { SettingsDialogButton } from "@/components/ui/settings-dialog-button";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { viewStyles } from "./permission-profiles-management.utilities";
import Link from "next/link";
import { createPermissionProfileAction } from "@/lib/actions/permission-profile";
import { permissionProfileLabel } from "@/lib/permission-profile-label";

export function PermissionProfilesManagement({ profiles }: { profiles: { id: string; name: string; description: string; members: { user: { name: string } }[] }[] }) {
  const orderedProfiles = [...profiles].sort((a, b) => {
    const order = ["Administrador", "Financeiro", "Balcão"];
    const first = order.indexOf(a.name);
    const second = order.indexOf(b.name);
    return (first === -1 ? order.length : first) - (second === -1 ? order.length : second) || a.name.localeCompare(b.name, "pt-BR");
  });

  return <section className={ui.page} aria-label="Perfis de usuário">
    <div className={ui.toolbar}><SettingsDialogButton label="Novo perfil">
      <form action={createPermissionProfileAction} className={viewStyles.permission_profile_create_form}>
        <label className={viewStyles.field}>Nome do perfil<input name="name" placeholder="Ex.: Recepção" minLength={2} required /></label>
        <label className={viewStyles.field}>Descrição<input name="description" placeholder="Ex.: Pode abrir e finalizar comandas" /></label>
        <div className="tw:col-span-full tw:flex tw:justify-end tw:border-t tw:border-[var(--line)] tw:pt-4"><button className={viewStyles.button_button_primary_button_small}>Criar perfil</button></div>
      </form>
    </SettingsDialogButton></div>
    <nav className={viewStyles.standard_list_permission_profiles_list} aria-label="Perfis disponíveis">
      <div className={viewStyles.standard_list_head} aria-hidden="true"><span>Perfil</span><span>Descrição</span><span>Usuários</span><span>Ação</span></div>
      {orderedProfiles.map((profile) => <Link key={profile.id} href={`/arena/perfis/${profile.id}`} className={viewStyles.standard_list_row}><strong>{permissionProfileLabel(profile.name)}</strong><span>{profile.description || "Sem descrição"}</span><span className={viewStyles.permission_profile_members}>{profile.members.length ? profile.members.map(({ user }) => user.name).join(" · ") : "Nenhum usuário vinculado"}</span><span className={viewStyles.standard_list_action}>Configurar <b aria-hidden="true">›</b></span></Link>)}
      {!orderedProfiles.length ? <p className={viewStyles.standard_list_empty}>Nenhum perfil criado.</p> : null}
    </nav>
  </section>;
}
