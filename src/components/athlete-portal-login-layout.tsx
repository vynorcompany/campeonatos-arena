import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  arena?: { name: string; logoUrl?: string | null };
};

export function AthletePortalLoginLayout({ children, arena }: Props) {
  return <main className="athlete-login-page">
    <div className="athlete-login-shell">
      <aside className="athlete-login-brand" aria-label="Portal do Atleta">
        <div className="athlete-login-identity">
          {arena?.logoUrl ? <img src={arena.logoUrl} alt="" /> : <span className="athlete-login-mark" aria-hidden="true">{arena ? arena.name.slice(0, 2).toUpperCase() : "AP"}</span>}
          <span><strong>{arena?.name ?? "ARENA"}</strong><small>PORTAL DO ATLETA</small></span>
        </div>
        <div className="athlete-login-message">
          <span>SEU JOGO COMEÇA AQUI</span>
          <h1>Seu espaço dentro e fora da quadra.</h1>
          <p>Acompanhe torneios, aulas, reservas e pagamentos em um único lugar.</p>
        </div>
        <p className="athlete-login-footer">Tudo o que você precisa para viver a arena.</p>
      </aside>
      <div className="athlete-login-form-panel">{children}</div>
    </div>
  </main>;
}
