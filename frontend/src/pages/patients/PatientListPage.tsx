import { FormEvent, useEffect, useState } from "react";
import { FiCreditCard, FiRefreshCw, FiSearch, FiSlash, FiUserCheck, FiX } from "react-icons/fi";
import { PatientIdCard } from "../../components/patients/PatientIdCard";
import AdminLayout from "../../layouts/AdminLayout";
import {
  convertInvestigationPatient,
  deactivatePatient,
  fetchPatientQr,
  fetchPatients,
  reactivatePatient,
} from "../../services/patients/patientService";
import { useAuthStore } from "../../store/authStore";
import { Patient, PatientQr } from "../../types/patient";

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
  const [loading, setLoading] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

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
            <div className="table-responsive">
              <table className="table">
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
                      <td>
                        <span className="mrn-pill">{patient.mrn}</span>
                      </td>
                      <td>{patient.firstName} {patient.lastName}</td>
                      <td>
                        <span className={`patient-category-badge ${patient.patientCategory ?? "new_patient"}`}>
                          {formatCategory(patient.patientCategory)}
                        </span>
                      </td>
                      <td>{patient.email || "Not set"}</td>
                      <td>{patient.phone || "Not set"}</td>
                      <td>{new Date(patient.dateOfBirth).toLocaleDateString()}</td>
                      <td>{patient.gender}</td>
                      <td>
                        <span className={`patient-status-badge ${patient.status ?? "active"}`}>
                          {formatStatus(patient.status)}
                        </span>
                      </td>
                      <td>
                        <div className="patient-row-actions">
                          <button
                            type="button"
                            className="icon-text-btn"
                            onClick={() => handleViewIdCard(patient)}
                          >
                            <FiCreditCard />
                            ID Card
                          </button>
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
        </div>
      </main>
    </AdminLayout>
  );
}
