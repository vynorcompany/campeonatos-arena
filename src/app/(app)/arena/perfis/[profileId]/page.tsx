import Link from "next/link";
import { PermissionMatrix } from "@/components/users/permission-matrix";
import { archivePermissionProfileAction, updatePermissionProfileAction } from "@/lib/actions/permission-profile";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function PermissionProfilePage({ params }: { params: { profileId: string } }) {
  const auth = await requireRole("ADMIN");
  const profile = await prisma.permissionProfile.findFirstOrThrow({ where: { id: params.profileId, arenaId: auth.arenaId }, include: { _count: { select: { members: true } } } });
  return <div className="stack-md"><Link className="button button-small" href="/arena?section=profiles">Voltar aos perfis</Link><section className="section-card"><header><div><span className="eyebrow">PERFIL DE USUÁRIO</span><h1>{profile.name}</h1><p className="muted">{profile._count.members} usuário(s) vinculados. Salvar aqui atualiza todos eles.</p></div></header><form action={updatePermissionProfileAction} className="stack-md"><input type="hidden" name="profileId" value={profile.id} /><label className="field">Nome<input name="name" defaultValue={profile.name} minLength={2} required /></label><label className="field">Descrição<input name="description" defaultValue={profile.description} /></label><PermissionMatrix viewPermissions={profile.viewPermissions} editPermissions={profile.editPermissions} /><div className="modal-actions"><button className="button button-primary">Salvar permissões</button></div></form></section>{profile._count.members === 0 ? <form action={archivePermissionProfileAction}><input type="hidden" name="profileId" value={profile.id} /><button className="button button-danger">Arquivar perfil</button></form> : null}</div>;
}
