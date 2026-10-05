"use client";
import { viewStyles } from "./permission-matrix.utilities";

import { useRef } from "react";
import { permissionAreas } from "@/lib/permissions";

type PermissionMatrixProps = {
  viewPermissions?: string[];
  editPermissions?: string[];
};

export function PermissionMatrix({ viewPermissions = [], editPermissions = [] }: PermissionMatrixProps) {
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);

  function selectAllPermissions() {
    fieldsetRef.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
      input.checked = true;
    });
  }

  return <fieldset ref={fieldsetRef} className={viewStyles.permission_matrix}>
    <legend>Permissões do perfil</legend>
    <div className={viewStyles.permission_matrix_heading}>
      <p className={viewStyles.permission_matrix_help}>Marque somente as ações que este perfil poderá executar.</p>
      <button type="button" className={viewStyles.button_button_small} onClick={selectAllPermissions}>Selecionar tudo</button>
    </div>
    <div className={viewStyles.permission_area_grid}>
      {permissionAreas.map((area) => <section className={viewStyles.permission_area} key={area.title}>
        <h3>{area.title}</h3>
        {area.actions.map(([key, label]) => {
          const isView = key.endsWith(":view") || key === "support:view";
          const checked = isView ? viewPermissions.includes(key) : editPermissions.includes(key);
          return <label key={key} className={viewStyles.permission_action}>{key === "finance:delete-entry" ? <input name="financialEntryDelete" type="checkbox" value={key} defaultChecked={checked} /> : <input name={isView ? "viewPermissions" : "editPermissions"} type="checkbox" value={key} defaultChecked={checked} />}<span>{key === "finance:delete-entry" ? "Excluir lançamentos" : label}</span></label>;
        })}
      </section>)}
    </div>
  </fieldset>;
}
