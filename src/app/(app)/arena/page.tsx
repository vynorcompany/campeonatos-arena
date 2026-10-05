import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
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
import { WhatsAppConnectionStatusWatcher } from "@/components/whatsapp/whatsapp-connection-status-watcher";

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
    <div className={viewStyles.stack_md}>
      <div className={viewStyles.arena_settings_layout}>
        <aside className={viewStyles.arena_settings_nav} aria-label="Seções de Dados da Arena">
          <Link href="/arena" className={cx(activeSection === "data" ? viewStyles.arena_settings_nav_link : viewStyles.arena_settings_nav_link_2)}>
            Dados da Arena
          </Link>
          <Link href="/arena?section=portal" className={cx(activeSection === "portal" ? viewStyles.arena_settings_nav_link : viewStyles.arena_settings_nav_link_2)}>
            Portal do Atleta
          </Link>
          <Link href="/arena?section=courts" className={cx(activeSection === "courts" ? viewStyles.arena_settings_nav_link : viewStyles.arena_settings_nav_link_2)}>
            Quadras
          </Link>
          {userManagementAllowed ? <Link href="/arena?section=integrations" className={cx(activeSection === "integrations" ? viewStyles.arena_settings_nav_link : viewStyles.arena_settings_nav_link_2)}>Integrações</Link> : null}
          {userManagementAllowed ? (
            <>
              <Link href="/arena?section=users" className={cx(activeSection === "users" ? viewStyles.arena_settings_nav_link : viewStyles.arena_settings_nav_link_2)}>Usuários</Link>
              <Link href="/arena?section=profiles" className={cx(activeSection === "profiles" ? viewStyles.arena_settings_nav_link : viewStyles.arena_settings_nav_link_2)}>Perfis de usuário</Link>
            </>
          ) : null}
        </aside>

        <section className={viewStyles.arena_settings_content}>
          {activeSection === "data" ? (
            <SectionCard title="Identidade da arena" description="Essas informações aparecem no sistema e nas telas de apresentação.">
              <div className={viewStyles.arena_profile_layout}>
                <div className={viewStyles.arena_logo_preview}>
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
            <div className={viewStyles.stack_md}>
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
  return <SectionCard title="WhatsApp Business">{arena.connection && !connected ? <WhatsAppConnectionStatusWatcher arenaId={arena.id} /> : null}<div className={viewStyles.arena_whatsapp_panel}><div className={viewStyles.arena_whatsapp_panel_header}><div><span className={cx(`${viewStyles.agency_connection_status} ${connected ? "is-connected" : ""}`)}><i />{connected ? "Conectado" : arena.connection ? "Aguardando conexão" : "Não configurado"}</span><strong>{connected ? arena.connection?.connectedPhone || "WhatsApp conectado" : "Conecte o número da arena"}</strong></div></div>{connected ? <p className="form-message form-message-success">WhatsApp conectado com sucesso. As novas conversas serão exibidas no menu WhatsApp.</p> : null}{arena.connection?.qrCodeDataUrl && !connected ? <div className={viewStyles.agency_whatsapp_qr}><img src={arena.connection.qrCodeDataUrl} alt={`QR Code para conectar o WhatsApp da ${arena.name}`} /><div><strong>Escaneie o QR Code no WhatsApp Business</strong><p>Abra Dispositivos conectados e escolha Conectar dispositivo.</p><SafeActionForm action={refreshArenaWhatsAppQrAction} successMessage="QR Code atualizado."><input type="hidden" name="arenaId" value={arena.id} /><SubmitButton label="Gerar novo QR Code" pendingLabel="Gerando..." className={viewStyles.button_button_small} /></SafeActionForm></div></div> : <SafeActionForm action={connectArenaWhatsAppAction} successMessage={connected ? "Conexão verificada." : "Instância preparada. Escaneie o QR Code para concluir."}><input type="hidden" name="arenaId" value={arena.id} /><SubmitButton label={connected ? "Verificar conexão" : "Conectar WhatsApp"} pendingLabel="Preparando conexão..." className={viewStyles.button_button_primary_button_small} /></SafeActionForm>}{arena.connection ? <div className={viewStyles.arena_whatsapp_reset}><p>Troque a sessão somente ao mudar o aparelho conectado.</p><SafeActionForm action={resetArenaWhatsAppSessionAction} successMessage="Sessão resetada. Escaneie o novo QR Code."><input type="hidden" name="arenaId" value={arena.id} /><SubmitButton label="Resetar sessão" pendingLabel="Resetando..." className={viewStyles.button_button_danger_button_small} /></SafeActionForm></div> : null}{arena.connection?.lastError ? <p className={viewStyles.form_error}>{arena.connection.lastError}</p> : null}</div></SectionCard>;
}

async function PermissionProfilesSection({ arenaId }: { arenaId: string }) {
  await ensureArenaPermissionProfiles(arenaId);
  const profiles = await prisma.permissionProfile.findMany({ where: { arenaId, active: true }, select: { id: true, name: true, description: true, members: { select: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } } }, orderBy: { name: "asc" } });
  return <PermissionProfilesManagement profiles={profiles} />;
}
