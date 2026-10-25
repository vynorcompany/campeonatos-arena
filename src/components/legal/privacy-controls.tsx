"use client";
import { useFormState } from "react-dom";
import { useEffect, useState } from "react";
import { privacyAction } from "@/lib/actions/privacy";
import { SubmitButton } from "@/components/forms/submit-button";
import { BotTrap } from "@/components/forms/bot-trap";

const field = "tw:grid tw:min-w-0 tw:gap-2 tw:text-sm tw:font-medium";
const input = "tw:min-h-11 tw:w-full tw:min-w-0 tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:px-3 tw:py-2 tw:text-base tw:text-[var(--text)]";
const button = "tw:min-h-11 tw:rounded-xl tw:bg-[#08745b] tw:px-4 tw:py-3 tw:text-sm tw:font-semibold tw:text-white tw:focus-visible:outline-2 tw:focus-visible:outline-offset-4 tw:focus-visible:outline-[#08745b] tw:disabled:opacity-60";

function PrivacyForm({ arenaSlug, operation, title, description, onClosed }: { arenaSlug: string; operation: "EXPORT" | "CLEAR_PROFILE" | "REQUEST" | "CLOSE_MEMBERSHIP"; title: string; description: string; onClosed?: (closed: boolean) => void }) {
  const [state, action] = useFormState(privacyAction, { error: null });
  useEffect(() => { if (state.closed) onClosed?.(true); }, [state.closed, onClosed]);
  function download() {
    if (!state.download) return;
    const url = URL.createObjectURL(new Blob([state.download], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = state.closed ? "comprovante-exclusao-arena.json" : "meus-dados-arena.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="tw:grid tw:min-w-0 tw:gap-4 tw:rounded-2xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-5"><header><h2 className="tw:m-0 tw:text-xl tw:font-semibold">{title}</h2><p className="tw:mb-0 tw:text-sm tw:leading-relaxed tw:text-[var(--muted)]">{description}</p></header>{state.closed ? <><p role="status" className="tw:m-0 tw:break-words tw:text-sm tw:leading-relaxed">{state.notice}</p><button type="button" onClick={download} className={`${button} tw:justify-self-start`}>Baixar comprovante</button><a href={`/classificacao/${encodeURIComponent(arenaSlug)}`} className="tw:min-h-11 tw:py-3 tw:text-sm tw:underline">Voltar ao Portal</a></> : <form action={action} className="tw:grid tw:min-w-0 tw:gap-4">
    <input type="hidden" name="arenaSlug" value={arenaSlug}/><input type="hidden" name="operation" value={operation}/><BotTrap/>
    {operation === "REQUEST" ? <><label className={field}>Tipo de solicitação<select name="kind" className={input} defaultValue="ERASURE"><option value="ERASURE">Exclusão de dados</option><option value="ACCESS">Acesso completo</option><option value="CORRECTION">Corrigir dados</option><option value="OTHER">Outro direito</option></select></label><label className={field}>Detalhes para a arena <span className="tw:text-xs tw:font-normal tw:text-[var(--muted)]">Opcional. Não envie senhas, documentos ou informações de saúde.</span><textarea name="message" maxLength={3000} rows={4} className={`${input} tw:resize-y`}/></label></> : null}
    <label className={field}>Senha atual<input name="password" type="password" autoComplete="current-password" maxLength={200} required className={input}/></label>
    {operation === "CLEAR_PROFILE" ? <label className="tw:flex tw:items-start tw:gap-3 tw:text-sm tw:leading-relaxed"><input name="confirmRemoval" type="checkbox" required className="tw:mt-1 tw:size-5 tw:shrink-0 tw:accent-[#08745b]"/><span>Confirmo a remoção de foto, bio, nascimento e dados esportivos opcionais do meu perfil nesta arena.</span></label> : null}
    {operation === "CLOSE_MEMBERSHIP" ? <><label className="tw:flex tw:items-start tw:gap-3 tw:text-sm tw:leading-relaxed"><input name="confirmRemoval" type="checkbox" required className="tw:mt-1 tw:size-5 tw:shrink-0 tw:accent-[#08745b]"/><span>Entendo que perderei o acesso a esta arena, que os dados do perfil serão removidos e o nome substituído e que registros sujeitos a conservação poderão permanecer. Reservas, contratos e débitos não serão cancelados.</span></label><label className={field}>Digite EXCLUIR para confirmar<input name="confirmation" autoComplete="off" pattern="EXCLUIR" required className={input}/></label></> : null}
    <SubmitButton label={operation === "EXPORT" ? "Preparar cópia do perfil" : operation === "CLEAR_PROFILE" ? "Remover dados opcionais" : operation === "CLOSE_MEMBERSHIP" ? "Excluir meu vínculo" : "Enviar solicitação"} pendingLabel="Confirmando..." className={`${button} tw:justify-self-start`}/>
    {state.error ? <p role="alert" className="tw:m-0 tw:text-sm tw:text-[#a32121] tw:dark:text-[#ffb4ab]">{state.error}</p> : null}
    {state.notice ? <p role="status" className="tw:m-0 tw:break-words tw:text-sm tw:leading-relaxed">{state.notice}</p> : null}
    {state.download ? <button type="button" onClick={download} className={`${button} tw:justify-self-start`}>Baixar arquivo JSON</button> : null}
  </form>}</section>;
}

export function PrivacyControls({ arenaSlug }: { arenaSlug: string }) {
  const [closed, setClosed] = useState(false);
  return <div className="tw:grid tw:min-w-0 tw:gap-5">{!closed ? <><PrivacyForm arenaSlug={arenaSlug} operation="EXPORT" title="Cópia do meu perfil" description="Baixe os dados de perfil, cadastro de acesso e solicitações desta arena. Para receber os demais registros operacionais, use a solicitação de acesso completo abaixo."/><PrivacyForm arenaSlug={arenaSlug} operation="CLEAR_PROFILE" title="Remover dados opcionais" description="Remove imediatamente foto, bio, nascimento e informações esportivas opcionais. Nome, contato, acesso, reservas, resultados e registros financeiros continuam disponíveis à operação da arena."/><PrivacyForm arenaSlug={arenaSlug} operation="REQUEST" title="Exclusão e outros direitos" description="Solicite a análise de exclusão de registros conservados, acesso completo ou correção. A arena verifica quais dados podem ser eliminados e informa eventual conservação e a justificativa. Enviar o pedido não encerra a conta nem cancela reservas ou débitos."/></> : null}<PrivacyForm arenaSlug={arenaSlug} operation="CLOSE_MEMBERSHIP" title="Encerrar vínculo com esta arena" description="Exclui seu acesso, remove os dados cadastrais e substitui sua identificação nos resultados esportivos vinculados ao perfil. Os vínculos com outras arenas são preservados. Se houver obrigações pendentes, uma referência protegida do contato poderá ser conservada para cobrança e revisão, sem transferir histórico a novos cadastros. Registros financeiros, fiscais, contratuais, de auditoria e backups podem ser conservados conforme as obrigações aplicáveis. Baixe o comprovante ao concluir." onClosed={setClosed}/></div>;
}
