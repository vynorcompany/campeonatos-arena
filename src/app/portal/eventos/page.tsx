import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublicAthleteIdentity } from "@/lib/auth/player-session";
import { PublicEventRadar } from "@/components/public-event-radar";

export const dynamic = "force-dynamic";

export default async function EventRadarPage(props: { searchParams?: Promise<{ view?: string }> }) {
  const searchParams = await props.searchParams;
  const athlete = await getPublicAthleteIdentity();
  if (!athlete) redirect("/portal");
  return <main className="tw:min-h-dvh tw:bg-white tw:py-6 tw:text-[#231f20] tw:dark:bg-[#07111f] tw:dark:text-white"><header className="tw:mx-auto tw:flex tw:w-[min(calc(100%_-_32px),1060px)] tw:flex-wrap tw:items-center tw:justify-between tw:gap-3"><h1 className="tw:m-0 tw:text-xl tw:font-semibold">Radar de eventos</h1><Link className={ui.secondary} href="/portal">Voltar</Link></header><PublicEventRadar view={searchParams?.view === "all" ? "all" : "region"} /></main>;
}
