"use client";
import { useState } from "react";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import type { Account, Option } from "./accounts-ledger-parts";

type Kind = "SUPPLIER" | "EMPLOYEE" | "TEACHER" | "CLIENT";
export function PayablePayeeFields({ suppliers, employees, teachers, clients, initial, fieldClassName }: { suppliers: Option[]; employees: Option[]; teachers: Option[]; clients: Option[]; initial?: Account; fieldClassName: string }) {
  const initialKind: Kind = initial?.payeeEmployeeId ? "EMPLOYEE" : initial?.payeeTeacherId ? "TEACHER" : initial?.supplierId ? "SUPPLIER" : initial?.playerId ? "CLIENT" : "SUPPLIER";
  const [kind, setKind] = useState<Kind>(initialKind);
  const [id, setId] = useState(initial?.payeeEmployeeId || initial?.payeeTeacherId || initial?.supplierId || initial?.playerId || "");
  const [name, setName] = useState(initial?.counterpartyName === "Não informado" ? "" : initial?.counterpartyName || "");
  const choices = kind === "EMPLOYEE" ? employees : kind === "TEACHER" ? teachers : kind === "CLIENT" ? clients : suppliers;
  const label = kind === "EMPLOYEE" ? "Funcionário" : kind === "TEACHER" ? "Professor" : kind === "CLIENT" ? "Cliente" : "Fornecedor";
  const legacy = kind === initialKind && !id && name && initial;
  return <>
    <input type="hidden" name="payeeKind" value={kind} />
    <input type="hidden" name="payeeId" value={id} />
    <input type="hidden" name="counterpartyName" value={name} />
    <label className={fieldClassName}>Tipo de favorecido<select value={kind} onChange={e => { setKind(e.target.value as Kind); setId(""); setName(""); }}><option value="SUPPLIER">Fornecedor</option><option value="EMPLOYEE">Funcionário</option><option value="TEACHER">Professor</option><option value="CLIENT">Cliente</option></select></label>
    <label className={fieldClassName}>{label}<SmartEntitySelect key={kind} label={label} createKind={kind === "SUPPLIER" ? "supplier" : kind === "CLIENT" ? "client" : undefined} valueMode="id" value={legacy ? "legacy" : id} required onChange={e => { setId(e.target.value === "legacy" ? "" : e.target.value); setName(e.target.selectedOptions[0]?.textContent ?? ""); }}><option value="">Pesquisar e selecionar</option>{legacy ? <option value="legacy">{name}</option> : null}{id && !choices.some(choice => choice.id === id) ? <option value={id}>{name}</option> : null}{choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}</SmartEntitySelect></label>
  </>;
}
