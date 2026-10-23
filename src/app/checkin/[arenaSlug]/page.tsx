import { instantToArenaWallClock, arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { registerCourtCheckinAction } from "@/lib/actions/checkin";
export const dynamic = "force-dynamic";

export default async function CourtCheckinPage({ params, searchParams }: { params: Promise<{ arenaSlug: string }>; searchParams: Promise<{ token?: string }> }) {
  const { arenaSlug } = await params; const { token } = await searchParams;
  if (!token || token.length !== 64) notFound();
  const arena = await prisma.arena.findFirst({ where: { slug: arenaSlug, checkinEnabled: true, checkinToken: token }, select: { id: true, name: true } });
  if (!arena) return <main className="tw:mx-auto tw:max-w-lg tw:p-6"><h1>QR Code indisponível</h1><p>Peça à recepção o QR Code atual para confirmar sua presença.</p></main>;
  const auth = await getPublicPlayerAuth(arenaSlug);
  const db = arenaDatabase(arena.id); const now = instantToArenaWallClock(new Date());
  const slots = auth ? await db.scheduleOccurrence.findMany({ where: { arenaId: arena.id, status: "SCHEDULED", startsAt: { lte: new Date(now.getTime() + 60 * 60_000) }, endsAt: { gt: now } }, include: { occurrenceCourts: { where: { court: { active: true, arenaId: arena.id } }, include: { court: { select: { name: true } } } }, participants: { where: { playerId: auth.playerId }, select: { checkedInAt: true } } }, orderBy: { startsAt: "asc" } }) : [];
  const time = (date: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(arenaWallClockToInstant(date));
  return <main className="tw:mx-auto tw:grid tw:w-full tw:max-w-xl tw:gap-5 tw:p-5 tw:text-[#132d58]">
    <header><p className="tw:text-xs tw:font-semibold tw:uppercase tw:tracking-widest tw:text-[#607898]">{arena.name}</p><h1 className="tw:text-2xl tw:font-semibold">Check-in nas quadras</h1><p className="tw:text-sm">{auth ? `${auth.name}, escolha a quadra e o horário da sua reserva.` : "Entre com seu cadastro no clube para confirmar sua presença."}</p></header>
    {!auth ? <PublicClientAuthForm arenaSlug={arenaSlug} returnTo={`/checkin/${encodeURIComponent(arenaSlug)}?token=${encodeURIComponent(token)}`} /> : <>
      <p className="tw:text-xs tw:text-[#607898]">Disponível de uma hora antes do início até o fim da reserva. Horários de Brasília.</p>
      {!slots.length ? <p role="status">Nenhum horário disponível agora. Confira sua reserva com a recepção.</p> : slots.flatMap(slot => slot.occurrenceCourts.map(court => <article key={`${slot.id}-${court.courtId}`} className="tw:grid tw:gap-3 tw:rounded-xl tw:border tw:border-[#dce7f2] tw:bg-white tw:p-4">
        <strong>{court.court.name}</strong><span>{time(slot.startsAt)} às {time(slot.endsAt)}</span>
        {slot.participants[0]?.checkedInAt ? <p role="status" className="tw:font-semibold tw:text-[#078f7c]">✓ Check-in confirmado às {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(slot.participants[0].checkedInAt)}</p> : <SafeActionForm action={registerCourtCheckinAction} successMessage="Check-in confirmado! Sua presença foi registrada na grade."><input type="hidden" name="arenaSlug" value={arenaSlug} /><input type="hidden" name="token" value={token} /><input type="hidden" name="occurrenceId" value={slot.id} /><input type="hidden" name="courtId" value={court.courtId} /><SubmitButton label="Confirmar presença" pendingLabel="Confirmando..." className="tw:w-full tw:rounded-lg tw:border-0 tw:bg-[#0868e5] tw:px-4 tw:py-3 tw:font-semibold tw:text-white" /></SafeActionForm>}
      </article>))}
    </>}
  </main>;
}
