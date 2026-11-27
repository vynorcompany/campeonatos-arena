
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { requireAuth } from "@/lib/auth/session";
import { getDeviceSessions } from "@/lib/settings/data";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { revokeDeviceSessionAction } from "@/lib/actions/devices";
export const dynamic = "force-dynamic";
export default async function DevicesPage() {
  await requireAuth();
  const { current, sessions } = await getDeviceSessions();
  const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(value);
  return <section className={`${ui.page} tw:w-full`}><div className={ui.list}><>{sessions.map(session => <article key={session.id} className={`${ui.row} tw:flex tw:flex-wrap tw:justify-between`}><div className="tw:min-w-0"><h2 className="tw:m-0 tw:break-words tw:text-sm tw:font-semibold">{session.deviceLabel || "Dispositivo anterior à identificação"}</h2>{session.id === current?.id ? <span className="tw:mt-2 tw:inline-block tw:rounded-none tw:bg-emerald-100 tw:px-2 tw:py-1 tw:text-xs tw:font-semibold tw:text-emerald-900">Este dispositivo</span> : null}<dl className="tw:mb-0 tw:grid tw:gap-1 tw:text-xs tw:text-[var(--muted)]"><div><dt className="tw:inline">Última atividade: </dt><dd className="tw:m-0 tw:inline">{date(session.lastSeenAt)}</dd></div><div><dt className="tw:inline">Conectado em: </dt><dd className="tw:m-0 tw:inline">{date(session.createdAt)}</dd></div><div><dt className="tw:inline">Expira em: </dt><dd className="tw:m-0 tw:inline">{date(session.expiresAt)}</dd></div></dl></div>{session.id !== current?.id ? <SafeActionForm action={revokeDeviceSessionAction} confirmKeyword="ENCERRAR" confirmPrompt="Encerrar o acesso deste dispositivo? Ele precisará entrar novamente. Digite ENCERRAR para confirmar." successMessage="Acesso encerrado."><input type="hidden" name="sessionId" value={session.id}/><SubmitButton label="Encerrar acesso" pendingLabel="Encerrando..." className="tw:min-h-9 tw:rounded-lg tw:border tw:border-red-200 tw:bg-red-50 tw:px-4 tw:py-2 tw:text-xs tw:font-semibold tw:text-red-800"/></SafeActionForm> : null}</article>)}</></div></section>;
}
