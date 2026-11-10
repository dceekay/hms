import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiCopy, FiRefreshCw, FiSave, FiSearch, FiSend, FiUserPlus, FiX } from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import {
  CreateDoctorAccountValues,
  DoctorType,
  createDoctorAccount,
  getUsers,
} from "../../services/userService";
import { fetchHospitalServices } from "../../services/setupService";
import { AppUser } from "../../types/rbac";
import { HospitalService } from "../../types/setup";
import { getAppUrl } from "../../utils/appUrl";

const doctorTypeLabels: Record<DoctorType, string> = {
  medical_doctor: "Medical Doctor",
  visiting_consultant: "Visiting Consultant",
  visiting_specialist: "Visiting Specialist",
};

const emptyForm: CreateDoctorAccountValues = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  serviceAreaId: "",
  doctorType: "medical_doctor",
  specialty: "",
};

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function generatePassword(phone = "") {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : "MDS12345";
}

function doctorAccountMessage(user: AppUser, password: string) {
  const type = user.doctorProfile?.doctorType
    ? doctorTypeLabels[user.doctorProfile.doctorType]
    : "Doctor";

  return [
    `Hello Dr. ${user.firstName} ${user.lastName},`,
    "",
    "Your MDS Hospital staff portal account has been created.",
    "",
    `Role: ${type}`,
    `Username: ${user.username}`,
    `Password: ${password}`,
    `Login: ${getAppUrl("/login")}`,
    "",
    "Please change your password from Account Settings after your first login.",
  ].join("\n");
}

