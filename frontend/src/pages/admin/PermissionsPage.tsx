import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiEdit3, FiKey, FiRefreshCw, FiSave, FiSearch, FiTrash2 } from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import {
  createPermission,
  deletePermission,
  getPermissions,
  updatePermission,
} from "../../services/permissionService";
import { Permission } from "../../types/rbac";
import { useAuthStore } from "../../store/authStore";

type PermissionForm = {
  name: string;
  description: string;
};

const emptyForm: PermissionForm = {
  name: "",
  description: "",
};

const protectedPermissionNames = new Set([
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "roles.read",
  "roles.create",
  "roles.update",
  "roles.delete",
  "permissions.read",
  "permissions.create",
  "permissions.update",
  "permissions.delete",
]);

function groupPermissionName(name: string) {
  return name.split(".")[0] || "general";
}

export default function PermissionsPage() {
  const userPermissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canWrite = userPermissions.includes("permissions.write") || userPermissions.includes("permissions.update");
  const canDelete = userPermissions.includes("permissions.delete");

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form, setForm] = useState<PermissionForm>(emptyForm);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredPermissions = useMemo(
    () =>
      permissions.filter((permission) =>
        `${permission.name} ${permission.description ?? ""}`.toLowerCase().includes(search.toLowerCase())
      ),
    [permissions, search]
  );

  const summary = useMemo(
    () => ({
      total: permissions.length,
      protected: permissions.filter((permission) => protectedPermissionNames.has(permission.name)).length,
      assigned: permissions.filter((permission) => Number(permission.rolesUsing ?? 0) > 0).length,
    }),
    [permissions]
  );

  const groupedPermissions = useMemo(
    () =>
      filteredPermissions.reduce<Record<string, Permission[]>>((groups, permission) => {
        const group = groupPermissionName(permission.name);
        groups[group] = [...(groups[group] ?? []), permission];
        return groups;
      }, {}),
    [filteredPermissions]
  );

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    const result = await getPermissions();
    setLoading(false);

    if (!result) {
      setError("Unable to load permissions.");
      return;
    }

    setPermissions(result);
  };

  useEffect(() => {
    void loadPermissions();
  }, []);

  const resetForm = () => {
    setEditingPermission(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
  };

  const startEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setForm({
      name: permission.name,
      description: permission.description ?? "",
    });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = editingPermission
      ? await updatePermission(editingPermission.id, form)
      : await createPermission(form);

    setSaving(false);

    if (!result.permission) {
      setError(result.error ?? "Unable to save permission.");
      return;
    }

    setSuccess(editingPermission ? "Permission updated." : "Permission created.");
    resetForm();
    await loadPermissions();
  };

  const handleDelete = async (permission: Permission) => {
    if (!window.confirm(`Delete ${permission.name}?`)) return;
    setError(null);
    setSuccess(null);
    const result = await deletePermission(permission.id);

    if (!result.success) {
      setError(result.error ?? "Unable to delete permission.");
      return;
    }

    setSuccess("Permission deleted.");
    await loadPermissions();
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="rbac-page">
          <section className="rbac-header">
            <div>
              <p className="eyebrow">Administration</p>
              <h1>Permissions</h1>
              <p>Maintain system capabilities used by roles and access checks.</p>
            </div>
            <div className="rbac-summary-grid">
              <span><strong>{summary.total}</strong><small>Total</small></span>
              <span><strong>{summary.assigned}</strong><small>Assigned</small></span>
              <span><strong>{summary.protected}</strong><small>Protected</small></span>
            </div>
          </section>

          <section className="rbac-layout">
            <form className="setup-form rbac-form" onSubmit={handleSubmit}>
              <div className="panel-title">
                <div>
                  <h2>{editingPermission ? "Edit Permission" : "Add Permission"}</h2>
                  <p>Use module.action naming, for example patients.read.</p>
                </div>
                <FiKey />
              </div>

              <label>
                Permission name
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="module.action"
                  required
                  disabled={!!editingPermission && protectedPermissionNames.has(editingPermission.name)}
                />
              </label>
              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="What this permission allows"
                  rows={4}
                />
              </label>

              {error && <p className="registration-error">{error}</p>}
              {success && <p className="security-success">{success}</p>}

              <div className="setup-actions">
                {editingPermission && <button type="button" className="icon-text-btn" onClick={resetForm}>Cancel</button>}
                <button className="registration-submit" type="submit" disabled={saving || !canWrite}>
                  {saving ? "Saving..." : editingPermission ? "Save Permission" : "Create Permission"}
                  <FiSave />
                </button>
              </div>
            </form>

            <section className="setup-list-panel">
              <div className="setup-list-header">
                <div className="patient-search-control">
                  <FiSearch />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search permissions" />
                </div>
                <button type="button" className="icon-text-btn" onClick={loadPermissions}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {loading && <p className="muted-text">Loading permissions...</p>}
              {!loading && filteredPermissions.length === 0 && <p className="muted-text">No permissions found.</p>}

              <div className="rbac-permission-groups">
                {Object.entries(groupedPermissions).map(([group, items]) => (
                  <section key={group} className="rbac-permission-group">
                    <h3>{group}</h3>
                    <div className="rbac-list">
                      {items.map((permission) => (
                        <article className="rbac-row-card" key={permission.id}>
                          <div className="rbac-row-main">
                            <span className="rbac-avatar"><FiKey /></span>
                            <div>
                              <strong>{permission.name}</strong>
                              <p>{permission.description || "No description added."}</p>
                              <small>{permission.rolesUsing ?? 0} role(s) using this</small>
                            </div>
                          </div>
                          <div className="patient-row-actions">
                            {canWrite && <button type="button" className="icon-text-btn" onClick={() => startEdit(permission)}><FiEdit3 />Edit</button>}
                            {canDelete && !protectedPermissionNames.has(permission.name) && (
                              <button type="button" className="icon-text-btn danger" onClick={() => handleDelete(permission)}>
                                <FiTrash2 />
                                Delete
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
