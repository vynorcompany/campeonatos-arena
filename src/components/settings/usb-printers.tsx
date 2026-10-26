"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

type PrinterDevice = { productName?: string; manufacturerName?: string; vendorId: number; productId: number; deviceClass: number; configurations: { interfaces: { alternates: { interfaceClass: number }[] }[] }[] };
type UsbAccess = EventTarget & { getDevices(): Promise<PrinterDevice[]>; requestDevice(options: { filters: { classCode: number }[] }): Promise<PrinterDevice> };
function usbAccess() { return (navigator as Navigator & { usb?: UsbAccess }).usb; }
function isPrinter(device: PrinterDevice) {
  return device.deviceClass === 7 || device.configurations.some(configuration => configuration.interfaces.some(item => item.alternates.some(alternate => alternate.interfaceClass === 7)));
}
const hex = (value: number) => value.toString(16).toUpperCase().padStart(4, "0");

export function UsbPrinters() {
  const [state, setState] = useState<"loading" | "ready" | "unsupported" | "insecure">("loading");
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const usb = usbAccess(); if (!usb) return;
    const request = ++revision.current;
    try {
      const attached = await usb.getDevices();
      if (request === revision.current) { setDevices(attached.filter(isPrinter)); setState("ready"); }
    } catch { if (request === revision.current) { setState("ready"); setMessage("O navegador não permitiu consultar os dispositivos USB. Confira a permissão deste site."); } }
  }, []);
  useEffect(() => {
    if (!window.isSecureContext) { setState("insecure"); return; }
    const usb = usbAccess(); if (!usb) { setState("unsupported"); return; }
    void refresh();
    const changed = () => { void refresh(); };
    usb.addEventListener("connect", changed); usb.addEventListener("disconnect", changed);
    return () => { ++revision.current; usb.removeEventListener("connect", changed); usb.removeEventListener("disconnect", changed); };
  }, [refresh]);
  async function authorize() {
    const usb = usbAccess(); if (!usb || busy) return;
    setBusy(true); setMessage("");
    try { await usb.requestDevice({ filters: [{ classCode: 7 }] }); await refresh(); }
    catch (error) { setMessage(error instanceof Error && error.name === "NotFoundError" ? "Nenhuma impressora foi autorizada. Você pode tentar novamente." : "Não foi possível autorizar a impressora. Confira a conexão USB e a permissão do navegador."); }
    finally { setBusy(false); }
  }
  return <section className={`${ui.panel} tw:grid tw:gap-3`} aria-labelledby="usb-printers-title">
    <div><h2 id="usb-printers-title" className="tw:m-0 tw:text-sm tw:font-semibold">Impressoras USB deste computador</h2><p className="tw:mb-0 tw:mt-1 tw:text-xs tw:leading-5 tw:text-[var(--muted)]">A lista mostra impressoras conectadas e autorizadas neste navegador. A impressão usa o driver e a seleção de impressora do computador.</p></div>
    {state === "unsupported" ? <p className="tw:m-0 tw:text-xs tw:leading-5">Este navegador não oferece leitura USB. Use Chrome ou Edge compatível para consultar os dispositivos, ou imprima pela página de teste.</p> : state === "insecure" ? <p className="tw:m-0 tw:text-xs">Abra o sistema por HTTPS para consultar impressoras USB.</p> : <>
      <div className="tw:flex tw:flex-wrap tw:gap-2"><button type="button" className={ui.secondary} onClick={authorize} disabled={busy || state === "loading"}>{busy ? "Aguardando autorização..." : "Autorizar impressora USB"}</button><button type="button" className={ui.secondary} disabled={busy || state === "loading"} onClick={() => { setMessage(""); void refresh(); }}>Atualizar lista</button></div>
      <div role="status" aria-live="polite">{state === "loading" ? <p className="tw:m-0 tw:text-xs">Consultando dispositivos...</p> : devices.length ? <ul className="tw:m-0 tw:grid tw:list-none tw:gap-2 tw:p-0">{devices.map((device, index) => <li key={`${device.vendorId}:${device.productId}:${index}`} className="tw:min-w-0 tw:border-l-2 tw:border-[var(--primary)] tw:pl-3 tw:text-xs"><strong className="tw:block tw:break-words">{device.productName || "Impressora USB"}</strong><span className="tw:block tw:break-words tw:leading-5 tw:text-[var(--muted)]">{device.manufacturerName ? `${device.manufacturerName} · ` : ""}USB {hex(device.vendorId)}:{hex(device.productId)} · Conectada</span></li>)}</ul> : <p className="tw:m-0 tw:text-xs tw:leading-5 tw:text-[var(--muted)]">Nenhuma impressora USB autorizada foi detectada. Conecte o cabo e clique em Autorizar impressora USB.</p>}</div>
    </>}
    {message ? <p role="status" className="tw:m-0 tw:text-xs tw:leading-5">{message}</p> : null}
    <p className="tw:m-0 tw:text-xs tw:leading-5 tw:text-[var(--muted)]">Algumas impressoras não expõem a identificação USB ao navegador e aparecem apenas no diálogo de impressão. A lista não confirma saída de papel.</p>
  </section>;
}
