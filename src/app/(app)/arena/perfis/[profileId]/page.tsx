import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { PermissionMatrix } from "@/components/users/permission-matrix";
import { deletePermissionProfileAction, updatePermissionProfileAction } from "@/lib/actions/permission-profile";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function PermissionProfilePage({ params }: { params: { profileId: string } }) {
  const auth = await requireRole("ADMIN");
  const profile = await prisma.permissionProfile.findFirstOrThrow({ where: { id: params.profileId, arenaId: auth.arenaId }, include: { _count: { select: { members: true } } } });
  return <div className="profile-editor-page"><Link className="button button-secondary profile-page-back" href="/arena?section=profiles">← Voltar aos perfis</Link><section className="section-card profile-editor-card"><header><div><span className="eyebrow">PERFIL DE USUÁRIO</span><h1>{profile.name}</h1><p className="muted">{profile._count.members} usuário(s) vinculados. Salvar aqui atualiza todos eles.</p></div></header><SafeActionForm action={updatePermissionProfileAction} className="profile-editor-form" successMessage="Permissões atualizadas."><input type="hidden" name="profileId" value={profile.id} /><div className="profile-editor-fields"><label className="field">Nome<input name="name" defaultValue={profile.name} minLength={2} required /></label><label className="field">Descrição<input name="description" defaultValue={profile.description} /></label></div><PermissionMatrix viewPermissions={profile.viewPermissions} editPermissions={profile.editPermissions} /><div className="profile-editor-actions"><SubmitButton label="Salvar permissões" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm>{profile._count.members === 0 ? <SafeActionForm action={deletePermissionProfileAction} className="profile-delete-form" successMessage="Perfil excluído." successHref="/arena?section=profiles" confirmKeyword="EXCLUIR" confirmPrompt="Digite EXCLUIR para apagar este perfil."><input type="hidden" name="profileId" value={profile.id} /><button className="button button-danger">Excluir perfil</button></SafeActionForm> : <p className="muted">Para excluir, primeiro atribua os usuários a outro perfil.</p>}</section></div>;
}
