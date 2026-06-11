import type { NextPageContext } from "next";
import Link from "next/link";

type ErrorPageProps = {
  statusCode?: number;
};

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Arena Padel</p>
        <h1>{statusCode ? `Erro ${statusCode}` : "Erro inesperado"}</h1>
        <p className="muted">
          O servidor nao conseguiu carregar esta pagina no momento.
        </p>
        <div className="section-actions">
          <Link href="/login" className="button button-primary">
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
