import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  FiCamera,
  FiCheckCircle,
  FiCopy,
  FiEdit3,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiShield,
  FiSlash,
  FiTrash2,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import mdsLogo from "../../assets/optimized/logo.png";
import { compressImageToWebp } from "../../utils/imageCompression";
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
import { getAppUrl } from "../../utils/appUrl";

type UserForm = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  photoUrl: string;
  photoDataUrl: string;
  photoMimeType: "image/webp" | "image/jpeg" | "image/png" | "";
  photoSizeBytes: number | null;
  photoWidth: number | null;
  photoHeight: number | null;
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
  photoUrl: "",
  photoDataUrl: "",
  photoMimeType: "",
  photoSizeBytes: null,
  photoWidth: null,
  photoHeight: null,
  serviceAreaId: "",
  roleIds: [],
};

function roleNames(user: AppUser) {
  return user.roles?.map((entry) => entry.role.name).join(", ") || "No role";
}

function generatePassword(phone = "") {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : "MDS12345";
}

function accountMessage(user: AppUser, password: string) {
  return [
    `Hello ${user.firstName} ${user.lastName},`,
    "",
    "Your MDS Hospital staff portal account has been created.",
    "",
    `Username: ${user.username}`,
    `Password: ${password}`,
    `Login: ${getAppUrl("/login")}`,
    "",
    "Please change your password from Account Settings after your first login.",
  ].join("\n");
}

function staffId(user: AppUser) {
  const issueDate = getStaffIssueDate(user);
  const year = issueDate.getFullYear();
  const code = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `MDS${year}${code}`;
}

function staffFullName(user: AppUser) {
  return `${user.firstName} ${user.lastName}`;
}

function getStaffIssueDate(user: AppUser) {
  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
  return Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
}

function getStaffExpiryDate(user: AppUser) {
  const expiresAt = new Date(getStaffIssueDate(user));
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  return expiresAt;
}

function formatIdDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function staffInitials(user: AppUser) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || "ST";
}

function staffPhotoSource(user: AppUser) {
  return user.photoDataUrl || user.photoUrl || "";
}

