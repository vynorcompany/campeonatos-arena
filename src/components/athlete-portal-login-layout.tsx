import { viewStyles } from "./athlete-portal-login-layout.utilities";
import { AthletePortalWordmark } from "./athlete-portal-wordmark";
import type { ReactNode } from "react";
type Props = { children: ReactNode; arena?: { name: string; logoUrl?: string | null } };
export function AthletePortalLoginLayout({ children, arena }: Props) {
  return <main className="athlete-login-page tw:[--text:#202c3c] tw:[--muted:#606874] tw:[--panel:#fff] tw:[--line:#dce1e7] tw:dark:[--text:#e9edf3] tw:dark:[--muted:#aab4c2] tw:dark:[--panel:#101c2d] tw:dark:[--line:#293648] tw:grid tw:min-h-dvh tw:content-start tw:bg-[#f1f5fa] tw:text-[#202c3c] tw:dark:bg-[#091525] tw:dark:text-[#e9edf3] tw:[&_*]:box-border tw:min-[760px]:content-center tw:min-[760px]:place-items-center tw:min-[760px]:p-8">
    <div className="athlete-login-shell tw:grid tw:min-h-dvh tw:grid-rows-[auto_1fr] tw:min-[760px]:min-h-0 tw:min-[760px]:grid-rows-1 tw:w-full tw:max-w-[1000px] tw:min-w-0 tw:bg-white tw:dark:bg-[#101c2d] tw:min-[760px]:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] tw:min-[760px]:rounded-2xl tw:min-[760px]:shadow-[0_20px_70px_rgba(20,35,57,.12)]">
      <aside className="athlete-login-brand tw:relative tw:isolate tw:flex tw:min-h-56 tw:min-w-0 tw:flex-col tw:justify-between tw:gap-6 tw:bg-[#102d51] tw:bg-[linear-gradient(100deg,rgba(7,25,47,.92),rgba(7,25,47,.55)),url('/images/padel-night.webp')] tw:bg-cover tw:bg-center tw:p-6 tw:text-white tw:min-[760px]:min-h-[620px] tw:min-[760px]:rounded-l-2xl tw:min-[760px]:p-10" aria-label="Portal do Atleta">
        <div className="tw:w-44 tw:min-[760px]:w-52"><AthletePortalWordmark/></div>
        <div className="tw:grid tw:gap-4"><h1 className="tw:m-0 tw:max-w-[14ch] tw:text-[clamp(1.65rem,4vw,2.6rem)] tw:leading-[1.12] tw:font-semibold tw:tracking-[-.025em]">Seu próximo jogo começa aqui.</h1>
          {arena ? <div className="tw:flex tw:items-center tw:gap-2 tw:text-sm">{arena.logoUrl ? <img src={arena.logoUrl} alt="" className="tw:size-7 tw:shrink-0 tw:object-contain"/> : null}<span>{arena.name}</span></div> : null}
        </div>
      </aside>
      <div className={`${viewStyles.athlete_login_form_panel} tw:w-full! tw:min-w-0! tw:content-start tw:p-6! tw:pb-8! tw:[&_.public-client-auth>header>span]:hidden tw:[&_.public-client-auth>header_h2]:text-2xl! tw:[&_.public-client-auth>header_h2]:tracking-[-.02em]! tw:[&_.public-client-auth_input]:min-h-11 tw:[&_.public-client-auth_button]:min-h-10 tw:min-[760px]:content-center tw:min-[760px]:rounded-r-2xl tw:min-[760px]:p-10!`}>{children}</div>
    </div>
  </main>;
}
