import { permissionAreas } from "@/lib/permissions";

type PermissionMatrixProps = {
  viewPermissions?: string[];
  editPermissions?: string[];
};

export function PermissionMatrix({ viewPermissions = [], editPermissions = [] }: PermissionMatrixProps) {
  return <fieldset className="permission-matrix">
    <legend>Permissões do perfil</legend>
    <p className="permission-matrix-help">Marque somente as ações que este perfil poderá executar.</p>
    <div className="permission-area-grid">
      {permissionAreas.map((area) => <section className="permission-area" key={area.title}>
        <h3>{area.title}</h3>
        {area.actions.map(([key, label]) => {
          const isView = key.endsWith(":view") || key === "support:view";
          const checked = isView ? viewPermissions.includes(key) : editPermissions.includes(key);
          return <label key={key} className="permission-action">{key === "finance:delete-entry" ? <input name="financialEntryDelete" type="checkbox" value={key} defaultChecked={checked} /> : <input name={isView ? "viewPermissions" : "editPermissions"} type="checkbox" value={key} defaultChecked={checked} />}<span>{key === "finance:delete-entry" ? "Excluir lançamentos" : label}</span></label>;
        })}
      </section>)}
    </div>
  </fieldset>;
}
