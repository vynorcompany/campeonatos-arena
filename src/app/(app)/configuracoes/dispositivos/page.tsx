import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { requireAuth } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { revokeDeviceSessionAction } from "@/lib/actions/devices";
export const dynamic = "force-dynamic";
export default async function DevicesPage() {
  const auth = await requireAuth(); const token = (await cookies()).get(env.sessionCookieName)?.value;
  const current = token ? await prisma.session.findFirst({ where: { userId: auth.userId, token: { in: [token, createHash("sha256").update(token).digest("hex")] } }, select: { id: true } }) : null;
  const sessions = await prisma.session.findMany({ where: { userId: auth.userId, expiresAt: { gt: new Date() } }, select: { id: true, deviceLabel: true, createdAt: true, lastSeenAt: true, expiresAt: true }, orderBy: { lastSeenAt: "desc" }, take: 100 });
  const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(value);
  return <section className={`${ui.page} tw:max-w-4xl`}><WorkspaceHeading title="Dispositivos conectados" /><div className={ui.list}>{sessions.map(session => <article key={session.id} className={`${ui.row} tw:flex tw:flex-wrap tw:justify-between`}><div className="tw:min-w-0"><h2 className="tw:m-0 tw:break-words tw:text-sm tw:font-semibold">{session.deviceLabel || "Dispositivo anterior à identificação"}</h2>{session.id === current?.id ? <span className="tw:mt-2 tw:inline-block tw:rounded-none tw:bg-emerald-100 tw:px-2 tw:py-1 tw:text-xs tw:font-semibold tw:text-emerald-900">Este dispositivo</span> : null}<dl className="tw:mb-0 tw:grid tw:gap-1 tw:text-xs tw:text-[var(--muted)]"><div><dt className="tw:inline">Última atividade: </dt><dd className="tw:m-0 tw:inline">{date(session.lastSeenAt)}</dd></div><div><dt className="tw:inline">Conectado em: </dt><dd className="tw:m-0 tw:inline">{date(session.createdAt)}</dd></div><div><dt className="tw:inline">Expira em: </dt><dd className="tw:m-0 tw:inline">{date(session.expiresAt)}</dd></div></dl></div>{session.id !== current?.id ? <SafeActionForm action={revokeDeviceSessionAction} confirmKeyword="ENCERRAR" confirmPrompt="Encerrar o acesso deste dispositivo? Ele precisará entrar novamente. Digite ENCERRAR para confirmar." successMessage="Acesso encerrado."><input type="hidden" name="sessionId" value={session.id}/><SubmitButton label="Encerrar acesso" pendingLabel="Encerrando..." className="tw:min-h-9 tw:rounded-lg tw:border tw:border-red-200 tw:bg-red-50 tw:px-4 tw:py-2 tw:text-xs tw:font-semibold tw:text-red-800"/></SafeActionForm> : null}</article>)}</div></section>;
}
