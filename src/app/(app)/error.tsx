"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="error-shell">
      <div className="error-card">
        <p className="eyebrow">Ops</p>
        <h1>Algo saiu do fluxo</h1>
        <p className="muted">
          {error.message || "Não foi possível concluir esta ação agora."}
        </p>

        <div className="section-actions">
          <button type="button" className="button button-primary" onClick={reset}>
            Tentar novamente
          </button>
        </div>
      </div>
    </section>
  );
}
