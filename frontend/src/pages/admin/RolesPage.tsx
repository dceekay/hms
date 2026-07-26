import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiEdit3, FiRefreshCw, FiSave, FiSearch, FiShield, FiTrash2 } from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import { getPermissions } from "../../services/permissionService";
import { createRole, deleteRole, getRoles, updateRole } from "../../services/roleService";
import { Permission, Role } from "../../types/rbac";
import { useAuthStore } from "../../store/authStore";

type RoleForm = {
  name: string;
  description: string;
  permissionIds: string[];
};

const emptyForm: RoleForm = {
  name: "",
  description: "",
  permissionIds: [],
};

function permissionIds(role: Role) {
  return role.permissions?.map((entry) => entry.permission.id) ?? [];
}

function groupPermissionName(name: string) {
  return name.split(".")[0] || "general";
}

export default function RolesPage() {
  const permissionsForUser = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissionsForUser.includes("roles.create");
  const canUpdate = permissionsForUser.includes("roles.update");
  const canDelete = permissionsForUser.includes("roles.delete");

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const groupedPermissions = useMemo(() => {
    const visible = permissions.filter((permission) =>
      `${permission.name} ${permission.description ?? ""}`.toLowerCase().includes(permissionSearch.toLowerCase())
    );

    return visible.reduce<Record<string, Permission[]>>((groups, permission) => {
      const group = groupPermissionName(permission.name);
      groups[group] = [...(groups[group] ?? []), permission];
      return groups;
    }, {});
  }, [permissionSearch, permissions]);

  const summary = useMemo(
    () => ({
      roles: roles.length,
      permissions: permissions.length,
      protected: roles.filter((role) => role.name === "Super Admin").length,
    }),
    [permissions.length, roles]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [rolesResult, permissionsResult] = await Promise.all([getRoles(), getPermissions()]);
    setLoading(false);

    if (!rolesResult || !permissionsResult) {
      setError("Unable to load roles and permissions.");
      return;
    }

    setRoles(rolesResult);
    setPermissions(permissionsResult);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateField = (field: keyof RoleForm, value: string | string[]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const togglePermission = (permissionId: string) => {
    setForm((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(permissionId)
        ? current.permissionIds.filter((id) => id !== permissionId)
        : [...current.permissionIds, permissionId],
    }));
  };

  const resetForm = () => {
    setEditingRole(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
  };

  const startEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description ?? "",
      permissionIds: permissionIds(role),
    });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = editingRole
      ? await updateRole(editingRole.id, form)
      : await createRole(form);

    setSaving(false);

    if (!result.role) {
      setError(result.error ?? "Unable to save role.");
      return;
    }

    setSuccess(editingRole ? "Role updated." : "Role created.");
    resetForm();
    await loadData();
  };

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Delete ${role.name}?`)) return;
    setError(null);
    setSuccess(null);
    const result = await deleteRole(role.id);

    if (!result.success) {
      setError(result.error ?? "Unable to delete role.");
      return;
    }

    setSuccess("Role deleted.");
    await loadData();
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="rbac-page">
          <section className="rbac-header">
            <div>
              <p className="eyebrow">Administration</p>
              <h1>Roles</h1>
              <p>Define staff groups and the permissions each group receives.</p>
            </div>
            <div className="rbac-summary-grid">
              <span><strong>{summary.roles}</strong><small>Roles</small></span>
              <span><strong>{summary.permissions}</strong><small>Permissions</small></span>
              <span><strong>{summary.protected}</strong><small>Protected</small></span>
            </div>
          </section>

          <section className="rbac-layout">
            <form className="setup-form rbac-form" onSubmit={handleSubmit}>
              <div className="panel-title">
                <div>
                  <h2>{editingRole ? "Edit Role" : "Add Role"}</h2>
                  <p>{editingRole ? editingRole.name : "Create a role and assign permissions."}</p>
                </div>
                <FiShield />
              </div>

              <div className="form-grid">
                <label>
                  Role name
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    required
                    disabled={editingRole?.name === "Super Admin"}
                  />
                </label>
                <label>
                  Description
                  <input
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="What this role can do"
                  />
                </label>
              </div>

              <div className="patient-search-control">
                <FiSearch />
                <input
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.target.value)}
                  placeholder="Search permissions"
                />
              </div>

              <div className="rbac-permission-groups">
                {Object.entries(groupedPermissions).map(([group, items]) => (
                  <section key={group} className="rbac-permission-group">
                    <h3>{group}</h3>
                    <div className="rbac-check-list">
                      {items.map((permission) => (
                        <label key={permission.id} className="rbac-check">
                          <input
                            type="checkbox"
                            checked={form.permissionIds.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                          />
                          <span>{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {error && <p className="registration-error">{error}</p>}
              {success && <p className="security-success">{success}</p>}

              <div className="setup-actions">
                {editingRole && <button type="button" className="icon-text-btn" onClick={resetForm}>Cancel</button>}
                <button className="registration-submit" type="submit" disabled={saving || (editingRole ? !canUpdate : !canCreate)}>
                  {saving ? "Saving..." : editingRole ? "Save Role" : "Create Role"}
                  <FiSave />
                </button>
              </div>
            </form>

            <section className="setup-list-panel">
              <div className="setup-list-header">
                <h2>Role List</h2>
                <button type="button" className="icon-text-btn" onClick={loadData}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {loading && <p className="muted-text">Loading roles...</p>}
              <div className="rbac-list">
                {roles.map((role) => (
                  <article className="rbac-row-card" key={role.id}>
                    <div className="rbac-row-main">
                      <span className="rbac-avatar"><FiShield /></span>
                      <div>
                        <strong>{role.name}</strong>
                        <p>{role.description || "No description added."}</p>
                        <small>{permissionIds(role).length} permission(s)</small>
                      </div>
                    </div>
                    <div className="patient-row-actions">
                      {canUpdate && <button type="button" className="icon-text-btn" onClick={() => startEdit(role)}><FiEdit3 />Edit</button>}
                      {canDelete && role.name !== "Super Admin" && (
                        <button type="button" className="icon-text-btn danger" onClick={() => handleDelete(role)}>
                          <FiTrash2 />
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
