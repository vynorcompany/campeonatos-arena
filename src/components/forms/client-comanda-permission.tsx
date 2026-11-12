"use client";
import { useEffect,useState } from "react";
import { ToggleSwitch } from "./toggle-switch";
import { clientComandaPermissionDefaultAction } from "@/lib/actions/client-registration-defaults";
export function ClientComandaPermission({defaultValue}:{defaultValue?:boolean}) {
  const [allowed,setAllowed]=useState<boolean|null>(defaultValue??null);
  const [error,setError]=useState(false);
  useEffect(()=>{if(defaultValue!==undefined)return;let active=true;clientComandaPermissionDefaultAction().then(value=>{if(active)setAllowed(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[defaultValue]);
  return <div className="tw:col-span-full"><input type="hidden" name="allowOverdueComandas" disabled={allowed===null} value={allowed?"on":"off"}/><ToggleSwitch compact label="Permitir comandas com pagamentos vencidos" checked={allowed??false} disabled={allowed===null} onCheckedChange={setAllowed}/>{error?<small role="status" className="tw:text-xs tw:text-[#526781]">A regra da arena será mantida. Reabra o cadastro para personalizar.</small>:null}</div>;
}
