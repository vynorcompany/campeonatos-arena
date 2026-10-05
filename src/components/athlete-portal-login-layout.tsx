import { viewStyles } from "./athlete-portal-login-layout.utilities";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  arena?: { name: string; logoUrl?: string | null };
};

export function AthletePortalLoginLayout({ children, arena }: Props) {
  return <main className={viewStyles.athlete_login_page}>
    <div className={viewStyles.athlete_login_shell}>
      <aside className={viewStyles.athlete_login_brand} aria-label="Portal do Atleta">
        <div className={viewStyles.athlete_login_identity}>
          {arena?.logoUrl ? <img src={arena.logoUrl} alt="" /> : <span className={viewStyles.athlete_login_mark} aria-hidden="true">{arena ? arena.name.slice(0, 2).toUpperCase() : "AP"}</span>}
          <span><strong>{arena?.name ?? "ARENA"}</strong><small>PORTAL DO ATLETA</small></span>
        </div>
        <div className={viewStyles.athlete_login_message}>
          <span>SEU JOGO COMEÇA AQUI</span>
          <h1>Seu espaço dentro e fora da quadra.</h1>
          <p>Acompanhe torneios, aulas, reservas e pagamentos em um único lugar.</p>
        </div>
        <p className={viewStyles.athlete_login_footer}>Tudo o que você precisa para viver a arena.</p>
      </aside>
      <div className={viewStyles.athlete_login_form_panel}>{children}</div>
    </div>
  </main>;
}
