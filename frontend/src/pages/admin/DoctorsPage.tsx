import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiCopy, FiRefreshCw, FiSave, FiSend, FiUserPlus } from "react-icons/fi";
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

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="setup-page doctor-admin-page">
          <section className="setup-hero">
            <div>
              <p className="eyebrow">Super Admin</p>
              <h1>Doctor Accounts</h1>
              <p>Create doctor portal access, assign doctor category, and copy login details.</p>
            </div>
            <div className="setup-summary">
              <FiUserPlus />
              <strong>{doctors.length}</strong>
              <span>Doctors</span>
            </div>
          </section>

          <section className="doctor-admin-layout">
            <form className="setup-form doctor-account-form" onSubmit={handleSubmit}>
              <div className="panel-title">
                <div>
                  <h2>Add Doctor</h2>
                  <p>Doctor role is assigned automatically.</p>
                </div>
                <FiUserPlus />
              </div>

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
                  <input value={form.specialty} onChange={(event) => updateField("specialty", event.target.value)} />
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

              {error && <p className="registration-error">{error}</p>}
              {message && <p className="security-success">{message}</p>}

              <button className="registration-submit" type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Doctor Account"}
                <FiSave />
              </button>
            </form>

            <section className="setup-list-panel doctor-account-panel">
              <div className="panel-title">
                <div>
                  <h2>Login Details</h2>
                  <p>Copy this after account creation and send to the doctor.</p>
                </div>
                <FiSend />
              </div>

              {createdUser ? (
                <>
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
                  <textarea className="doctor-message-box" readOnly value={loginMessage} rows={10} />
                  <button type="button" className="registration-submit" onClick={() => copyText(loginMessage)}>
                    Copy Login Message
                    <FiCopy />
                  </button>
                </>
              ) : (
                <p className="muted-text">Create a doctor account to prepare the login message.</p>
              )}

              <div className="setup-list-header">
                <div>
                  <h2>Current Doctors ({doctors.length})</h2>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                    Medical officers and consulting specialists.
                  </p>
                </div>
                <button type="button" className="icon-text-btn" onClick={loadDoctors}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {loading && <p className="muted-text">Loading doctors...</p>}
              {!loading && doctors.length === 0 && <p className="muted-text">No doctors found.</p>}

              {!loading && doctors.length > 0 && (
                <div className="table-scroll-container">
                  <table className="hms-data-table">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Type / Specialty</th>
                        <th>Service Area</th>
                        <th>Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((doctor) => (
                        <tr key={doctor.id}>
                          <td>
                            <div className="cell-primary">
                              🩺 Dr. {doctor.firstName} {doctor.lastName}
                            </div>
                            <div className="cell-muted">@{doctor.username}</div>
                          </td>
                          <td>
                            <div>
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
                              <span className="pill-badge" style={{ fontSize: "0.75rem" }}>
                                {doctor.serviceArea.name}
                              </span>
                            ) : (
                              <span className="cell-muted">All areas</span>
                            )}
                          </td>
                          <td>
                            <div>{doctor.phone || "—"}</div>
                            <div className="cell-muted">{doctor.email}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
