import { Permission } from "../../types/rbac";

interface Props {
  permissions: Permission[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function PermissionCheckboxList({ permissions, selectedIds, onChange }: Props) {
  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((existing) => existing !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 250, overflowY: "auto" }}>
      {permissions.map((permission) => (
        <label key={permission.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={selectedIds.includes(permission.id)}
            onChange={() => toggle(permission.id)}
          />
          <span>
            {permission.name}
            {permission.description ? ` — ${permission.description}` : ""}
          </span>
        </label>
      ))}
    </div>
  );
}