import Link from "next/link";
import { PermissionMatrix } from "@/components/users/permission-matrix";
import { deletePermissionProfileAction, updatePermissionProfileAction } from "@/lib/actions/permission-profile";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function PermissionProfilePage({ params }: { params: { profileId: string } }) {
  const auth = await requireRole("ADMIN");
  const profile = await prisma.permissionProfile.findFirstOrThrow({ where: { id: params.profileId, arenaId: auth.arenaId }, include: { _count: { select: { members: true } } } });
  return <div className="profile-editor-page"><Link className="button button-secondary profile-page-back" href="/arena?section=profiles">← Voltar aos perfis</Link><section className="section-card profile-editor-card"><header><div><span className="eyebrow">PERFIL DE USUÁRIO</span><h1>{profile.name}</h1><p className="muted">{profile._count.members} usuário(s) vinculados. Salvar aqui atualiza todos eles.</p></div></header><form action={updatePermissionProfileAction} className="profile-editor-form"><input type="hidden" name="profileId" value={profile.id} /><div className="profile-editor-fields"><label className="field">Nome<input name="name" defaultValue={profile.name} minLength={2} required /></label><label className="field">Descrição<input name="description" defaultValue={profile.description} /></label></div><PermissionMatrix viewPermissions={profile.viewPermissions} editPermissions={profile.editPermissions} /><div className="profile-editor-actions">{profile._count.members === 0 ? <button formAction={deletePermissionProfileAction} className="button button-danger">Excluir perfil</button> : <span className="muted">Para excluir, primeiro atribua os usuários a outro perfil.</span>}<button className="button button-primary">Salvar permissões</button></div></form></section></div>;
}
