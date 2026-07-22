import { useEffect, useState } from "react";
import { NavBar } from "../../components/NavBar";
import { useAuthStore } from "../../store/authStore";
import {
  activateUser,
  assignRolesToUser,
  deactivateUser,
  deleteUser,
  getUsers,
} from "../../services/userService";
import { getRoles } from "../../services/roleService";
import { AppUser, Role } from "../../types/rbac";

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoleIds, setEditingRoleIds] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const permissionsForUser = useAuthStore((state) => state.user?.permissions ?? []);
  const canManageRoles = permissionsForUser.includes("users.manage_roles");
  const canWrite = permissionsForUser.includes("users.write");
  const canDelete = permissionsForUser.includes("users.delete");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [usersData, rolesData] = await Promise.all([getUsers(), getRoles()]);

    if (usersData) setUsers(usersData);
    if (rolesData) setRoles(rolesData);

    setLoading(false);
  }

  function startEditingRoles(user: AppUser) {
    setEditingUserId(user.id);
    setEditingRoleIds(user.roles?.map((userRole) => userRole.role.id) ?? []);
  }

  function toggleRole(id: string) {
    setEditingRoleIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]
    );
  }

  async function saveEditingRoles() {
    if (!editingUserId) return;

    setSavingRoles(true);
    const result = await assignRolesToUser(editingUserId, editingRoleIds);
    setSavingRoles(false);

    if (result) {
      setEditingUserId(null);
      loadAll();
    } else {
      alert("Failed to update roles");
    }
  }

  async function handleToggleActive(user: AppUser) {
    const result = user.isActive ? await deactivateUser(user.id) : await activateUser(user.id);

    if (result) {
      loadAll();
    } else {
      alert("Failed to update user status");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user?")) return;

    const ok = await deleteUser(id);
    if (ok) {
      loadAll();
    } else {
      alert("Failed to delete user");
    }
  }

  return (
    <>
      <NavBar />
      <main className="page-container">
        <div className="card">
          <h1>Users</h1>

          {loading && <p>Loading users...</p>}

          {!loading && (
            <table className="table" style={{ marginTop: 20 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td>{user.isActive ? "Active" : "Inactive"}</td>
                    <td>{user.roles?.map((userRole) => userRole.role.name).join(", ") || "-"}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {canManageRoles && <button onClick={() => startEditingRoles(user)}>Edit Roles</button>}
                      {canWrite && (
                        <button onClick={() => handleToggleActive(user)}>
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                      {canDelete && <button onClick={() => handleDelete(user.id)}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {editingUserId && (
            <div className="info-block">
              <h3>Edit Roles</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {roles.map((role) => (
                  <label key={role.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={editingRoleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
                <button onClick={saveEditingRoles} disabled={savingRoles}>
                  {savingRoles ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditingUserId(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
