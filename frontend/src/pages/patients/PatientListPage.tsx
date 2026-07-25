import { FormEvent, useEffect, useState } from "react";
import { FiChevronDown, FiCreditCard, FiEdit3, FiRefreshCw, FiSave, FiSearch, FiSlash, FiUserCheck, FiX } from "react-icons/fi";
import { PatientIdCard } from "../../components/patients/PatientIdCard";
import { nigeriaStates } from "../../constants/nigeriaStates";
import AdminLayout from "../../layouts/AdminLayout";
import {
  convertInvestigationPatient,
  deactivatePatient,
  fetchPatientQr,
  fetchPatients,
  reactivatePatient,
  updatePatient,
} from "../../services/patients/patientService";
import { useAuthStore } from "../../store/authStore";
import { Patient, PatientFormValues, PatientQr } from "../../types/patient";

const categoryLabels: Record<string, string> = {
  new_patient: "New patient",
  investigation_patient: "Investigation",
  old_patient: "Old patient",
};

function formatCategory(category?: string) {
  return categoryLabels[category ?? "new_patient"] ?? "New patient";
}

function formatStatus(status?: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Active";
}

function dateToInput(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function cleanPayload(values: PatientFormValues) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === "" ? undefined : value])
  ) as PatientFormValues;
}

function patientToForm(patient: Patient): PatientFormValues {
  return {
    firstName: patient.firstName ?? "",
    lastName: patient.lastName ?? "",
    email: patient.email ?? "",
    phone: patient.phone ?? "",
    dateOfBirth: dateToInput(patient.dateOfBirth),
    gender: patient.gender as PatientFormValues["gender"],
    patientCategory: patient.patientCategory as PatientFormValues["patientCategory"],
    address: patient.address ?? "",
    city: patient.city ?? "",
    state: patient.state ?? "",
    country: patient.country ?? "Nigeria",
    emergencyContactName: patient.emergencyContactName ?? "",
    emergencyContactPhone: patient.emergencyContactPhone ?? "",
    emergencyContactRelationship: patient.emergencyContactRelationship ?? "",
    bloodGroup: patient.bloodGroup ?? "",
    genotype: patient.genotype ?? "",
    allergies: patient.allergies ?? "",
    insurancePolicyNumber: patient.insurancePolicyNumber ?? "",
    insuranceCoverageStatus: patient.insuranceCoverageStatus ?? "",
  };
}

