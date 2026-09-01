import Image from "next/image";
import Link from "next/link";
import { ArenaProfileForm } from "@/components/forms/arena-profile-form";
import { AthletePortalSettingsForm } from "@/components/forms/athlete-portal-settings-form";
import { SectionCard } from "@/components/section-card";
import { ArenaUsersManagement } from "@/components/users/arena-users-management";
import { requireRole, requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type ArenaSection = "data" | "portal" | "users";

type ArenaPageProps = {
  searchParams?: { section?: string };
};

function resolveSection(value?: string): ArenaSection {
  return value === "portal" || value === "users" ? value : "data";
}

function canManageUsers(auth: { arenaRole: string | null; systemRole: string }) {
  return auth.systemRole === "SUPER_ADMIN" || auth.systemRole === "ADMIN" || auth.arenaRole === "OWNER" || auth.arenaRole === "ADMIN";
}

export default async function ArenaPage({ searchParams }: ArenaPageProps) {
  const auth = await requireModuleView("arena");
  const activeSection = resolveSection(searchParams?.section);
  const userManagementAllowed = canManageUsers(auth);

  if (activeSection === "users" && !userManagementAllowed) {
    await requireRole("ADMIN");
  }

  const arena = await prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId } });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Configurações</p>
          <h1>Dados da Arena</h1>
          <p className="muted">Centralize a identidade da arena, a experiência do Portal do Atleta e os acessos da equipe.</p>
        </div>
      </header>

      <div className="arena-settings-layout">
        <aside className="arena-settings-nav" aria-label="Seções de Dados da Arena">
          <span className="arena-settings-nav-title">Dados da Arena</span>
          <Link href="/arena" className={activeSection === "data" ? "arena-settings-nav-link is-active" : "arena-settings-nav-link"}>
            Dados da Arena
          </Link>
          <Link href="/arena?section=portal" className={activeSection === "portal" ? "arena-settings-nav-link is-active" : "arena-settings-nav-link"}>
            Portal do Atleta
          </Link>
          {userManagementAllowed ? (
            <Link href="/arena?section=users" className={activeSection === "users" ? "arena-settings-nav-link is-active" : "arena-settings-nav-link"}>
              Usuários
            </Link>
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
            <SectionCard title="Portal do Atleta" description="Escolha quais áreas ficarão visíveis para os atletas no portal online.">
              <AthletePortalSettingsForm
                settings={{
                  showLeagues: arena.athletePortalShowLeagues,
                  showBooking: arena.athletePortalShowBooking,
                  showReservations: arena.athletePortalShowReservations,
                  showLessons: arena.athletePortalShowLessons,
                  showClasses: arena.athletePortalShowClasses
                }}
              />
            </SectionCard>
          ) : null}

          {activeSection === "users" && userManagementAllowed ? (
            <ArenaUsersManagement arenaId={auth.arenaId} currentUserId={auth.userId} />
          ) : null}
        </section>
      </div>
    </div>
  );
}
