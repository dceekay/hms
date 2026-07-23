import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { fetchPatients } from "../../services/patients/patientService";
import { Patient } from "../../types/patient";

export function PatientListPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatients() {
      setLoading(true);
      const response = await fetchPatients();
      if (!response) {
        setError("Unable to load patients. Please try again.");
      } else {
        setPatients(response);
      }
      setLoading(false);
    }

    loadPatients();
  }, []);

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="card">
          <div className="page-header">
            <div>
              <h1>Patients</h1>
              <p>View registered patients and confirm your patient data.</p>
            </div>
          </div>

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
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Date of Birth</th>
                    <th>Gender</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>{patient.firstName} {patient.lastName}</td>
                      <td>{patient.email}</td>
                      <td>{patient.phone}</td>
                      <td>{new Date(patient.dateOfBirth).toLocaleDateString()}</td>
                      <td>{patient.gender}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
