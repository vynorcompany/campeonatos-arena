"use client";
import { useState } from "react";
export function ClientIdentityFields({personType="PF",name="",cpf="",cnpj="",fieldClassName="",nameClassName="",documentClassName=""}:{personType?:string;name?:string;cpf?:string;cnpj?:string;fieldClassName?:string;nameClassName?:string;documentClassName?:string}) {
  const [type,setType]=useState(personType);
  return <><label className={fieldClassName}>Tipo de pessoa<select name="personType" value={type} onChange={e=>setType(e.target.value)}><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select></label><label className={`${fieldClassName} ${nameClassName}`}>{type==="PJ"?"Razão social":"Nome e sobrenome"}<input name="name" defaultValue={name} required maxLength={160}/></label><label className={type==="PF"?`${fieldClassName} ${documentClassName}`:"tw:hidden!"}>CPF<input name="cpf" defaultValue={cpf} inputMode="numeric" maxLength={14}/></label><label className={type==="PJ"?`${fieldClassName} ${documentClassName}`:"tw:hidden!"}>CNPJ<input name="cnpj" defaultValue={cnpj} autoCapitalize="characters" maxLength={18}/></label></>;
}
