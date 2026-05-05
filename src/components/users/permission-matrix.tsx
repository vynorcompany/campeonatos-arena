import { permissionModules } from "@/lib/permissions";

type PermissionMatrixProps = {
  viewPermissions?: string[];
  editPermissions?: string[];
};

export function PermissionMatrix({ viewPermissions = [], editPermissions = [] }: PermissionMatrixProps) {
  return (
    <fieldset className="permission-matrix">
      <legend>Permissões por módulo</legend>
      <div className="permission-matrix-head" aria-hidden="true">
        <span>Módulo</span>
        <span>Visualizar</span>
        <span>Alterar</span>
      </div>
      {permissionModules.map((module) => (
        <label className="permission-row" key={module.key}>
          <span>{module.label}</span>
          <input
            name="viewPermissions"
            type="checkbox"
            value={module.key}
            defaultChecked={viewPermissions.includes(module.key)}
            aria-label={`Visualizar ${module.label}`}
          />
          <input
            name="editPermissions"
            type="checkbox"
            value={module.key}
            defaultChecked={editPermissions.includes(module.key)}
            aria-label={`Alterar ${module.label}`}
          />
        </label>
      ))}
    </fieldset>
  );
}
