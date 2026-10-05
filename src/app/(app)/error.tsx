"use client";
import { viewStyles } from "./error.utilities";

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
    <section className={viewStyles.error_shell}>
      <div className={viewStyles.error_card}>
        <p className={viewStyles.eyebrow}>Ops</p>
        <h1>Algo saiu do fluxo</h1>
        <p className={viewStyles.muted}>
          {error.message || "Não foi possível concluir esta ação agora."}
        </p>

        <div className={viewStyles.section_actions}>
          <button type="button" className={viewStyles.button_button_primary} onClick={reset}>
            Tentar novamente
          </button>
        </div>
      </div>
    </section>
  );
}
