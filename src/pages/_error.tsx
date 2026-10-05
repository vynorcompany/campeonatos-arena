import { viewStyles } from "./_error.utilities";
import type { NextPageContext } from "next";
import Link from "next/link";

type ErrorPageProps = {
  statusCode?: number;
};

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main className={viewStyles.auth_page}>
      <section className={viewStyles.auth_card}>
        <p className={viewStyles.eyebrow}>Arena Padel</p>
        <h1>{statusCode ? `Erro ${statusCode}` : "Erro inesperado"}</h1>
        <p className={viewStyles.muted}>
          O servidor nao conseguiu carregar esta pagina no momento.
        </p>
        <div className={viewStyles.section_actions}>
          <Link href="/login" className={viewStyles.button_button_primary}>
            Ir para o login
          </Link>
        </div>
      </section>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? (err ? 500 : 404);
  return { statusCode };
};

export default ErrorPage;
