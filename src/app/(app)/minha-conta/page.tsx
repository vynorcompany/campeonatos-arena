import { PasswordForm } from "@/components/forms/password-form";
import { ProfileForm } from "@/components/forms/profile-form";
import { SectionCard } from "@/components/section-card";
import { requireAuth } from "@/lib/auth/session";

export default async function MyAccountPage() {
  const auth = await requireAuth();

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Conta</p>
          <h1>Minha conta</h1>
          <p className="muted">
            Atualize seus dados de acesso e mantenha sua senha sob controle para uso online com segurança.
          </p>
        </div>
      </header>

      <SectionCard title="Perfil" description="Atualize o nome exibido na navegação do sistema.">
        <ProfileForm userName={auth.userName} userEmail={auth.userEmail} />
      </SectionCard>

      <SectionCard title="Senha" description="Troque sua senha atual por uma nova combinação forte.">
        <PasswordForm />
      </SectionCard>
    </div>
  );
}
