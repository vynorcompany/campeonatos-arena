"use client";

import { usePortalPwa } from "./portal-pwa-provider";

export function PortalPwaExperience({ showInstallControl }: { showInstallControl: boolean }) {
  const pwa = usePortalPwa();
  if (!pwa) return null;
  if (!showInstallControl) {
    return !pwa.online ? <div role="status" aria-atomic="true" className="tw:flex tw:items-start tw:gap-2 tw:rounded-[5px] tw:border tw:border-[#c69b35] tw:bg-[#fff8e7] tw:px-3 tw:py-2.5 tw:text-sm tw:text-[#654500] tw:dark:border-[#8f773f] tw:dark:bg-[#332b17] tw:dark:text-[#ffe2a1]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="tw:mt-0.5 tw:size-5 tw:shrink-0" aria-hidden="true"><path d="m3 3 18 18M2 8a16 16 0 0 1 3-2m4-1a16 16 0 0 1 13 3M5 12a11 11 0 0 1 4-2m5 0a11 11 0 0 1 5 2M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".7"/></svg><span>Sem conexão. Conecte-se à internet para consultar e atualizar seus dados.</span></div> : null;
  }
  if (pwa.installed) return null;
  return <section aria-label="Instalar Portal do Atleta" className="tw:min-w-0 tw:text-[#202c3c] tw:dark:text-[#e9edf3]">
    {pwa.canInstall ? <button type="button" onClick={() => void pwa.install()} disabled={pwa.installing || !pwa.online} className="tw:inline-flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-[5px] tw:border-0 tw:bg-[#174983] tw:px-4 tw:py-2 tw:text-sm tw:font-normal tw:text-white tw:hover:bg-[#103c70] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:focus-visible:outline-[#a5caff] tw:disabled:cursor-not-allowed tw:disabled:opacity-60"><InstallIcon/>{pwa.installing ? "Abrindo instalação…" : "Instalar aplicativo"}</button> : <details><summary className="tw:flex tw:min-h-11 tw:w-fit tw:cursor-pointer tw:list-none tw:items-center tw:gap-2 tw:rounded-[5px] tw:border-0 tw:bg-[#174983] tw:px-4 tw:py-2 tw:text-sm tw:font-normal tw:text-white tw:hover:bg-[#103c70] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:focus-visible:outline-[#a5caff] tw:[&::-webkit-details-marker]:hidden"><InstallIcon/>Instalar aplicativo<svg className="tw:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></summary><p className="tw:mt-2 tw:mb-0 tw:max-w-prose tw:text-sm tw:leading-relaxed">{pwa.platform === "ios" ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Se necessário, abra este endereço no Safari." : pwa.platform === "android" ? "No menu do navegador, escolha Instalar aplicativo ou Adicionar à tela inicial." : "No menu do navegador, procure Instalar aplicativo. Se a opção não aparecer, use um navegador compatível, como Chrome ou Edge."}</p></details>}
    {pwa.error ? <p role="status" className="tw:mt-2 tw:mb-0 tw:text-sm tw:text-[#a23223] tw:dark:text-[#ffb9ab]">{pwa.error}</p> : null}
  </section>;
}
function InstallIcon() {
  return <svg className="tw:size-5 tw:shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/></svg>;
}
