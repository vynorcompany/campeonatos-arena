import Image from "next/image";
import Link from "next/link";
import { CourtConfigurationWorkspace } from "@/components/courts/court-configuration-workspace";
import { ArenaProfileForm } from "@/components/forms/arena-profile-form";
import { AthletePortalSettingsForm } from "@/components/forms/athlete-portal-settings-form";
import { PortalEditorPanels } from "@/components/portal-editor-panels";
import { SectionCard } from "@/components/section-card";
import { ArenaUsersManagement } from "@/components/users/arena-users-management";
import { PermissionProfilesManagement } from "@/components/users/permission-profiles-management";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { connectArenaWhatsAppAction, refreshArenaWhatsAppQrAction, resetArenaWhatsAppSessionAction } from "@/lib/actions/agency";
import { ensureArenaPermissionProfiles } from "@/lib/actions/permission-profile";
import { requireRole, requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type ArenaSection = "data" | "portal" | "courts" | "users" | "profiles" | "integrations";

type ArenaPageProps = {
  searchParams?: Promise<{ section?: string; court?: string }>;
};

function resolveSection(value?: string): ArenaSection {
  return value === "portal" || value === "courts" || value === "users" || value === "profiles" || value === "integrations" ? value : "data";
}

function canManageUsers(auth: { arenaRole: string | null; systemRole: string }) {
  return auth.systemRole === "SUPER_ADMIN" || auth.systemRole === "ADMIN" || auth.arenaRole === "OWNER" || auth.arenaRole === "ADMIN";
}

export default async function ArenaPage(props: ArenaPageProps) {
  const searchParams = await props.searchParams;
  const auth = await requireModuleView("arena");
  const activeSection = resolveSection(searchParams?.section);
  const userManagementAllowed = canManageUsers(auth);

  if ((activeSection === "users" || activeSection === "profiles") && !userManagementAllowed) {
    await requireRole("ADMIN");
  }

  const arena = await prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, include: { whatsappConnection: true } });
  const [announcements, posts] = await Promise.all([
    prisma.portalAnnouncement.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] }),
    prisma.portalEventPost.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] })
  ]);

  return (
    <div className="stack-md">
      <div className="arena-settings-layout">
        <aside className="arena-settings-nav" aria-label="Seções de Dados da Arena">
          <Link href="/arena" className={activeSection === "data" ? "arena-settings-nav-link is-active" : "arena-settings-nav-link"}>
            Dados da Arena
          </Link>
          <Link href="/arena?section=portal" className={activeSection === "portal" ? "arena-settings-nav-link is-active" : "arena-settings-nav-link"}>
            Portal do Atleta
          </Link>
          <Link href="/arena?section=courts" className={activeSection === "courts" ? "arena-settings-nav-link is-active" : "arena-settings-nav-link"}>
            Quadras
          </Link>
          {userManagementAllowed ? <Link href="/arena?section=integrations" className={activeSection === "integrations" ? "arena-settings-nav-link is-active" : "arena-settings-nav-link"}>Integrações</Link> : null}
          {userManagementAllowed ? (
            <>
              <Link href="/arena?section=users" className={activeSection === "users" ? "arena-settings-nav-link is-active" : "arena-settings-nav-link"}>Usuários</Link>
              <Link href="/arena?section=profiles" className={activeSection === "profiles" ? "arena-settings-nav-link is-active" : "arena-settings-nav-link"}>Perfis de usuário</Link>
            </>
          ) : null}
        </aside>

        <section className="arena-settings-content">
          {activeSection === "data" ? (
            <SectionCard title="Identidade da arena" description="Essas informações aparecem no sistema e nas telas de apresentação.">
              <div className="arena-profile-layout">
                <div className="arena-logo-preview">
                  <Image src={arena.logoUrl || "/arena-profile.jpg"} alt={`Logo de ${arena.name}`} width={160} height={160} />
                  <strong>{arena.name}</strong>
                </div>
                <ArenaProfileForm
                  arena={{
                    name: arena.name,
                    legalName: arena.legalName,
                    cnpj: arena.cnpj,
                    phone: arena.phone,
                    email: arena.email,
                    address: arena.address,
                    city: arena.city,
                    state: arena.state,
                    zipCode: arena.zipCode
                  }}
                />
              </div>
            </SectionCard>
          ) : null}

          {activeSection === "portal" ? (
            <div className="stack-md">
              <SectionCard title="Portal do Atleta" description="Escolha quais áreas ficarão visíveis para os atletas no portal online.">
                <AthletePortalSettingsForm
                  settings={{
                    showLeagues: arena.athletePortalShowLeagues,
                    showBooking: arena.athletePortalShowBooking,
                    showReservations: arena.athletePortalShowReservations,
                    showLessons: arena.athletePortalShowLessons,
                    showClasses: arena.athletePortalShowClasses,
                    showDoublesRadar: arena.athletePortalShowDoublesRadar,
                    portalLogoUrl: arena.athletePortalLogoUrl
                  }}
                />
              </SectionCard>
              <PortalEditorPanels announcements={announcements} posts={posts} />
            </div>
          ) : null}

          {activeSection === "courts" ? <CourtConfigurationWorkspace courtId={searchParams?.court} /> : null}

          {activeSection === "integrations" && userManagementAllowed ? <WhatsAppConnectionSection arena={{ id: arena.id, name: arena.name, connection: arena.whatsappConnection }} /> : null}

          {activeSection === "users" && userManagementAllowed ? (
            <ArenaUsersManagement arenaId={auth.arenaId} currentUserId={auth.userId} />
          ) : null}

          {activeSection === "profiles" && userManagementAllowed ? (
            <PermissionProfilesSection arenaId={auth.arenaId} />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function WhatsAppConnectionSection({ arena }: { arena: { id: string; name: string; connection: { instanceName: string; status: string; qrCodeDataUrl: string; connectedPhone: string; lastError: string; lastConnectedAt: Date | null } | null } }) {
  const connected = arena.connection?.status === "CONNECTED";
  return <SectionCard title="WhatsApp Business"><div className="arena-whatsapp-panel"><div className="arena-whatsapp-panel-header"><div><span className={`agency-connection-status ${connected ? "is-connected" : ""}`}><i />{connected ? "Conectado" : arena.connection ? "Aguardando conexão" : "Não configurado"}</span><strong>{connected ? arena.connection?.connectedPhone || "WhatsApp conectado" : "Conecte o número da arena"}</strong></div></div>{arena.connection?.qrCodeDataUrl && !connected ? <div className="agency-whatsapp-qr"><img src={arena.connection.qrCodeDataUrl} alt={`QR Code para conectar o WhatsApp da ${arena.name}`} /><div><strong>Escaneie o QR Code no WhatsApp Business</strong><p>Abra Dispositivos conectados e escolha Conectar dispositivo.</p><SafeActionForm action={refreshArenaWhatsAppQrAction} successMessage="QR Code atualizado."><input type="hidden" name="arenaId" value={arena.id} /><SubmitButton label="Gerar novo QR Code" pendingLabel="Gerando..." className="button button-small" /></SafeActionForm></div></div> : <SafeActionForm action={connectArenaWhatsAppAction} successMessage={connected ? "Conexão verificada." : "Instância preparada. Escaneie o QR Code para concluir."}><input type="hidden" name="arenaId" value={arena.id} /><SubmitButton label={connected ? "Verificar conexão" : "Conectar WhatsApp"} pendingLabel="Preparando conexão..." className="button button-primary button-small" /></SafeActionForm>}{arena.connection ? <div className="arena-whatsapp-reset"><p>Troque a sessão somente ao mudar o aparelho conectado.</p><SafeActionForm action={resetArenaWhatsAppSessionAction} successMessage="Sessão resetada. Escaneie o novo QR Code."><input type="hidden" name="arenaId" value={arena.id} /><SubmitButton label="Resetar sessão" pendingLabel="Resetando..." className="button button-danger button-small" /></SafeActionForm></div> : null}{arena.connection?.lastError ? <p className="form-error">{arena.connection.lastError}</p> : null}</div></SectionCard>;
}

async function PermissionProfilesSection({ arenaId }: { arenaId: string }) {
  await ensureArenaPermissionProfiles(arenaId);
  const profiles = await prisma.permissionProfile.findMany({ where: { arenaId, active: true }, select: { id: true, name: true, description: true, members: { select: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } } }, orderBy: { name: "asc" } });
  return <PermissionProfilesManagement profiles={profiles} />;
}
