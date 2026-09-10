import Link from "next/link";
import { createPermissionProfileAction } from "@/lib/actions/permission-profile";
import { SectionCard } from "@/components/section-card";

export function PermissionProfilesManagement({ profiles }: { profiles: { id: string; name: string; description: string; _count: { members: number } }[] }) {
  return <div className="stack-md">
    <SectionCard title="Novo perfil" description="Crie um perfil e defina as permissões antes de atribuí-lo aos usuários.">
      <form action={createPermissionProfileAction} className="permission-profile-create-form">
        <label className="field">Nome do perfil<input name="name" placeholder="Ex.: Recepção" minLength={2} required /></label>
        <label className="field">Descrição<input name="description" placeholder="Ex.: Pode abrir e finalizar comandas" /></label>
        <button className="button button-primary">Criar perfil</button>
      </form>
    </SectionCard>
    <SectionCard title="Perfis de usuário" description="As alterações feitas em um perfil valem para todos os usuários vinculados a ele.">
      <div className="simple-list">
        {profiles.map((profile) => <Link key={profile.id} href={`/arena/perfis/${profile.id}`} className="simple-item permission-profile-item"><span><strong>{profile.name}</strong><small>{profile.description || "Sem descrição"}</small></span><span>{profile._count.members} usuário(s) · Configurar</span></Link>)}
        {!profiles.length ? <p className="muted">Nenhum perfil criado.</p> : null}
      </div>
    </SectionCard>
  </div>;
}
