"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { syncWhatsAppContactsAction, openWhatsAppContactConversationAction } from "@/lib/actions/whatsapp-chat";
import type { EvolutionContact } from "@/lib/integrations/evolution/contacts";
import { WhatsAppIcon } from "./whatsapp-icons";
import { formatWhatsAppPhone } from "./types";

const button = "tw:inline-flex tw:min-h-8 tw:items-center tw:justify-center tw:gap-2 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:px-3 tw:text-xs tw:font-medium tw:text-[var(--ink)] tw:enabled:hover:bg-[#174983] tw:enabled:hover:text-white tw:focus-visible:bg-[#174983] tw:focus-visible:text-white tw:disabled:opacity-50";

export function WhatsAppContactDirectory({ accountJid, canSend, onOpenConversation }: { accountJid: string; canSend: boolean; onOpenConversation: (id: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<EvolutionContact[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const inFlight = useRef(false);
  const activeAccount = useRef(accountJid);
  activeAccount.current = accountJid;
  const close = useCallback(() => setOpen(false), []);

  const synchronize = useCallback(async () => {
    if (inFlight.current || !accountJid) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await syncWhatsAppContactsAction();
      if (activeAccount.current !== accountJid || result.accountJid !== accountJid) return;
      setContacts(result.contacts);
      setStatus(result.truncated ? "Lista parcial. A integração limitou os contatos retornados." : `${result.contacts.length} contatos disponíveis${result.eventsEnabled ? "" : " · Use Atualizar para buscar alterações"}`);
      if (result.updated) router.refresh();
    } catch (reason) {
      if (activeAccount.current === accountJid) setError(reason instanceof Error ? reason.message : "Não foi possível sincronizar os contatos.");
    } finally { inFlight.current = false; setBusy(false); }
  }, [accountJid, router]);

  useEffect(() => { setContacts([]); setStatus(""); setError(""); void synchronize(); }, [synchronize]);
  const visible = contacts.filter(contact => `${contact.name} ${contact.phone}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));

  return <>
    <button type="button" title="Contatos do WhatsApp" aria-label="Contatos do WhatsApp" onClick={() => setOpen(true)}><WhatsAppIcon name="users" /></button>
    <Modal title="Contatos do WhatsApp" open={open} onClose={close} width="tw:max-w-[560px]">
      <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2">
        <label className="tw:grid tw:min-w-0 tw:flex-1 tw:basis-48 tw:gap-1 tw:text-xs tw:font-medium">Buscar contato<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome ou telefone" className="tw:w-full tw:min-w-0 tw:rounded-[7px]!" /></label>
        <button type="button" className={button} disabled={busy} onClick={() => void synchronize()}>{busy ? "Sincronizando…" : "Atualizar"}</button>
      </div>
      {error ? <p role="alert" className="tw:m-0 tw:text-xs tw:text-red-700">{error}</p> : <p role="status" className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">{busy ? "Buscando contatos…" : status}</p>}
      <div className="tw:h-[min(360px,45dvh)] tw:min-w-0 tw:overflow-y-auto tw:rounded-md tw:border tw:border-[var(--line)]">
        {visible.map(contact => <button key={contact.remoteJid} type="button" disabled={!canSend || busy} className="tw:flex tw:w-full tw:min-w-0 tw:items-center tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-3 tw:text-left tw:enabled:hover:bg-[#174983] tw:enabled:hover:text-white tw:focus-visible:bg-[#174983] tw:focus-visible:text-white tw:[&:enabled:hover_span]:text-white tw:[&:focus-visible_span]:text-white tw:disabled:opacity-60" onClick={async () => {
          setBusy(true); setError("");
          try {
            const form = new FormData(); form.set("accountJid", accountJid); form.set("remoteJid", contact.remoteJid); form.set("name", contact.name);
            const result = await openWhatsAppContactConversationAction(form);
            if (activeAccount.current !== accountJid) return;
            onOpenConversation(result.id); setOpen(false); router.push(`/whatsapp?conversa=${encodeURIComponent(result.id)}`);
          } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível abrir a conversa."); }
          finally { setBusy(false); }
        }}><span className="tw:grid tw:min-w-0 tw:gap-1"><strong className="tw:break-words tw:text-sm tw:font-semibold">{contact.name}</strong><span className="tw:text-xs tw:text-[var(--muted)]">{formatWhatsAppPhone(contact.phone)}</span></span><span className="tw:ml-auto tw:shrink-0 tw:text-[var(--muted)]" aria-hidden="true">↗</span></button>)}
        {!busy && !visible.length ? <p className="tw:p-3 tw:text-sm tw:text-[var(--muted)]">{contacts.length ? "Nenhum contato encontrado." : "Nenhum contato disponibilizado pela integração."}</p> : null}
      </div>
    </Modal>
  </>;
}
