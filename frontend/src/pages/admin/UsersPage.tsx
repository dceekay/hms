import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiCopy,
  FiEdit3,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSlash,
  FiTrash2,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import { getRoles } from "../../services/roleService";
import {
  activateUser,
  assignRolesToUser,
  createUserAccount,
  deactivateUser,
  deleteUser,
  getUsers,
  updateUserAccount,
} from "../../services/userService";
import { fetchHospitalServices } from "../../services/setupService";
import { AppUser, Role } from "../../types/rbac";
import { HospitalService } from "../../types/setup";
import { useAuthStore } from "../../store/authStore";

type UserForm = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  serviceAreaId: string;
  roleIds: string[];
};

const emptyForm: UserForm = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  serviceAreaId: "",
  roleIds: [],
};

function roleNames(user: AppUser) {
  return user.roles?.map((entry) => entry.role.name).join(", ") || "No role";
}

function generatePassword() {
  const stamp = Math.random().toString(36).slice(2, 7);
  return `MDS-Staff-${stamp}@26`;
}

function accountMessage(user: AppUser, password: string) {
  return [
    `Hello ${user.firstName} ${user.lastName},`,
    "",
    "Your MDS Hospital staff portal account has been created.",
    "",
    `Username: ${user.username}`,
    `Password: ${password}`,
    "Login: http://127.0.0.1:5173/login",
  ].join("\n");
}

