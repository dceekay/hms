import { FormEvent, useEffect, useState } from "react";
import { FiChevronDown, FiCreditCard, FiDownload, FiUserPlus } from "react-icons/fi";
import { PatientIdPanel } from "../../components/patients/PatientIdCard";
import { nigeriaStates } from "../../constants/nigeriaStates";
import AdminLayout from "../../layouts/AdminLayout";
import { createPatient, fetchPatientQr } from "../../services/patients/patientService";
import { useAuthStore } from "../../store/authStore";
import { Patient, PatientFormValues, PatientQr } from "../../types/patient";

const initialForm: PatientFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "female",
  patientCategory: "new_patient",
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

function isCategoryAllowed(
  category: PatientFormValues["patientCategory"],
  canCreateHospitalPatient: boolean,
  canCreateInvestigationPatient: boolean
) {
  if (category === "investigation_patient") return canCreateInvestigationPatient;
  return canCreateHospitalPatient;
}

export default function PatientRegistrationPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreateHospitalPatient = permissions.includes("patients.create");
  const canCreateInvestigationPatient = permissions.includes("patients.investigation.create");
  const defaultCategory = canCreateHospitalPatient ? "new_patient" : "investigation_patient";
  const [form, setForm] = useState<PatientFormValues>(initialForm);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [patientQr, setPatientQr] = useState<PatientQr | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitLabel =
    form.patientCategory === "investigation_patient"
      ? "Register Investigation Patient"
      : form.patientCategory === "old_patient"
        ? "Register Returning Patient"
        : "Register New Patient";

  useEffect(() => {
    setForm((current) => ({
      ...current,
      patientCategory: isCategoryAllowed(
        current.patientCategory,
        canCreateHospitalPatient,
        canCreateInvestigationPatient
      )
        ? current.patientCategory
        : defaultCategory,
    }));
  }, [canCreateHospitalPatient, canCreateInvestigationPatient, defaultCategory]);

  const update = (field: keyof PatientFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPatientQr(null);

    if (form.patientCategory !== "investigation_patient" && !canCreateHospitalPatient) {
      setLoading(false);
      setError("Only reception can register hospital patients. Lab users can register investigation patients.");
      return;
    }

    if (form.patientCategory === "investigation_patient" && !canCreateInvestigationPatient) {
      setLoading(false);
      setError("Your role cannot register investigation patients.");
      return;
    }

    const { patient, error: registrationError } = await createPatient(cleanPayload(form));
    setLoading(false);

    if (!patient) {
      setError(registrationError ?? "Unable to register patient. Check required fields and duplicate contact details.");
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
            <p className="eyebrow">Reception desk</p>
            <h1>Register patient</h1>
            <p>Capture the details needed for front-desk intake and issue the patient ID.</p>
          </div>
          <div className="registration-hero-actions">
            <span>
              <FiUserPlus />
              Intake
            </span>
            <span>
              <FiCreditCard />
              Patient ID
            </span>
          </div>
        </section>

        <div className="registration-layout">
          <form className="registration-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>Visit Type</h2>
              <div className="patient-category-selector">
                {canCreateHospitalPatient && (
                  <>
                    <button
                      type="button"
                      className={form.patientCategory === "new_patient" ? "category-option active" : "category-option"}
                      onClick={() => update("patientCategory", "new_patient")}
                    >
                      <strong>New</strong>
                      <span>First-time hospital registration</span>
                    </button>
                    <button
                      type="button"
                      className={form.patientCategory === "old_patient" ? "category-option active" : "category-option"}
                      onClick={() => update("patientCategory", "old_patient")}
                    >
                      <strong>Returning</strong>
                      <span>Existing patient coming back</span>
                    </button>
                  </>
                )}
                {canCreateInvestigationPatient && !canCreateHospitalPatient && (
                  <button
                    type="button"
                    className={
                      form.patientCategory === "investigation_patient" ? "category-option active" : "category-option"
                    }
                    onClick={() => update("patientCategory", "investigation_patient")}
                  >
                    <strong>Investigation</strong>
                    <span>Lab-only intake</span>
                  </button>
                )}
              </div>
            </div>

            <div className="form-section">
              <h2>Patient Details</h2>
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
              <h2>Contact</h2>
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
                  <select value={form.state ?? ""} onChange={(event) => update("state", event.target.value)}>
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
                  <input value={form.country ?? ""} onChange={(event) => update("country", event.target.value)} />
                </label>
              </div>
            </div>

            <details className="registration-details">
              <summary>
                Additional details
                <FiChevronDown />
              </summary>

              <div className="form-section">
                <h2>Emergency Contact</h2>
                <div className="form-grid">
                  <label>
                    Contact name <span className="optional-field">optional</span>
                    <input
                      value={form.emergencyContactName ?? ""}
                      onChange={(event) => update("emergencyContactName", event.target.value)}
                    />
                  </label>
                  <label>
                    Contact phone <span className="optional-field">optional</span>
                    <input
                      value={form.emergencyContactPhone ?? ""}
                      onChange={(event) => update("emergencyContactPhone", event.target.value)}
                    />
                  </label>
                  <label>
                    Relationship <span className="optional-field">optional</span>
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
                    Blood group <span className="optional-field">optional</span>
                    <input value={form.bloodGroup ?? ""} onChange={(event) => update("bloodGroup", event.target.value)} />
                  </label>
                  <label>
                    Genotype <span className="optional-field">optional</span>
                    <input value={form.genotype ?? ""} onChange={(event) => update("genotype", event.target.value)} />
                  </label>
                  <label>
                    Allergies <span className="optional-field">optional</span>
                    <input value={form.allergies ?? ""} onChange={(event) => update("allergies", event.target.value)} />
                  </label>
                  <label>
                    Insurance policy <span className="optional-field">optional</span>
                    <input
                      value={form.insurancePolicyNumber ?? ""}
                      onChange={(event) => update("insurancePolicyNumber", event.target.value)}
                    />
                  </label>
                  <label>
                    Coverage status <span className="optional-field">optional</span>
                    <select
                      value={form.insuranceCoverageStatus ?? ""}
                      onChange={(event) => update("insuranceCoverageStatus", event.target.value)}
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

            {error && <p className="registration-error">{error}</p>}

            <button className="registration-submit" type="submit" disabled={loading}>
              {loading ? "Registering..." : submitLabel}
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
