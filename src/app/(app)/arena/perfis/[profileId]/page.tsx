import { isMigratedPermissionProfile, permissionProfileLabel } from "@/lib/permission-profile-label";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { PermissionMatrix } from "@/components/users/permission-matrix";
import { deletePermissionProfileAction, updatePermissionProfileAction } from "@/lib/actions/permission-profile";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function PermissionProfilePage(props: { params: Promise<{ profileId: string }> }) {
  const params = await props.params;
  const auth = await requireRole("ADMIN");
  const profile = await prisma.permissionProfile.findFirst({ where: { id: params.profileId, arenaId: auth.arenaId }, include: { _count: { select: { members: true } } } });
  if (!profile) notFound();
  return <div className={viewStyles.profile_editor_page}><Link className={viewStyles.button_button_secondary_profile_page_back} href="/arena?section=profiles">← Voltar aos perfis</Link><section className={viewStyles.section_card_profile_editor_card}><h1 className="tw:sr-only">{permissionProfileLabel(profile.name)}</h1><SafeActionForm action={updatePermissionProfileAction} className={viewStyles.profile_editor_form} successMessage="Permissões atualizadas."><input type="hidden" name="profileId" value={profile.id} /><div className={viewStyles.profile_editor_fields}><label className={viewStyles.field}>Nome{isMigratedPermissionProfile(profile.name) ? <><input type="hidden" name="name" value={profile.name} /><input value={permissionProfileLabel(profile.name)} readOnly /></> : <input name="name" defaultValue={profile.name} minLength={2} required />}</label><label className={viewStyles.field}>Descrição<input name="description" defaultValue={profile.description} /></label></div><PermissionMatrix viewPermissions={profile.viewPermissions} editPermissions={profile.editPermissions} /><div className={viewStyles.profile_editor_actions}><SubmitButton label="Salvar permissões" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div></SafeActionForm>{profile._count.members === 0 ? <SafeActionForm action={deletePermissionProfileAction} className={viewStyles.profile_delete_form} successMessage="Perfil excluído." successHref="/arena?section=profiles" confirmKeyword="EXCLUIR" confirmPrompt="Digite EXCLUIR para apagar este perfil."><input type="hidden" name="profileId" value={profile.id} /><button className={viewStyles.button_button_danger}>Excluir perfil</button></SafeActionForm> : <p className={viewStyles.muted}>Para excluir, primeiro atribua os usuários a outro perfil.</p>}</section></div>;
}
