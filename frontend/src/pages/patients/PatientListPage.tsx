import { FormEvent, useEffect, useState } from "react";
import { FiCreditCard, FiSearch, FiX } from "react-icons/fi";
import { PatientIdCard } from "../../components/patients/PatientIdCard";
import AdminLayout from "../../layouts/AdminLayout";
import { fetchPatientQr, fetchPatients } from "../../services/patients/patientService";
import { Patient, PatientQr } from "../../types/patient";

export function PatientListPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedQr, setSelectedQr] = useState<PatientQr | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const loadPatients = async (searchTerm = search) => {
    setLoading(true);
    setError(null);
    const response = await fetchPatients(searchTerm);
    if (!response) {
      setError("Unable to load patients. Please try again.");
    } else {
      setPatients(response);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPatients("");
  }, []);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    loadPatients(search);
  };

  const clearSearch = () => {
    setSearch("");
    loadPatients("");
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
            <button type="submit" className="icon-text-btn">
              <FiSearch />
              Search
            </button>
            {search && (
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
                      <td>{patient.email || "Not set"}</td>
                      <td>{patient.phone || "Not set"}</td>
                      <td>{new Date(patient.dateOfBirth).toLocaleDateString()}</td>
                      <td>{patient.gender}</td>
                      <td>{patient.status ?? "active"}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-text-btn"
                          onClick={() => handleViewIdCard(patient)}
                        >
                          <FiCreditCard />
                          View ID Card
                        </button>
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
