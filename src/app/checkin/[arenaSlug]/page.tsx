import {getCheckinView} from "@/lib/checkin/query";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourtCheckinChooser } from "@/components/courts/court-checkin-chooser";
import { PortalTheme } from "@/components/portal/portal-theme";
import { PortalThemeToggle } from "@/components/portal/portal-theme-controls";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { gameCheckinPath } from "@/lib/checkin/game";
export const dynamic = "force-dynamic";

export default async function CourtCheckinPage({ params, searchParams }: { params: Promise<{ arenaSlug: string }>; searchParams: Promise<{ token?: string; jogo?: string }> }) {
  const { arenaSlug } = await params;
  const { token, jogo } = await searchParams;
  if (typeof token !== "string" || token.length !== 64) notFound();
  const focusId = typeof jogo === "string" && jogo.length <= 160 ? jogo : "";
  const data = await getCheckinView({arenaSlug,token,focusId});
  if (!data) return <main className="tw:grid tw:min-h-dvh tw:place-items-center tw:bg-slate-50 tw:p-5"><h1 className="tw:text-lg tw:text-[#17345c]">QR Code indisponível</h1></main>;
  const {arena,auth,slots,lessons}=data;
  const returnTo = focusId ? gameCheckinPath(arenaSlug, token, focusId) : `/checkin/${encodeURIComponent(arenaSlug)}?token=${encodeURIComponent(token)}`;
  return <PortalTheme className="tw:[--panel:#fff] tw:[--text:#111827] tw:[--muted:#536b86] tw:[--line:#d3dfed] tw:[--primary:#215da5] tw:dark:[--panel:#101c2d] tw:dark:[--text:#eff3f8] tw:dark:[--muted:#bdd9e6] tw:dark:[--line:#3b4e66] tw:min-h-dvh tw:bg-[#f5f8fc] tw:text-[#111827] tw:dark:bg-[#071421] tw:dark:text-[#eff3f8] tw:[&_*]:box-border">
    <main className="tw:mx-auto tw:grid tw:w-full tw:max-w-[1180px] tw:min-w-0 tw:gap-5 tw:px-5 tw:py-6 tw:viewport-700:gap-4 tw:viewport-700:px-3 tw:viewport-700:py-3">
      <header className="tw:flex tw:min-w-0 tw:items-center tw:justify-between tw:gap-3 tw:rounded-lg tw:border tw:border-[#d3dfed] tw:bg-white tw:px-4 tw:py-3 tw:dark:border-[#293648] tw:dark:bg-[#101c2d]"><div className="tw:flex tw:min-w-0 tw:items-center tw:gap-3"><img src={arena.logoUrl} alt={`Logo ${arena.name}`} className="tw:h-10 tw:w-14 tw:shrink-0 tw:object-contain"/><span className="tw:min-w-0 tw:break-words tw:text-sm tw:font-medium">{arena.name}</span></div><div className="tw:flex tw:shrink-0 tw:items-center tw:gap-3"><PortalThemeToggle/>{auth ? <Link href={`/home?arena=${encodeURIComponent(arenaSlug)}`} className="tw:text-xs tw:text-[#174983] tw:dark:text-[#9bc5ff]">Meu Portal ↗</Link> : null}</div></header>
      <section className="tw:relative tw:isolate tw:overflow-hidden tw:rounded-lg tw:bg-[#174983] tw:px-7 tw:py-12 tw:text-white tw:viewport-700:px-5 tw:viewport-700:py-8"><img src="/portal-padel-hero.webp" alt="" className="tw:absolute tw:inset-0 tw:-z-20 tw:h-full tw:w-full tw:object-cover"/><div className="tw:absolute tw:inset-0 tw:-z-10 tw:bg-gradient-to-r tw:from-[#102e52]/95 tw:to-[#102e52]/10"/><h1 className="tw:m-0 tw:text-3xl tw:font-semibold tw:leading-tight tw:viewport-700:text-2xl">{auth ? `Olá, ${auth.name.trim().split(/\s+/)[0]}.` : "Check-in"}</h1><p className="tw:mb-0 tw:mt-2 tw:text-sm">Seu jogo começa aqui.</p></section>
      {!auth ? <section className="tw:mx-auto tw:w-full tw:max-w-lg tw:rounded-lg tw:border tw:border-[#d3dfed] tw:bg-white tw:p-5 tw:dark:border-[#293648] tw:dark:bg-[#101c2d]"><PublicClientAuthForm arenaSlug={arenaSlug} returnTo={returnTo}/></section> : <CourtCheckinChooser arenaSlug={arenaSlug} token={token} playerId={auth.playerId} playerName={auth.name} mode={arena.checkinMode} initialGameId={focusId} slots={slots} lessons={lessons}/>}
      {auth ? <Link href={`/home?arena=${encodeURIComponent(arenaSlug)}`} className="tw:w-fit tw:text-xs tw:text-[#174983] tw:dark:text-[#9bc5ff]">← Voltar ao Portal</Link> : null}
    </main>
  </PortalTheme>;
}
