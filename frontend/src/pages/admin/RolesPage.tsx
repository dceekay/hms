import { useEffect, useState } from "react";
import {
  getRoles,
  createRole,
  deleteRole,
  assignPermissionsToRole,
} from "../../services/roleService";
import { getPermissions } from "../../services/permissionService";
import { Role, Permission } from "../../types/rbac";
import PermissionCheckboxList from "../../components/roles/PermissionCheckboxList";
import { NavBar } from "../../components/NavBar";
import { useAuthStore } from "../../store/authStore";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingPermissionIds, setEditingPermissionIds] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const permissionsForUser = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissionsForUser.includes("roles.create");
  const canUpdate = permissionsForUser.includes("roles.update");
  const canDelete = permissionsForUser.includes("roles.delete");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);

    const [rolesData, permissionsData] = await Promise.all([getRoles(), getPermissions()]);

    if (rolesData) setRoles(rolesData);
    if (permissionsData) setPermissions(permissionsData);

    setLoading(false);
  }

  async function handleCreate() {
    if (!name.trim()) return;

    setCreating(true);
    const role = await createRole({ name, description: description || undefined });
    setCreating(false);

    if (role) {
      setName("");
      setDescription("");
      loadAll();
    } else {
      alert("Failed to create role");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this role?")) return;

    const ok = await deleteRole(id);
    if (ok) {
      loadAll();
    } else {
      alert("Failed to delete role (it may still be assigned to users, or is protected)");
    }
  }

  function startEditingPermissions(role: Role) {
    setEditingRoleId(role.id);
    setEditingPermissionIds(role.permissions?.map((rp) => rp.permission.id) ?? []);
  }

  async function saveEditingPermissions() {
    if (!editingRoleId) return;

    setSavingPermissions(true);
    const result = await assignPermissionsToRole(editingRoleId, editingPermissionIds);
    setSavingPermissions(false);

    if (result) {
      setEditingRoleId(null);
      loadAll();
    } else {
      alert("Failed to update permissions");
    }
  }

  if (loading) {
    return <h2>Loading roles...</h2>;
  }

  return (
    <>
      <NavBar />
      <main className="page-container">
        <div className="card">
          <h1>Roles</h1>

          {canCreate && (
            <div style={{ marginTop: 20, marginBottom: 30, display: "flex", gap: 10 }}>
              <input
                placeholder="Role name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <button onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create Role"}
              </button>
            </div>
          )}

          <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Permissions</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {roles.map((role) => (
            <tr key={role.id}>
              <td>{role.name}</td>
              <td>{role.description}</td>
              <td>{role.permissions?.length ?? 0}</td>
              <td style={{ display: "flex", gap: 8 }}>
                {canUpdate && <button onClick={() => startEditingPermissions(role)}>Edit Permissions</button>}
                {canDelete && <button onClick={() => handleDelete(role.id)}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

          {editingRoleId && (
        <div
          style={{
            marginTop: 30,
            padding: 20,
            border: "1px solid #ccc",
            maxWidth: 500,
          }}
        >
          <h3>Edit Permissions</h3>

          <PermissionCheckboxList
            permissions={permissions}
            selectedIds={editingPermissionIds}
            onChange={setEditingPermissionIds}
          />

          <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
            <button onClick={saveEditingPermissions} disabled={savingPermissions}>
              {savingPermissions ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditingRoleId(null)}>Cancel</button>
          </div>
        </div>
          )}
        </div>
      </main>
    </>
  );
}
