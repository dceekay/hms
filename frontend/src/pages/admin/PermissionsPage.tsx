import { useEffect, useState } from "react";
import {
  getPermissions,
  createPermission,
  deletePermission,
} from "../../services/permissionService";
import { Permission } from "../../types/rbac";
import { NavBar } from "../../components/NavBar";
import { useAuthStore } from "../../store/authStore";

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const permissionsForUser = useAuthStore((state) => state.user?.permissions ?? []);
  const canWrite = permissionsForUser.includes("permissions.write");
  const canDelete = permissionsForUser.includes("permissions.delete");

  useEffect(() => {
    loadPermissions();
  }, []);

  async function loadPermissions() {
    setLoading(true);
    const data = await getPermissions();
    if (data) setPermissions(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!name.trim()) return;

    setCreating(true);
    const permission = await createPermission({ name, description: description || undefined });
    setCreating(false);

    if (permission) {
      setName("");
      setDescription("");
      loadPermissions();
    } else {
      alert("Failed to create permission (name may already exist)");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this permission?")) return;

    const ok = await deletePermission(id);
    if (ok) {
      loadPermissions();
    } else {
      alert("Failed to delete permission (it may still be used by a role)");
    }
  }

  if (loading) {
    return <h2>Loading permissions...</h2>;
  }

  return (
    <>
      <NavBar />
      <main className="page-container">
        <div className="card">
          <h1>Permissions</h1>

          {canWrite && (
            <div style={{ marginTop: 20, marginBottom: 30, display: "flex", gap: 10 }}>
              <input
                placeholder="e.g. patients.write"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <button onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "Create Permission"}
              </button>
            </div>
          )}

          <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.id}>
              <td>{permission.name}</td>
              <td>{permission.description}</td>
              <td>{canDelete && <button onClick={() => handleDelete(permission.id)}>Delete</button>}</td>
            </tr>
          ))}
        </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
