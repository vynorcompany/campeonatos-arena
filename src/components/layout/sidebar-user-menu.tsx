import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { SidebarPopover } from "./sidebar-popover";

export function SidebarUserMenu({ userName, userRole, accountHref = "/minha-conta" }: { userName: string; userRole: string; accountHref?: string | null }) {
  const initials = userName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const item = "tw:flex tw:w-full tw:items-center tw:gap-2 tw:rounded-md tw:border-0 tw:bg-transparent tw:px-3 tw:py-2 tw:text-left tw:text-sm tw:text-white tw:no-underline tw:cursor-pointer tw:hover:bg-white/10 tw:focus-visible:outline-2 tw:focus-visible:outline-white/70";
  return <SidebarPopover label={`Opções de ${userName}`} trigger={<><span className="tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-white/15 tw:text-xs tw:font-semibold" aria-hidden="true">{initials}</span><span className="tw:min-w-0 tw:text-sm tw:font-medium tw:[overflow-wrap:anywhere]">{userName}</span></>}>
    <p className="tw:m-0 tw:px-3 tw:py-2 tw:text-xs tw:text-white/65">{userRole}</p>
    {accountHref ? <Link scroll={false} href={accountHref} className={item}>Minha conta</Link> : null}
    <form action={logoutAction}><button type="submit" className={item}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></svg>Sair</button></form>
  </SidebarPopover>;
}