export function PatientListPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canConvert = permissions.includes("patients.convert");
  const canReactivate = permissions.includes("patients.reactivate");
  const canUpdate = permissions.includes("patients.update");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedQr, setSelectedQr] = useState<PatientQr | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState<PatientFormValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const loadPatients = async (filters = { searchTerm: search, status: statusFilter, category: categoryFilter }) => {
    setLoading(true);
    setError(null);
    const response = await fetchPatients({
      search: filters.searchTerm,
      status: filters.status,
      patientCategory: filters.category,
    });
    if (!response) {
      setError("Unable to load patients. Please try again.");
    } else {
      setPatients(response);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPatients({ searchTerm: search, status: statusFilter, category: categoryFilter });
  }, [statusFilter, categoryFilter]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    loadPatients({ searchTerm: search, status: statusFilter, category: categoryFilter });
  };

  const clearSearch = () => {
    setSearch("");
    setStatusFilter("");
    setCategoryFilter("");
    loadPatients({ searchTerm: "", status: "", category: "" });
  };

  const handlePatientAction = async (
    patient: Patient,
    action: "convert" | "reactivate" | "deactivate"
  ) => {
    setError(null);

    const result =
      action === "convert"
        ? await convertInvestigationPatient(patient.id)
        : action === "reactivate"
          ? await reactivatePatient(patient.id)
          : await deactivatePatient(patient.id);

    if (!result) {
      setError("Unable to update patient. Please confirm your permission and try again.");
      return;
    }

    setPatients((current) => current.map((item) => (item.id === result.id ? result : item)));
    if (selectedPatient?.id === result.id) {
      setSelectedPatient(result);
    }
  };

  const handleViewIdCard = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedQr(null);
    setQrError(null);
    setLoadingQr(true);

    const qr = await fetchPatientQr(patient.id);
    setLoadingQr(false);

    if (!qr) {
      setQrError("Unable to load this patient's ID card.");
      return;
    }

    setSelectedQr(qr);
  };

  const openEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setEditForm(patientToForm(patient));
    setEditError(null);
  };

  const updateEditField = (field: keyof PatientFormValues, value: string) => {
    setEditForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSavePatient = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingPatient || !editForm) return;

    setSavingPatient(true);
    setEditError(null);
    const { patient, error: saveError } = await updatePatient(editingPatient.id, cleanPayload(editForm));
    setSavingPatient(false);

    if (!patient) {
      setEditError(saveError ?? "Unable to save patient changes.");
      return;
    }

    setPatients((current) => current.map((item) => (item.id === patient.id ? patient : item)));
    if (selectedPatient?.id === patient.id) {
      setSelectedPatient(patient);
    }
    setEditingPatient(null);
    setEditForm(null);
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="card">
          <div className="page-header">
            <div>
              <h1>Patients</h1>
              <p>Search by MRN, open patient ID cards, and confirm registered patient data.</p>
            </div>
          </div>

          <form className="patient-list-toolbar" onSubmit={handleSearch}>
            <label>
              Search patients
              <div className="patient-search-control">
                <FiSearch />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="MRN, QR code, name, phone, or policy number"
                />
              </div>
            </label>
            <label>
              Category
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">All categories</option>
                <option value="new_patient">New patients</option>
                <option value="investigation_patient">Investigation</option>
                <option value="old_patient">Old patients</option>
              </select>
            </label>
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deceased">Deceased</option>
              </select>
            </label>
            <button type="submit" className="icon-text-btn">
              <FiSearch />
              Search
            </button>
            {(search || statusFilter || categoryFilter) && (
              <button type="button" className="icon-text-btn" onClick={clearSearch}>
                <FiX />
                Clear
              </button>
            )}
          </form>

          {loading && <p>Loading patients...</p>}
          {error && <p className="error-text">{error}</p>}

          {!loading && !error && patients.length === 0 && (
            <p>No patients found yet. Use Register Patient to add one.</p>
          )}

          {patients.length > 0 && (
            <div className="table-responsive patient-table-wrapper">
              <table className="table patient-table">
                <thead>
                  <tr>
                    <th>MRN</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Date of Birth</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td data-label="MRN">
                        <span className="mrn-pill">{patient.mrn}</span>
                      </td>
                      <td data-label="Name">{patient.firstName} {patient.lastName}</td>
                      <td data-label="Category">
                        <span className={`patient-category-badge ${patient.patientCategory ?? "new_patient"}`}>
                          {formatCategory(patient.patientCategory)}
                        </span>
                      </td>
                      <td data-label="Email">{patient.email || "Not set"}</td>
                      <td data-label="Phone">{patient.phone || "Not set"}</td>
                      <td data-label="Date of Birth">{new Date(patient.dateOfBirth).toLocaleDateString()}</td>
                      <td data-label="Gender">{patient.gender}</td>
                      <td data-label="Status">
                        <span className={`patient-status-badge ${patient.status ?? "active"}`}>
                          {formatStatus(patient.status)}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <div className="patient-row-actions">
                          <button
                            type="button"
                            className="icon-text-btn"
                            onClick={() => handleViewIdCard(patient)}
                          >
                            <FiCreditCard />
                            ID Card
                          </button>
                          {canUpdate && (
                            <button
                              type="button"
                              className="icon-text-btn"
                              onClick={() => openEditPatient(patient)}
                            >
                              <FiEdit3 />
                              Edit
                            </button>
                          )}
                          {canConvert && patient.patientCategory === "investigation_patient" && (
                            <button
                              type="button"
                              className="icon-text-btn success"
                              onClick={() => handlePatientAction(patient, "convert")}
                            >
                              <FiUserCheck />
                              Convert
                            </button>
                          )}
                          {canReactivate && patient.status === "inactive" && (
                            <button
                              type="button"
                              className="icon-text-btn success"
                              onClick={() => handlePatientAction(patient, "reactivate")}
                            >
                              <FiRefreshCw />
                              Reactivate
                            </button>
                          )}
                          {canUpdate && (patient.status ?? "active") === "active" && (
                            <button
                              type="button"
                              className="icon-text-btn danger"
                              onClick={() => handlePatientAction(patient, "deactivate")}
                            >
                              <FiSlash />
                              Inactive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedPatient && (
            <div className="patient-id-modal" role="dialog" aria-modal="true" aria-label="Patient ID card">
              <div className="patient-id-modal-backdrop" onClick={() => setSelectedPatient(null)} />
              <section className="patient-id-modal-panel">
                <div className="modal-header">
                  <div>
                    <p className="eyebrow">Patient ID</p>
                    <h2>
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h2>
                  </div>
                  <button type="button" className="icon-only-btn" onClick={() => setSelectedPatient(null)}>
                    <FiX />
                  </button>
                </div>

                {loadingQr && (
                  <div className="id-empty-state">
                    <FiSearch />
                    <p>Loading patient ID card...</p>
                  </div>
                )}

                {qrError && <p className="registration-error">{qrError}</p>}

                {!loadingQr && !qrError && (
                  <PatientIdCard
                    patient={selectedPatient}
                    patientQr={selectedQr}
                    emptyMessage="This patient does not have a QR lookup code yet."
                  />
                )}
              </section>
            </div>
          )}

          {editingPatient && editForm && (
            <div className="patient-id-modal" role="dialog" aria-modal="true" aria-label="Edit patient information">
              <div
                className="patient-id-modal-backdrop"
                onClick={() => {
                  setEditingPatient(null);
                  setEditForm(null);
                }}
              />
              <section className="patient-id-modal-panel patient-edit-modal-panel">
                <div className="modal-header">
                  <div>
                    <p className="eyebrow">Edit patient</p>
                    <h2>
                      {editingPatient.firstName} {editingPatient.lastName}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="icon-only-btn"
                    onClick={() => {
                      setEditingPatient(null);
                      setEditForm(null);
                    }}
                  >
                    <FiX />
                  </button>
                </div>

                <form className="patient-edit-form" onSubmit={handleSavePatient}>
                  <div className="form-section">
                    <h3>Patient Details</h3>
                    <div className="form-grid">
                      <label>
                        First name
                        <input
                          value={editForm.firstName}
                          onChange={(event) => updateEditField("firstName", event.target.value)}
                          required
                        />
                      </label>
                      <label>
                        Last name
                        <input
                          value={editForm.lastName}
                          onChange={(event) => updateEditField("lastName", event.target.value)}
                          required
                        />
                      </label>
                      <label>
                        Date of birth
                        <input
                          type="date"
                          value={editForm.dateOfBirth}
                          onChange={(event) => updateEditField("dateOfBirth", event.target.value)}
                          required
                        />
                      </label>
                      <label>
                        Gender
                        <select value={editForm.gender} onChange={(event) => updateEditField("gender", event.target.value)}>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label>
                        Category
                        <select
                          value={editForm.patientCategory ?? "new_patient"}
                          onChange={(event) => updateEditField("patientCategory", event.target.value)}
                        >
                          <option value="new_patient">New patient</option>
                          <option value="investigation_patient">Investigation patient</option>
                          <option value="old_patient">Old patient</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Contact</h3>
                    <div className="form-grid">
                      <label>
                        Email
                        <input value={editForm.email ?? ""} onChange={(event) => updateEditField("email", event.target.value)} />
                      </label>
                      <label>
                        Phone
                        <input value={editForm.phone ?? ""} onChange={(event) => updateEditField("phone", event.target.value)} />
                      </label>
                      <label>
                        Address
                        <input
                          value={editForm.address ?? ""}
                          onChange={(event) => updateEditField("address", event.target.value)}
                        />
                      </label>
                      <label>
                        City
                        <input value={editForm.city ?? ""} onChange={(event) => updateEditField("city", event.target.value)} />
                      </label>
                      <label>
                        State
                        <select value={editForm.state ?? ""} onChange={(event) => updateEditField("state", event.target.value)}>
                          <option value="">Select state</option>
                          {nigeriaStates.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Country
                        <input
                          value={editForm.country ?? ""}
                          onChange={(event) => updateEditField("country", event.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  <details className="registration-details">
                    <summary>
                      Additional details
                      <FiChevronDown />
                    </summary>

                    <div className="form-section">
                      <h3>Emergency Contact</h3>
                      <div className="form-grid">
                        <label>
                          Contact name
                          <input
                            value={editForm.emergencyContactName ?? ""}
                            onChange={(event) => updateEditField("emergencyContactName", event.target.value)}
                          />
                        </label>
                        <label>
                          Contact phone
                          <input
                            value={editForm.emergencyContactPhone ?? ""}
                            onChange={(event) => updateEditField("emergencyContactPhone", event.target.value)}
                          />
                        </label>
                        <label>
                          Relationship
                          <input
                            value={editForm.emergencyContactRelationship ?? ""}
                            onChange={(event) => updateEditField("emergencyContactRelationship", event.target.value)}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Medical & Insurance</h3>
                      <div className="form-grid">
                        <label>
                          Blood group
                          <input
                            value={editForm.bloodGroup ?? ""}
                            onChange={(event) => updateEditField("bloodGroup", event.target.value)}
                          />
                        </label>
                        <label>
                          Genotype
                          <input
                            value={editForm.genotype ?? ""}
                            onChange={(event) => updateEditField("genotype", event.target.value)}
                          />
                        </label>
                        <label>
                          Allergies
                          <input
                            value={editForm.allergies ?? ""}
                            onChange={(event) => updateEditField("allergies", event.target.value)}
                          />
                        </label>
                        <label>
                          Insurance policy
                          <input
                            value={editForm.insurancePolicyNumber ?? ""}
                            onChange={(event) => updateEditField("insurancePolicyNumber", event.target.value)}
                          />
                        </label>
                        <label>
                          Coverage status
                          <select
                            value={editForm.insuranceCoverageStatus ?? ""}
                            onChange={(event) => updateEditField("insuranceCoverageStatus", event.target.value)}
                          >
                            <option value="">Not provided</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending verification</option>
                            <option value="inactive">Inactive</option>
                            <option value="expired">Expired</option>
                            <option value="self_pay">Self pay</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </details>

                  {editError && <p className="registration-error">{editError}</p>}

                  <button className="registration-submit" type="submit" disabled={savingPatient}>
                    {savingPatient ? "Saving..." : "Save Changes"}
                    <FiSave />
                  </button>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
