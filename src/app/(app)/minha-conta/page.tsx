import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { viewStyles } from "./page.utilities";
import { PasswordForm } from "@/components/forms/password-form";
import { ProfileForm } from "@/components/forms/profile-form";
import { SectionCard } from "@/components/section-card";
import { requireAuth } from "@/lib/auth/session";

export default async function MyAccountPage() {
  const auth = await requireAuth();

  return (
    <div className={viewStyles.stack_md}>
      <WorkspaceHeading title="Minha conta" />

      <SectionCard title="Perfil" hideHeading>
        <ProfileForm userName={auth.userName} userEmail={auth.userEmail} />
      </SectionCard>

      <SectionCard title="Senha" hideHeading>
        <PasswordForm />
      </SectionCard>
    </div>
  );
}
