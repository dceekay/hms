import { FormEvent, useState } from "react";
import { FiDownload, FiUserPlus } from "react-icons/fi";
import { PatientIdPanel } from "../../components/patients/PatientIdCard";
import AdminLayout from "../../layouts/AdminLayout";
import { createPatient, fetchPatientQr } from "../../services/patients/patientService";
import { Patient, PatientFormValues, PatientQr } from "../../types/patient";

const initialForm: PatientFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "female",
  address: "",
  city: "",
  state: "",
  country: "Nigeria",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  bloodGroup: "",
  genotype: "",
  allergies: "",
  insurancePolicyNumber: "",
  insuranceCoverageStatus: "",
};

function cleanPayload(values: PatientFormValues) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === "" ? undefined : value])
  ) as PatientFormValues;
}

export default function PatientRegistrationPage() {
  const [form, setForm] = useState<PatientFormValues>(initialForm);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [patientQr, setPatientQr] = useState<PatientQr | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof PatientFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPatientQr(null);

    const patient = await createPatient(cleanPayload(form));
    setLoading(false);

    if (!patient) {
      setError("Unable to register patient. Check required fields and duplicate contact details.");
      return;
    }

    setCreatedPatient(patient);
  };

  const handleGenerateId = async () => {
    if (!createdPatient) return;

    setGeneratingId(true);
    setError(null);
    const qr = await fetchPatientQr(createdPatient.id);
    setGeneratingId(false);

    if (!qr) {
      setError("Patient was created, but the ID card could not be generated.");
      return;
    }

    setPatientQr(qr);
  };

  return (
    <AdminLayout>
      <div className="patient-registration-page">
        <section className="registration-hero">
          <div>
            <p className="eyebrow">Patient registry</p>
            <h1>Register patient and generate hospital ID.</h1>
            <p>
              Capture demographics, emergency contact, medical identifiers, and insurance details.
              The backend assigns a searchable MRN and QR lookup code after registration.
            </p>
          </div>
          <FiUserPlus />
        </section>

        <div className="registration-layout">
          <form className="registration-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>Personal Details</h2>
              <div className="form-grid">
                <label>
                  First name
                  <input value={form.firstName} onChange={(event) => update("firstName", event.target.value)} required />
                </label>
                <label>
                  Last name
                  <input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} required />
                </label>
                <label>
                  Date of birth
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(event) => update("dateOfBirth", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Gender
                  <select value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="form-section">
              <h2>Contact & Emergency</h2>
              <div className="form-grid">
                <label>
                  Email
                  <input value={form.email ?? ""} onChange={(event) => update("email", event.target.value)} />
                </label>
                <label>
                  Phone
                  <input value={form.phone ?? ""} onChange={(event) => update("phone", event.target.value)} />
                </label>
                <label>
                  Address
                  <input value={form.address ?? ""} onChange={(event) => update("address", event.target.value)} />
                </label>
                <label>
                  City
                  <input value={form.city ?? ""} onChange={(event) => update("city", event.target.value)} />
                </label>
                <label>
                  State
                  <input value={form.state ?? ""} onChange={(event) => update("state", event.target.value)} />
                </label>
                <label>
                  Country
                  <input value={form.country ?? ""} onChange={(event) => update("country", event.target.value)} />
                </label>
                <label>
                  Emergency contact
                  <input
                    value={form.emergencyContactName ?? ""}
                    onChange={(event) => update("emergencyContactName", event.target.value)}
                  />
                </label>
                <label>
                  Emergency phone
                  <input
                    value={form.emergencyContactPhone ?? ""}
                    onChange={(event) => update("emergencyContactPhone", event.target.value)}
                  />
                </label>
                <label>
                  Relationship
                  <input
                    value={form.emergencyContactRelationship ?? ""}
                    onChange={(event) => update("emergencyContactRelationship", event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="form-section">
              <h2>Medical & Insurance</h2>
              <div className="form-grid">
                <label>
                  Blood group
                  <input value={form.bloodGroup ?? ""} onChange={(event) => update("bloodGroup", event.target.value)} />
                </label>
                <label>
                  Genotype
                  <input value={form.genotype ?? ""} onChange={(event) => update("genotype", event.target.value)} />
                </label>
                <label>
                  Allergies
                  <input value={form.allergies ?? ""} onChange={(event) => update("allergies", event.target.value)} />
                </label>
                <label>
                  Insurance policy number
                  <input
                    value={form.insurancePolicyNumber ?? ""}
                    onChange={(event) => update("insurancePolicyNumber", event.target.value)}
                  />
                </label>
                <label>
                  Coverage status
                  <input
                    value={form.insuranceCoverageStatus ?? ""}
                    onChange={(event) => update("insuranceCoverageStatus", event.target.value)}
                  />
                </label>
              </div>
            </div>

            {error && <p className="registration-error">{error}</p>}

            <button className="registration-submit" type="submit" disabled={loading}>
              {loading ? "Registering patient..." : "Register Patient"}
              <FiUserPlus />
            </button>
          </form>

          <aside className="patient-id-panel">
            <PatientIdPanel patient={createdPatient} patientQr={patientQr} />

            {createdPatient && (
              <button className="generate-id-btn" type="button" onClick={handleGenerateId} disabled={generatingId}>
                {generatingId ? "Generating ID..." : "Generate Patient ID"}
                <FiDownload />
              </button>
            )}
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
