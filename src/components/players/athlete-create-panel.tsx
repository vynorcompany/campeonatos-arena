"use client";
import { ActionIcon, actionIconButton } from "@/components/ui/action-icon";
import { viewStyles } from "./athlete-create-panel.utilities";

import { Modal } from "@/components/ui/modal";
import { useCallback, useState } from "react";
import { PlayerForm } from "@/components/forms/player-form";

export function AthleteCreatePanel({ openLabel = "Adicionar novo atleta", guardians = [], iconOnly = false }: { iconOnly?: boolean; openLabel?: string; guardians?: { id:string; name:string }[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);
  return (
    <div className={viewStyles.athlete_create_panel}>
      <button
        type="button"
        className={iconOnly ? `${actionIconButton} tw:text-[#087443]` : viewStyles.button_button_primary}
        aria-label={isOpen ? "Fechar cadastro" : openLabel}
        title={isOpen ? "Fechar cadastro" : openLabel}
        aria-expanded={isOpen}

        onClick={() => setIsOpen((current) => !current)}
      >
        {iconOnly ? <ActionIcon name="userPlus"/> : isOpen ? "Fechar cadastro" : openLabel}
      </button>

      <Modal title="Novo cliente" open={isOpen} onClose={close} width="tw:max-w-[800px]" tone="management">{isOpen ? <PlayerForm guardians={guardians} /> : null}</Modal>
    </div>
  );
}
