import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { PermissionMatrix } from "@/components/users/permission-matrix";
import { deletePermissionProfileAction, updatePermissionProfileAction } from "@/lib/actions/permission-profile";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function PermissionProfilePage(props: { params: Promise<{ profileId: string }> }) {
  const params = await props.params;
  const auth = await requireRole("ADMIN");
  const profile = await prisma.permissionProfile.findFirstOrThrow({ where: { id: params.profileId, arenaId: auth.arenaId }, include: { _count: { select: { members: true } } } });
  return <div className={viewStyles.profile_editor_page}><Link className={viewStyles.button_button_secondary_profile_page_back} href="/arena?section=profiles">← Voltar aos perfis</Link><section className={viewStyles.section_card_profile_editor_card}><header><div><span className={viewStyles.eyebrow}>PERFIL DE USUÁRIO</span><h1>{profile.name}</h1><p className={viewStyles.muted}>{profile._count.members} usuário(s) vinculados. Salvar aqui atualiza todos eles.</p></div></header><SafeActionForm action={updatePermissionProfileAction} className={viewStyles.profile_editor_form} successMessage="Permissões atualizadas."><input type="hidden" name="profileId" value={profile.id} /><div className={viewStyles.profile_editor_fields}><label className={viewStyles.field}>Nome<input name="name" defaultValue={profile.name} minLength={2} required /></label><label className={viewStyles.field}>Descrição<input name="description" defaultValue={profile.description} /></label></div><PermissionMatrix viewPermissions={profile.viewPermissions} editPermissions={profile.editPermissions} /><div className={viewStyles.profile_editor_actions}><SubmitButton label="Salvar permissões" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div></SafeActionForm>{profile._count.members === 0 ? <SafeActionForm action={deletePermissionProfileAction} className={viewStyles.profile_delete_form} successMessage="Perfil excluído." successHref="/arena?section=profiles" confirmKeyword="EXCLUIR" confirmPrompt="Digite EXCLUIR para apagar este perfil."><input type="hidden" name="profileId" value={profile.id} /><button className={viewStyles.button_button_danger}>Excluir perfil</button></SafeActionForm> : <p className={viewStyles.muted}>Para excluir, primeiro atribua os usuários a outro perfil.</p>}</section></div>;
}