export default function UsersPage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("users.create");
  const canUpdate = permissions.includes("users.update");
  const canDelete = permissions.includes("users.delete");
  const canManageRoles = permissions.includes("users.manage_roles");

  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [services, setServices] = useState<HospitalService[]>([]);
  const [form, setForm] = useState<UserForm>({ ...emptyForm, password: generatePassword() });
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [createdUser, setCreatedUser] = useState<AppUser | null>(null);
  const [createdPassword, setCreatedPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      inactive: users.filter((user) => !user.isActive).length,
      admins: users.filter((user) => user.roles?.some((entry) => entry.role.name === "Super Admin")).length,
    }),
    [users]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const isActive = statusFilter === "all" ? undefined : statusFilter === "active";
    const [usersResult, rolesResult, servicesResult] = await Promise.all([
      getUsers(search, isActive),
      getRoles(),
      fetchHospitalServices(),
    ]);
    setLoading(false);

    if (!usersResult || !rolesResult || !servicesResult.services) {
      setError("Unable to load users, roles, and services.");
      return;
    }

    setUsers(usersResult);
    setRoles(rolesResult);
    setServices(servicesResult.services);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateField = (field: keyof UserForm, value: string | string[]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleRole = (roleId: string) => {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }));
  };

  const resetForm = () => {
    setEditingUser(null);
    setCreatedUser(null);
    setCreatedPassword("");
    setForm({ ...emptyForm, password: generatePassword() });
    setError(null);
    setSuccess(null);
  };

  const startEdit = (user: AppUser) => {
    setEditingUser(user);
    setCreatedUser(null);
    setCreatedPassword("");
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      password: "",
      phone: user.phone ?? "",
      serviceAreaId: user.serviceAreaId ?? "",
      roleIds: user.roles?.map((entry) => entry.role.id) ?? [],
    });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (editingUser) {
      const updateResult = await updateUserAccount(editingUser.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        serviceAreaId: form.serviceAreaId || null,
      });

      if (!updateResult.user) {
        setSaving(false);
        setError(updateResult.error ?? "Unable to update user.");
        return;
      }

      if (canManageRoles && editingUser.id !== currentUserId) {
        const rolesResult = await assignRolesToUser(editingUser.id, form.roleIds);
        if (!rolesResult.user) {
          setSaving(false);
          setError(rolesResult.error ?? "User details saved, but roles were not updated.");
          return;
        }
      }

      setSaving(false);
      resetForm();
      setSuccess("User updated.");
      await loadData();
      return;
    }

    const createResult = await createUserAccount({
      ...form,
      serviceAreaId: form.serviceAreaId || null,
    });
    setSaving(false);

    if (!createResult.user) {
      setError(createResult.error ?? "Unable to create user.");
      return;
    }

    setCreatedUser(createResult.user);
    setCreatedPassword(form.password);
    setSuccess("User account created. Copy the login details if needed.");
    setForm({ ...emptyForm, password: generatePassword() });
    await loadData();
  };

  const copyLogin = async () => {
    if (!createdUser) return;
    await navigator.clipboard.writeText(accountMessage(createdUser, createdPassword));
    setSuccess("Login message copied.");
  };

  const handleActiveToggle = async (user: AppUser) => {
    if (user.id === currentUserId) {
      setError("You cannot deactivate your own account.");
      return;
    }

    const updated = user.isActive ? await deactivateUser(user.id) : await activateUser(user.id);
    if (!updated) {
      setError("Unable to update user status.");
      return;
    }

    setSuccess(user.isActive ? "User deactivated." : "User activated.");
    await loadData();
  };

  const handleDelete = async (user: AppUser) => {
    if (user.id === currentUserId) {
      setError("You cannot delete your own account.");
      return;
    }

    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}?`)) return;
    const removed = await deleteUser(user.id);

    if (!removed) {
      setError("Unable to delete user.");
      return;
    }

    setSuccess("User deleted.");
    await loadData();
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="rbac-page">
          <section className="rbac-header">
            <div>
              <p className="eyebrow">Administration</p>
              <h1>Users</h1>
              <p>Create staff access, assign roles, and manage account status.</p>
            </div>
            <div className="rbac-summary-grid">
              <span><strong>{summary.total}</strong><small>Total</small></span>
              <span><strong>{summary.active}</strong><small>Active</small></span>
              <span><strong>{summary.inactive}</strong><small>Inactive</small></span>
              <span><strong>{summary.admins}</strong><small>Admins</small></span>
            </div>
          </section>

          <section className="rbac-layout">
            <form className="setup-form rbac-form" onSubmit={handleSubmit}>
              <div className="panel-title">
                <div>
                  <h2>{editingUser ? "Edit User" : "Add User"}</h2>
                  <p>{editingUser ? editingUser.username : "Create staff login details."}</p>
                </div>
                <FiUserPlus />
              </div>

              <div className="form-grid">
                <label>First name<input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required /></label>
                <label>Last name<input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required /></label>
                <label>Email<input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required /></label>
                <label>Phone<input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></label>
                <label>
                  Service area
                  <select value={form.serviceAreaId} onChange={(event) => updateField("serviceAreaId", event.target.value)}>
                    <option value="">No service area</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Username<input value={form.username} onChange={(event) => updateField("username", event.target.value)} required disabled={!!editingUser} /></label>
                {!editingUser && (
                  <label>
                    Password
                    <span className="credential-input-row">
                      <input value={form.password} onChange={(event) => updateField("password", event.target.value)} required />
                      <button className="icon-text-btn" type="button" onClick={() => updateField("password", generatePassword())}>Generate</button>
                    </span>
                  </label>
                )}
              </div>

              <div className="rbac-check-list">
                {roles.map((role) => (
                  <label key={role.id} className="rbac-check">
                    <input
                      type="checkbox"
                      checked={form.roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      disabled={editingUser?.id === currentUserId}
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>

              {createdUser && (
                <div className="rbac-copy-box">
                  <code>{accountMessage(createdUser, createdPassword)}</code>
                  <button type="button" className="icon-text-btn" onClick={copyLogin}>
                    <FiCopy />
                    Copy login
                  </button>
                </div>
              )}

              {error && <p className="registration-error">{error}</p>}
              {success && <p className="security-success">{success}</p>}

              <div className="setup-actions">
                {editingUser && <button type="button" className="icon-text-btn" onClick={resetForm}>Cancel</button>}
                <button className="registration-submit" type="submit" disabled={saving || (editingUser ? !canUpdate : !canCreate)}>
                  {saving ? "Saving..." : editingUser ? "Save User" : "Create User"}
                  <FiSave />
                </button>
              </div>
            </form>

            <section className="setup-list-panel">
              <div className="setup-list-header">
                <div className="patient-search-control">
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadData();
                    }}
                    placeholder="Search users"
                  />
                </div>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as any)}>
                  <option value="all">All users</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button type="button" className="icon-text-btn" onClick={loadData}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {loading && <p className="muted-text">Loading users...</p>}
              {!loading && users.length === 0 && <p className="muted-text">No users found.</p>}

              <div className="rbac-list">
                {users.map((user) => (
                  <article className="rbac-row-card" key={user.id}>
                    <div className="rbac-row-main">
                      <span className="rbac-avatar">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span>
                      <div>
                        <strong>{user.firstName} {user.lastName}</strong>
                        <p>{user.username} | {user.email}</p>
                        <small>
                          {roleNames(user)}
                          {user.serviceArea?.name ? ` | ${user.serviceArea.name}` : ""}
                        </small>
                      </div>
                    </div>
                    <span className={`patient-status-badge ${user.isActive ? "active" : "inactive"}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                    <div className="patient-row-actions">
                      {canUpdate && <button type="button" className="icon-text-btn" onClick={() => startEdit(user)}><FiEdit3 />Edit</button>}
                      {canUpdate && (
                        <button type="button" className="icon-text-btn" onClick={() => handleActiveToggle(user)}>
                          {user.isActive ? <FiSlash /> : <FiCheckCircle />}
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                      {canDelete && <button type="button" className="icon-text-btn danger" onClick={() => handleDelete(user)}><FiTrash2 />Delete</button>}
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

