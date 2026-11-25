import { AthletePortalWordmark } from "../athlete-portal-wordmark";
import { viewStyles } from "./login-brand-panel.utilities";
export function LoginBrandPanel() {
  return <aside className={viewStyles.login_brand_panel} aria-label="VX4">
    <div className={viewStyles.login_brand}><AthletePortalWordmark /></div>
    <div className={viewStyles.login_brand_message}><span className={viewStyles.login_kicker}>GESTÃO EM UM SÓ LUGAR</span><h2>Sua operação em jogo. Tudo sob controle.</h2><p>Agenda, torneios, clientes e financeiro conectados em um único espaço de trabalho.</p></div>
    <p className={viewStyles.login_brand_footer}>Uma experiência para quem vive a arena todos os dias.</p>
  </aside>;
}
