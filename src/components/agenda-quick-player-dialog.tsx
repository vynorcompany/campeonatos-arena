"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { createQuickPlayerAction } from "@/lib/actions/calendar";

export function AgendaQuickPlayerDialog({ initialName, onClose, onCreated }: {
  initialName: string;
  onClose: () => void;
  onCreated: (player: { id: string; name: string }) => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); event.stopPropagation();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    setError(""); setSaving(true);
    try { const player = await createQuickPlayerAction(data); if ("error" in player) { setError(player.error ?? "Não foi possível cadastrar o cliente."); return; } onCreated(player); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar o cliente."); }
    finally { setSaving(false); }
  }
  return <Modal title="Cadastrar cliente" open onClose={onClose} fixedSize={false} width="tw:max-w-[480px]">
    <form onSubmit={submit} className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:viewport-440:grid-cols-1 tw:[&_input]:h-9! tw:[&_input]:min-h-9! tw:[&_select]:h-9! tw:[&_select]:min-h-9!">
      <label className={`${ui.field} tw:col-span-full`}>Nome e sobrenome<input name="name" required minLength={3} maxLength={160} defaultValue={initialName} autoComplete="name" data-modal-autofocus /></label>
      <label className={ui.field}>Telefone<input name="phone" type="tel" required minLength={8} maxLength={30} autoComplete="tel" /></label>
      <label className={ui.field}>E-mail<input name="email" type="email" maxLength={254} autoComplete="email" /></label>
      <label className={ui.field}>CPF<input name="cpf" inputMode="numeric" maxLength={14} /></label>
      <label className={ui.field}>Nascimento<input name="birthDate" type="date" autoComplete="bday" /></label>
      <label className={ui.field}>Classe<input name="class" maxLength={40} /></label>
      <label className={ui.field}>Gênero<select name="gender" defaultValue=""><option value="">Não informar</option><option>Feminino</option><option>Masculino</option><option>Outro</option></select></label>
      {error ? <p role="alert" className="tw:col-span-full tw:m-0 tw:text-xs tw:text-red-700">{error}</p> : null}
      <footer className="tw:col-span-full tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3">
        <button type="button" className={ui.secondary} onClick={onClose} disabled={saving}>Cancelar</button>
        <button type="submit" className={ui.primary} disabled={saving}>{saving ? "Cadastrando…" : "Cadastrar cliente"}</button>
      </footer>
    </form>
  </Modal>;
}
