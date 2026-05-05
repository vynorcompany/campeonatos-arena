import Image from "next/image";
import { ArenaProfileForm } from "@/components/forms/arena-profile-form";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function ArenaPage() {
  const auth = await requireModuleView("arena");
  const arena = await prisma.arena.findUniqueOrThrow({
    where: {
      id: auth.arenaId
    }
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Arena</p>
          <h1>Painel da Arena</h1>
          <p className="muted">Configure os dados da empresa, contatos e identidade visual da arena.</p>
        </div>
      </header>

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
    </div>
  );
}