function getStaffVerifyUrl(user: AppUser) {
  return getAppUrl(`/verify/staff/${user.id}`);
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
  const [idCardUser, setIdCardUser] = useState<AppUser | null>(null);
  const [staffQrSvg, setStaffQrSvg] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  useEffect(() => {
    let active = true;
    setStaffQrSvg("");

    if (!idCardUser) {
      return () => {
        active = false;
      };
    }

    QRCode.toString(getStaffVerifyUrl(idCardUser), {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
      color: {
        dark: "#020617",
        light: "#ffffff",
      },
    })
      .then((qrSvg) => {
        if (active) setStaffQrSvg(qrSvg);
      })
      .catch(() => {
        if (active) setStaffQrSvg("");
      });

    return () => {
      active = false;
    };
  }, [idCardUser]);

  const updateField = (field: keyof UserForm, value: string | string[]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updatePhone = (value: string) => {
    setForm((current) => {
      const currentAutoPassword = generatePassword(current.phone);
      const shouldRefreshPassword =
        !editingUser &&
        (!current.password || current.password === currentAutoPassword);

      return {
        ...current,
        phone: value,
        password: shouldRefreshPassword ? generatePassword(value) : current.password,
      };
    });
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
      photoUrl: user.photoUrl ?? "",
      photoDataUrl: user.photoDataUrl ?? "",
      photoMimeType: user.photoMimeType ?? "",
      photoSizeBytes: user.photoSizeBytes ?? null,
      photoWidth: user.photoWidth ?? null,
      photoHeight: user.photoHeight ?? null,
      serviceAreaId: user.serviceAreaId ?? "",
      roleIds: user.roles?.map((entry) => entry.role.id) ?? [],
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
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
        username: form.username,
        ...(form.password ? { password: form.password } : {}),
        phone: form.phone,
        serviceAreaId: form.serviceAreaId || null,
        photoUrl: form.photoUrl || null,
        photoDataUrl: form.photoDataUrl || null,
        photoMimeType: form.photoMimeType || null,
        photoSizeBytes: form.photoSizeBytes,
        photoWidth: form.photoWidth,
        photoHeight: form.photoHeight,
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
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      username: form.username,
      password: form.password,
      phone: form.phone,
      serviceAreaId: form.serviceAreaId || null,
      photoUrl: form.photoUrl || null,
      photoDataUrl: form.photoDataUrl || null,
      photoMimeType: form.photoMimeType || null,
      photoSizeBytes: form.photoSizeBytes,
      photoWidth: form.photoWidth,
      photoHeight: form.photoHeight,
      roleIds: form.roleIds,
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

  const handlePhotoChange = async (file?: File | null) => {
    if (!file) return;

    try {
      const photo = await compressImageToWebp(file, 520, 0.76);
      setForm((current) => ({
        ...current,
        photoUrl: "",
        photoDataUrl: photo.dataUrl,
        photoMimeType: photo.mimeType,
        photoSizeBytes: photo.sizeBytes,
        photoWidth: photo.width,
        photoHeight: photo.height,
      }));
      setSuccess("Staff photo prepared.");
    } catch (photoError) {
      console.error(photoError);
      setError("Unable to prepare staff photo. Try a smaller image.");
    }
  };

  const clearPhoto = () => {
    setForm((current) => ({
      ...current,
      photoUrl: "",
      photoDataUrl: "",
      photoMimeType: "",
      photoSizeBytes: null,
      photoWidth: null,
      photoHeight: null,
    }));
  };

  const printEmployeeId = (user: AppUser) => {
    setIdCardUser(user);
    window.setTimeout(() => window.print(), 120);
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

          {error && !isModalOpen && <p className="registration-error" style={{ margin: "0.5rem 0" }}>{error}</p>}
          {success && !isModalOpen && <p className="security-success" style={{ margin: "0.5rem 0" }}>{success}</p>}

          {/* FULL WIDTH USERS TABLE */}
          <section className="hms-table-view">
            <div className="table-topbar">
              <div className="table-topbar-left">
                <div className="patient-search-control" style={{ minWidth: "260px" }}>
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadData();
                    }}
                    placeholder="Search users by name, username, or email..."
                  />
                  {search && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => {
                        setSearch("");
                        void loadData();
                      }}
                      title="Clear search"
                    >
                      <FiX />
                    </button>
                  )}
                </div>

                <div className="table-filter-pills">
                  <button
                    type="button"
                    className={`table-filter-pill ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    All ({summary.total})
                  </button>
                  <button
                    type="button"
                    className={`table-filter-pill ${statusFilter === "active" ? "active" : ""}`}
                    onClick={() => setStatusFilter("active")}
                  >
                    Active ({summary.active})
                  </button>
                  <button
                    type="button"
                    className={`table-filter-pill ${statusFilter === "inactive" ? "active" : ""}`}
                    onClick={() => setStatusFilter("inactive")}
                  >
                    Inactive ({summary.inactive})
                  </button>
                </div>
              </div>

              <div className="table-topbar-right">
                <button type="button" className="icon-text-btn" onClick={loadData}>
                  <FiRefreshCw />
                  Refresh
                </button>
                {canCreate && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FiPlus /> Add Staff User
                  </button>
                )}
              </div>
            </div>

            {loading && <p className="muted-text" style={{ padding: "1.5rem" }}>Loading users...</p>}
            {!loading && users.length === 0 && <p className="muted-text" style={{ padding: "1.5rem" }}>No users found.</p>}

            {!loading && users.length > 0 && (
              <div className="staff-list">
                <div className="staff-list-head">
                  <span>Staff Member</span>
                  <span>Roles &amp; Department</span>
                  <span>Contact</span>
                  <span>Status</span>
                  <span className="staff-list-head-actions">Actions</span>
                </div>

                {users.map((user) => (
                  <article key={user.id} className={`staff-row ${user.isActive ? "" : "is-inactive"}`}>
                    <div className="staff-cell staff-identity">
                      <span className="rbac-avatar staff-avatar">
                        {staffPhotoSource(user) ? (
                          <img src={staffPhotoSource(user)} alt="" />
                        ) : (
                          staffInitials(user)
                        )}
                      </span>
                      <div className="staff-text">
                        <strong title={staffFullName(user)}>{staffFullName(user)}</strong>
                        <small title={`@${user.username}`}>@{user.username}</small>
                      </div>
                    </div>

                    <div className="staff-cell staff-text">
                      <strong title={roleNames(user) || "Standard Staff"}>{roleNames(user) || "Standard Staff"}</strong>
                      <small>{user.serviceArea?.name || "All departments"}</small>
                    </div>

                    <div className="staff-cell staff-text">
                      <span title={user.phone || ""}>{user.phone || "—"}</span>
                      <small title={user.email}>{user.email}</small>
                    </div>

                    <div className="staff-cell">
                      <span className={`patient-status-badge ${user.isActive ? "active" : "inactive"}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="staff-actions">
                      {canUpdate && (
                        <button
                          type="button"
                          className="table-action-btn primary"
                          onClick={() => startEdit(user)}
                          title="Edit staff user"
                        >
                          <FiEdit3 />
                          <span>Edit</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => setIdCardUser(user)}
                        title="Print staff ID card"
                      >
                        <FiShield />
                        <span>ID Card</span>
                      </button>
                      {canUpdate && (
                        <button
                          type="button"
                          className={`table-action-btn ${user.isActive ? "warning" : "success"}`}
                          onClick={() => handleActiveToggle(user)}
                          title={user.isActive ? "Deactivate user account" : "Activate user account"}
                        >
                          {user.isActive ? <FiSlash /> : <FiCheckCircle />}
                          <span>{user.isActive ? "Disable" : "Enable"}</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="table-action-btn danger"
                          onClick={() => handleDelete(user)}
                          title="Delete user"
                        >
                          <FiTrash2 />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ADD / EDIT USER MODAL */}
          {isModalOpen && (
            <div className="hms-modal-overlay" role="dialog" aria-modal="true">
              <div className="hms-modal-window wide">
                <div className="hms-modal-header">
                  <div>
                    <h2>{editingUser ? "Edit User Account" : "Add Staff User"}</h2>
                    <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                      {editingUser ? `@${editingUser.username}` : "Create staff login credentials and assign roles."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="hms-modal-close-btn"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    title="Close"
                  >
                    <FiX />
                  </button>
                </div>

                {error && <p className="registration-error">{error}</p>}
                {success && <p className="security-success">{success}</p>}

                {createdUser ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="rbac-copy-box">
                      <code>{accountMessage(createdUser, createdPassword)}</code>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setCreatedUser(null);
                          setIsModalOpen(false);
                        }}
                      >
                        Done
                      </button>
                      <button type="button" className="btn btn-primary" onClick={copyLogin}>
                        <FiCopy /> Copy Login Message
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div className="form-grid">
                      <label className="staff-photo-control">
                        Staff photo
                        <span className="staff-photo-row">
                          <span className="staff-photo-preview">
                            {form.photoDataUrl || form.photoUrl ? (
                              <img src={form.photoDataUrl || form.photoUrl} alt="Staff preview" />
                            ) : (
                              <FiCamera />
                            )}
                          </span>
                          <span className="staff-photo-actions">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(event) => void handlePhotoChange(event.target.files?.[0])}
                            />
                            {(form.photoDataUrl || form.photoUrl) && (
                              <button className="icon-text-btn" type="button" onClick={clearPhoto}>
                                Remove
                              </button>
                            )}
                          </span>
                        </span>
                      </label>
                      <label>First name<input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required /></label>
                      <label>Last name<input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required /></label>
                      <label>Email<input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required /></label>
                      <label>Phone<input value={form.phone} onChange={(event) => updatePhone(event.target.value)} /></label>
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
                      <label>Username<input value={form.username} onChange={(event) => updateField("username", event.target.value)} required /></label>
                      <label>
                        {editingUser ? "New password" : "Password"}
                        <span className="credential-input-row">
                          <input
                            value={form.password}
                            onChange={(event) => updateField("password", event.target.value)}
                            required={!editingUser}
                            placeholder={editingUser ? "Leave blank to keep current password" : "Uses phone number by default"}
                          />
                          <button className="icon-text-btn" type="button" onClick={() => updateField("password", generatePassword(form.phone))}>Use phone</button>
                        </span>
                      </label>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                        Assign Permissions & Roles
                      </label>
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
                    </div>

                    <div className="setup-actions" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <button
                        type="button"
                        className="icon-text-btn"
                        onClick={() => {
                          setIsModalOpen(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </button>
                      <button className="registration-submit" type="submit" disabled={saving || (editingUser ? !canUpdate : !canCreate)}>
                        {saving ? "Saving..." : editingUser ? "Save User" : "Create User"}
                        <FiSave />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {idCardUser && (
            <section className="patient-id-modal" role="dialog" aria-modal="true">
              <button className="patient-id-modal-backdrop" type="button" onClick={() => setIdCardUser(null)} />
              <div className="patient-id-modal-panel employee-id-modal-panel">
                <div className="modal-header">
                  <div>
                    <p className="eyebrow">Employee ID</p>
                    <h2>{staffFullName(idCardUser)}</h2>
                  </div>
                  <button className="icon-btn" type="button" onClick={() => setIdCardUser(null)}>
                    x
                  </button>
                </div>

                <div className="patient-id-print-area employee-id-print-area">
                  <article className="patient-id-card employee-id-card">
                    <div className="patient-id-brand">
                      <img src={mdsLogo} alt="MDS Hospital" />
                      <div>
                        <strong>MDS Hospital</strong>
                        <span>Staff Identification Card</span>
                      </div>
                      <em>Staff</em>
                    </div>

                    <div className="employee-id-body">
                      <div className="patient-id-photo employee-id-photo">
                        {staffPhotoSource(idCardUser) ? (
                          <img src={staffPhotoSource(idCardUser)} alt={staffFullName(idCardUser)} />
                        ) : (
                          <span>{staffInitials(idCardUser)}</span>
                        )}
                      </div>

                      <div className="patient-id-info">
                        <p>Employee name</p>
                        <h3>{staffFullName(idCardUser)}</h3>
                        <div className="patient-id-grid employee-id-primary-grid">
                          <span>
                            <small>Staff ID</small>
                            <strong>{staffId(idCardUser)}</strong>
                          </span>
                          <span>
                            <small>Service</small>
                            <strong>{idCardUser.serviceArea?.name || "General"}</strong>
                          </span>
                        </div>
                        <div className="patient-id-grid employee-id-date-grid">
                          <span>
                            <small>Issue Date</small>
                            <strong>{formatIdDate(getStaffIssueDate(idCardUser))}</strong>
                          </span>
                          <span>
                            <small>Expires</small>
                            <strong>{formatIdDate(getStaffExpiryDate(idCardUser))}</strong>
                          </span>
                        </div>
                        <div className="patient-id-insurance employee-id-role-strip">
                          <div>
                            <small>Role</small>
                            <strong>{roleNames(idCardUser)}</strong>
                          </div>
                          <div>
                            <small>Phone</small>
                            <strong>{idCardUser.phone || "Not provided"}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="patient-id-qr-block">
                        {staffQrSvg ? (
                          <>
                            <div
                              className="patient-qr-image"
                              aria-label={`Scannable employee verification code ${staffId(idCardUser)}`}
                              dangerouslySetInnerHTML={{ __html: staffQrSvg }}
                            />
                            <small>Scan to verify</small>
                          </>
                        ) : (
                          <div className="id-empty-qr">
                            <FiRefreshCw />
                            <span>Preparing QR</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="patient-id-footer">
                      <span>{staffId(idCardUser)}</span>
                      <small>Powered by CeekayX</small>
                    </div>
                  </article>
                </div>

                <div className="setup-actions">
                  <button type="button" className="icon-text-btn" onClick={() => printEmployeeId(idCardUser)}>
                    <FiPrinter />
                    Print ID
                  </button>
                  <button type="button" className="icon-text-btn" onClick={() => setIdCardUser(null)}>
                    Close
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}