export default function DoctorsPage() {
  const [form, setForm] = useState<CreateDoctorAccountValues>({ ...emptyForm, password: generatePassword() });
  const [doctors, setDoctors] = useState<AppUser[]>([]);
  const [services, setServices] = useState<HospitalService[]>([]);
  const [createdUser, setCreatedUser] = useState<AppUser | null>(null);
  const [createdPassword, setCreatedPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const loginMessage = useMemo(
    () => (createdUser ? doctorAccountMessage(createdUser, createdPassword) : ""),
    [createdUser, createdPassword]
  );

  const loadDoctors = async () => {
    setLoading(true);
    const [users, serviceResult] = await Promise.all([
      getUsers(),
      fetchHospitalServices(),
    ]);
    setLoading(false);

    if (!users) return;
    if (serviceResult.services) {
      setServices(serviceResult.services);
    }

    setDoctors(
      users.filter((user) => user.roles?.some((entry) => entry.role.name === "Doctor"))
    );
  };

  useEffect(() => {
    void loadDoctors();
  }, []);

  const updateField = (field: keyof CreateDoctorAccountValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updatePhone = (value: string) => {
    setForm((current) => {
      const currentAutoPassword = generatePassword(current.phone);
      const shouldRefreshPassword =
        !current.password || current.password === currentAutoPassword;

      return {
        ...current,
        phone: value,
        password: shouldRefreshPassword ? generatePassword(value) : current.password,
      };
    });
  };

  const suggestUsername = () => {
    const base = slug(`${form.firstName}.${form.lastName}`) || "doctor";
    updateField("username", `dr.${base}`);
  };

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setMessage("Copied to clipboard.");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage("");
    setCreatedUser(null);

    const { user, error: createError } = await createDoctorAccount({
      ...form,
      serviceAreaId: form.serviceAreaId || null,
    });
    setSaving(false);

    if (!user) {
      setError(createError ?? "Unable to create doctor account.");
      return;
    }

    setCreatedUser(user);
    setCreatedPassword(form.password);
    setMessage("Doctor account created. Copy the login details below.");
    setForm({ ...emptyForm, password: generatePassword() });
    await loadDoctors();
  };

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (typeFilter !== "all" && doc.doctorProfile?.doctorType !== typeFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${doc.firstName} ${doc.lastName}`.toLowerCase();
        const username = (doc.username || "").toLowerCase();
        const specialty = (doc.doctorProfile?.specialty || "").toLowerCase();
        return name.includes(q) || username.includes(q) || specialty.includes(q);
      }
      return true;
    });
  }, [doctors, typeFilter, search]);

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="setup-page doctor-admin-page">
          <section className="setup-hero">
            <div>
              <p className="eyebrow">Super Admin</p>
              <h1>Doctor Accounts</h1>
              <p>Create doctor portal access, assign doctor category, and manage specialist credentials.</p>
            </div>
            <div className="setup-summary">
              <FiUserPlus />
              <strong>{doctors.length}</strong>
              <span>Active Doctors</span>
            </div>
          </section>

          {message && !isModalOpen && (
            <p className="security-success" style={{ margin: "0.5rem 0" }}>{message}</p>
          )}

          {/* FULL WIDTH DOCTORS TABLE */}
          <section className="hms-table-view">
            <div className="table-topbar">
              <div className="table-topbar-left">
                <div className="patient-search-control" style={{ minWidth: "260px" }}>
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search doctor by name, username, or specialty..."
                  />
                  {search && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setSearch("")}
                      title="Clear search"
                    >
                      <FiX />
                    </button>
                  )}
                </div>

                <div className="table-filter-pills">
                  <button
                    type="button"
                    className={`table-filter-pill ${typeFilter === "all" ? "active" : ""}`}
                    onClick={() => setTypeFilter("all")}
                  >
                    All ({doctors.length})
                  </button>
                  {Object.keys(doctorTypeLabels).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`table-filter-pill ${typeFilter === t ? "active" : ""}`}
                      onClick={() => setTypeFilter(t)}
                    >
                      {doctorTypeLabels[t as DoctorType]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="table-topbar-right">
                <button type="button" className="icon-text-btn" onClick={loadDoctors}>
                  <FiRefreshCw />
                  Refresh
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setCreatedUser(null);
                    setCreatedPassword("");
                    setError(null);
                    setMessage("");
                    setIsModalOpen(true);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FiUserPlus /> Add New Doctor
                </button>
              </div>
            </div>

            {loading && <p className="muted-text" style={{ padding: "1.5rem" }}>Loading doctors...</p>}
            {!loading && filteredDoctors.length === 0 && (
              <p className="muted-text" style={{ padding: "1.5rem" }}>No doctors found.</p>
            )}

            {!loading && filteredDoctors.length > 0 && (
              <div className="table-scroll-container">
                <table className="hms-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "28%" }}>Doctor</th>
                      <th style={{ width: "24%" }}>Category & Specialty</th>
                      <th style={{ width: "20%" }}>Service Area / Clinic</th>
                      <th style={{ width: "16%" }}>Phone Number</th>
                      <th style={{ width: "12%" }}>Email Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.map((doctor) => (
                      <tr key={doctor.id}>
                        <td>
                          <div className="cell-primary" style={{ fontSize: "0.95rem" }}>
                            🩺 Dr. {doctor.firstName} {doctor.lastName}
                          </div>
                          <div className="cell-muted">@{doctor.username}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {doctor.doctorProfile?.doctorType
                              ? doctorTypeLabels[doctor.doctorProfile.doctorType]
                              : "Medical Doctor"}
                          </div>
                          {doctor.doctorProfile?.specialty && (
                            <div className="cell-muted">{doctor.doctorProfile.specialty}</div>
                          )}
                        </td>
                        <td>
                          {doctor.serviceArea?.name ? (
                            <span className="pill-badge" style={{ fontSize: "0.78rem" }}>
                              {doctor.serviceArea.name}
                            </span>
                          ) : (
                            <span className="cell-muted">All Departments</span>
                          )}
                        </td>
                        <td>
                          <span>{doctor.phone || "—"}</span>
                        </td>
                        <td>
                          <span className="cell-muted">{doctor.email}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* CREATE DOCTOR MODAL */}
          {isModalOpen && (
            <div className="hms-modal-overlay" role="dialog" aria-modal="true">
              <div className="hms-modal-window wide">
                <div className="hms-modal-header">
                  <div>
                    <h2>Create Doctor Account</h2>
                    <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                      Assign doctor category, specialty, and login credentials.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="hms-modal-close-btn"
                    onClick={() => {
                      setIsModalOpen(false);
                      setCreatedUser(null);
                    }}
                    title="Close"
                  >
                    <FiX />
                  </button>
                </div>

                {error && <p className="registration-error">{error}</p>}
                {message && <p className="security-success">{message}</p>}

                {createdUser ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="credential-card">
                      <span>
                        <small>Username</small>
                        <strong>{createdUser.username}</strong>
                      </span>
                      <span>
                        <small>Password</small>
                        <strong>{createdPassword}</strong>
                      </span>
                    </div>
                    <textarea className="doctor-message-box" readOnly value={loginMessage} rows={8} />
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
                      <button type="button" className="btn btn-primary" onClick={() => copyText(loginMessage)}>
                        <FiCopy /> Copy Login Message
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>
                        Doctor Category
                      </label>
                      <div className="doctor-type-selector">
                        {(Object.keys(doctorTypeLabels) as DoctorType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            className={`category-option ${form.doctorType === type ? "active" : ""}`}
                            onClick={() => updateField("doctorType", type)}
                          >
                            <strong>{doctorTypeLabels[type]}</strong>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-grid">
                      <label>
                        First name
                        <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} required />
                      </label>
                      <label>
                        Last name
                        <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} required />
                      </label>
                      <label>
                        Email
                        <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
                      </label>
                      <label>
                        Phone
                        <input value={form.phone} onChange={(event) => updatePhone(event.target.value)} />
                      </label>
                      <label>
                        Service area
                        <select value={form.serviceAreaId ?? ""} onChange={(event) => updateField("serviceAreaId", event.target.value)}>
                          <option value="">No service area</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Specialty
                        <input value={form.specialty} onChange={(event) => updateField("specialty", event.target.value)} placeholder="e.g. Cardiology, Surgery" />
                      </label>
                      <label>
                        Username
                        <span className="credential-input-row">
                          <input value={form.username} onChange={(event) => updateField("username", event.target.value)} required />
                          <button type="button" className="icon-text-btn" onClick={suggestUsername}>
                            Generate
                          </button>
                        </span>
                      </label>
                      <label>
                        Password
                        <span className="credential-input-row">
                          <input
                            value={form.password}
                            onChange={(event) => updateField("password", event.target.value)}
                            placeholder="Uses phone number by default"
                            required
                          />
                          <button type="button" className="icon-text-btn" onClick={() => updateField("password", generatePassword(form.phone))}>
                            Use phone
                          </button>
                        </span>
                      </label>
                    </div>

                    <div className="setup-actions" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <button type="button" className="icon-text-btn" onClick={() => setIsModalOpen(false)}>
                        Cancel
                      </button>
                      <button className="registration-submit" type="submit" disabled={saving}>
                        {saving ? "Creating..." : "Create Doctor Account"}
                        <FiSave />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
