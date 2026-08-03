import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiCalendar,
  FiClipboard,
  FiFileText,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSend,
  FiUser,
} from "react-icons/fi";
import { FaFlask, FaNotesMedical, FaPills, FaUserMd } from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import mdsLogo from "../../assets/logo.png";
import {
  completeClinicalEncounter,
  createClinicalEncounter,
  createPrescription,
  fetchClinicalEncounters,
  fetchDoctorWorkspace,
} from "../../services/clinicalService";
import {
  createLaboratoryRequest,
  fetchLaboratoryRequests,
  fetchLaboratoryTemplates,
} from "../../services/laboratoryService";
import { updateAppointmentStatus } from "../../services/appointmentService";
import { useAuthStore } from "../../store/authStore";
import type { Appointment, AppointmentStatus } from "../../types/appointment";
import type {
  ClinicalEncounter,
  ClinicalEncounterFormValues,
  ClinicalWorkspace,
  PrescriptionItemFormValues,
} from "../../types/clinical";
import type { LaboratoryRequest, LaboratoryTemplate } from "../../types/laboratory";
import type { Patient } from "../../types/patient";
import type { Medication } from "../../types/pharmacy";

const emptyEncounterForm: ClinicalEncounterFormValues = {
  patientId: "",
  visitType: "General consultation",
  chiefComplaint: "",
  history: "",
  examination: "",
  diagnosis: "",
  remarks: "",
  plan: "",
};

const emptyPrescriptionDraft: PrescriptionItemFormValues = {
  medicationId: "",
  medicationName: "",
  strength: "",
  dosageForm: "",
  dose: "",
  frequency: "",
  duration: "",
  quantity: "",
  instructions: "",
};

function patientName(patient: Patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function patientOptionLabel(patient: Patient) {
  return `${patientName(patient)}${patient.mrn ? ` | ${patient.mrn}` : ""}${patient.phone ? ` | ${patient.phone}` : ""}`;
}

function medicineLabel(medication: Medication) {
  return [
    medication.name,
    medication.strength,
    medication.dosageForm,
    medication.currentStock > 0 ? `${medication.currentStock} ${medication.unit}` : "out",
  ]
    .filter(Boolean)
    .join(" | ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  checked_in: "Checked in",
  in_consultation: "In consultation",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

function ageFromDob(value?: string | null) {
  if (!value) return "Age not set";
  const dob = new Date(value);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return `${age} yrs`;
}

function initials(patient?: Patient | null) {
  if (!patient) return "PT";
  return `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();
}

export default function DoctorDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [workspace, setWorkspace] = useState<ClinicalWorkspace | null>(null);
  const [templates, setTemplates] = useState<LaboratoryTemplate[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientHistory, setPatientHistory] = useState<ClinicalEncounter[]>([]);
  const [patientLabHistory, setPatientLabHistory] = useState<LaboratoryRequest[]>([]);
  const [encounterForm, setEncounterForm] =
    useState<ClinicalEncounterFormValues>(emptyEncounterForm);
  const [activeEncounter, setActiveEncounter] = useState<ClinicalEncounter | null>(null);
  const [prescriptionDraft, setPrescriptionDraft] =
    useState<PrescriptionItemFormValues>(emptyPrescriptionDraft);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemFormValues[]>([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [labTemplateId, setLabTemplateId] = useState("");
  const [labNotes, setLabNotes] = useState("");
  const [printingEncounter, setPrintingEncounter] = useState<ClinicalEncounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPatientHistory = useMemo(
    () =>
      patientHistory.filter(
        (encounter) => !selectedPatient || encounter.patientId === selectedPatient.id
      ),
    [patientHistory, selectedPatient]
  );

  const completedLabsForPatient = useMemo(
    () =>
      patientLabHistory.filter(
        (request) =>
          request.patientId === selectedPatient?.id && request.status === "completed"
      ),
    [patientLabHistory, selectedPatient?.id]
  );

  const pendingLabsForPatient = useMemo(
    () =>
      patientLabHistory.filter(
        (request) =>
          request.patientId === selectedPatient?.id && request.status !== "completed"
      ),
    [patientLabHistory, selectedPatient?.id]
  );

  async function loadWorkspace() {
    setLoading(true);
    setError(null);

    const [workspaceResult, templatesResult] = await Promise.all([
      fetchDoctorWorkspace(),
      fetchLaboratoryTemplates("", true),
    ]);

    if (workspaceResult.workspace) {
      setWorkspace(workspaceResult.workspace);
      setPatientHistory(workspaceResult.workspace.recentEncounters);

      if (!selectedPatient) {
        const firstAppointment = workspaceResult.workspace.assignedAppointments[0];
        const firstPatient = firstAppointment?.patient ?? workspaceResult.workspace.patients[0];

        if (firstPatient) {
          void selectPatient(
            firstPatient,
            workspaceResult.workspace.recentEncounters,
            firstAppointment ?? null
          );
        }
      }
    }

    if (templatesResult.result) {
      setTemplates(templatesResult.result.items);
    }

    if (workspaceResult.error || templatesResult.error) {
      setError(workspaceResult.error ?? templatesResult.error ?? "Unable to load doctor dashboard.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadWorkspace();
    const interval = window.setInterval(loadWorkspace, 15000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectPatient(
    patient: Patient,
    historySeed = patientHistory,
    appointment: Appointment | null = null
  ) {
    setSelectedPatient(patient);
    setSelectedAppointment(appointment);
    setPatientSearch(patientOptionLabel(patient));
    setEncounterForm({ ...emptyEncounterForm, patientId: patient.id });
    setLabTemplateId("");
    setLabNotes("");
    setPrescriptionItems([]);
    setPrescriptionDraft(emptyPrescriptionDraft);
    setPrescriptionNotes("");
    setActiveEncounter(null);

    const existing = historySeed.filter((encounter) => encounter.patientId === patient.id);
    setPatientHistory((current) => {
      const merged = new Map(current.map((encounter) => [encounter.id, encounter]));
      existing.forEach((encounter) => merged.set(encounter.id, encounter));
      return Array.from(merged.values());
    });

    const [{ result }, labResult] = await Promise.all([
      fetchClinicalEncounters({ patientId: patient.id }),
      fetchLaboratoryRequests({ patientId: patient.id, status: "all" }),
    ]);

    if (result?.items) {
      setPatientHistory((current) => {
        const merged = new Map(current.map((encounter) => [encounter.id, encounter]));
        result.items.forEach((encounter) => merged.set(encounter.id, encounter));
        return Array.from(merged.values()).sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );
      });
    }

    if (labResult.result?.items) {
      setPatientLabHistory(labResult.result.items);
    }
  }

  function handlePatientSearch(value: string) {
    setPatientSearch(value);
    const patient = workspace?.patients.find((item) => patientOptionLabel(item) === value);

    if (patient) {
      void selectPatient(patient);
    }
  }

  function handleMedicationSelection(value: string) {
    const medication = workspace?.medications.find((item) => medicineLabel(item) === value);

    if (!medication) {
      setPrescriptionDraft((current) => ({
        ...current,
        medicationName: value,
      }));
      return;
    }

    setPrescriptionDraft((current) => ({
      ...current,
      medicationId: medication.id,
      medicationName: medication.name,
      strength: medication.strength ?? "",
      dosageForm: medication.dosageForm ?? "",
    }));
  }

  async function handleSaveEncounter(event: FormEvent) {
    event.preventDefault();

    if (!selectedPatient) {
      setError("Select a patient first.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const { encounter, error: saveError } = await createClinicalEncounter({
      ...encounterForm,
      patientId: selectedPatient.id,
    });

    setSaving(false);

    if (!encounter) {
      setError(saveError ?? "Unable to save clinical note.");
      return;
    }

    setActiveEncounter(encounter);
    setEncounterForm({ ...emptyEncounterForm, patientId: selectedPatient.id });
    setMessage("Clinical note saved.");
    setPatientHistory((current) => [encounter, ...current.filter((item) => item.id !== encounter.id)]);
  }

  async function handleCloseEncounter(encounter: ClinicalEncounter) {
    setSaving(true);
    setError(null);
    const { encounter: updated, error: closeError } = await completeClinicalEncounter(encounter.id);
    setSaving(false);

    if (!updated) {
      setError(closeError ?? "Unable to close consultation.");
      return;
    }

    setActiveEncounter(updated);
    setPatientHistory((current) => current.map((item) => (item.id === updated.id ? updated : item)));

    if (selectedAppointment && selectedAppointment.status !== "completed") {
      await handleAppointmentStatus(selectedAppointment, "completed");
    }

    setMessage("Consultation closed.");
  }

  async function handleAppointmentStatus(appointment: Appointment, nextStatus: AppointmentStatus) {
    setSaving(true);
    setError(null);

    const { appointment: updated, error: updateError } = await updateAppointmentStatus(
      appointment.id,
      nextStatus,
      appointment.notes ?? ""
    );

    setSaving(false);

    if (!updated) {
      setError(updateError ?? "Unable to update appointment.");
      return;
    }

    setSelectedAppointment(updated.status === "completed" ? null : updated);
    setWorkspace((current) =>
      current
        ? {
            ...current,
            assignedAppointments:
              updated.status === "completed" || updated.status === "cancelled" || updated.status === "no_show"
                ? current.assignedAppointments.filter((item) => item.id !== updated.id)
                : current.assignedAppointments.map((item) =>
                    item.id === updated.id ? updated : item
                  ),
          }
        : current
    );
  }

  function addPrescriptionItem() {
    if (!prescriptionDraft.medicationName.trim() || !prescriptionDraft.dose.trim()) {
      setError("Add medicine name and dose before adding the item.");
      return;
    }

    setError(null);
    setPrescriptionItems((current) => [...current, prescriptionDraft]);
    setPrescriptionDraft(emptyPrescriptionDraft);
  }

  async function handleSendPrescription(event: FormEvent) {
    event.preventDefault();

    if (!selectedPatient) {
      setError("Select a patient first.");
      return;
    }

    if (prescriptionItems.length === 0) {
      setError("Add at least one prescription item.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const { prescription, error: prescriptionError } = await createPrescription({
      patientId: selectedPatient.id,
      encounterId: activeEncounter?.id ?? "",
      notes: prescriptionNotes,
      items: prescriptionItems,
    });

    setSaving(false);

    if (!prescription) {
      setError(prescriptionError ?? "Unable to send prescription.");
      return;
    }

    setMessage("Prescription sent to pharmacy.");
    setPrescriptionItems([]);
    setPrescriptionNotes("");
    await loadWorkspace();
  }

  async function handleRequestLab(event: FormEvent) {
    event.preventDefault();

    if (!selectedPatient || !labTemplateId) {
      setError("Select a patient and test.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const { request, error: labError } = await createLaboratoryRequest({
      patientId: selectedPatient.id,
      templateId: labTemplateId,
      clinicalNotes: labNotes,
    });

    setSaving(false);

    if (!request) {
      setError(labError ?? "Unable to request test.");
      return;
    }

    setMessage("Lab request sent.");
    setLabTemplateId("");
    setLabNotes("");
    setPatientLabHistory((current) => [request, ...current]);
    await loadWorkspace();
  }

  function printEncounter(encounter: ClinicalEncounter) {
    setPrintingEncounter(encounter);
    window.setTimeout(() => window.print(), 80);
  }

  const stats = workspace?.summary ?? {
    activePatients: 0,
    assignedAppointments: 0,
    todayEncounters: 0,
    pendingLabRequests: 0,
    completedLabResults: 0,
    prescriptionsSent: 0,
    encounters: {},
  };

  return (
    <AdminLayout>
      <div className="doctor-page">
        <section className="doctor-command">
          <div className="doctor-command-title">
            <span className="doctor-icon">
              <FaUserMd />
            </span>
            <div>
              <p className="eyebrow">Doctor Workspace</p>
              <h1>Clinical Desk</h1>
              <p>{user?.firstName ? `Dr. ${user.firstName} ${user.lastName}` : "Medical team"}</p>
            </div>
          </div>

          <button className="command-btn" type="button" onClick={loadWorkspace} disabled={loading}>
            <FiRefreshCw />
            Refresh
          </button>
        </section>

        <div className="doctor-stats-grid">
          <article>
            <FiUser />
            <span>Assigned queue</span>
            <strong>{stats.assignedAppointments}</strong>
          </article>
          <article>
            <FaNotesMedical />
            <span>Today notes</span>
            <strong>{stats.todayEncounters}</strong>
          </article>
          <article>
            <FaFlask />
            <span>Pending tests</span>
            <strong>{stats.pendingLabRequests}</strong>
          </article>
          <article>
            <FaPills />
            <span>Prescriptions</span>
            <strong>{stats.prescriptionsSent}</strong>
          </article>
        </div>

        {(message || error) && (
          <div className={error ? "doctor-alert error" : "doctor-alert"}>
            {error ?? message}
          </div>
        )}

        <section className="doctor-panel doctor-queue-panel">
          <div className="doctor-panel-heading">
            <div>
              <span>Appointments</span>
              <h2>Patients assigned to you</h2>
            </div>
            <FiCalendar />
          </div>

          <div className="doctor-appointment-queue">
            {workspace?.assignedAppointments.length === 0 && (
              <p>No assigned patients yet.</p>
            )}

            {workspace?.assignedAppointments.map((appointment) => (
              <article
                key={appointment.id}
                className={
                  selectedAppointment?.id === appointment.id
                    ? "doctor-appointment-card active"
                    : "doctor-appointment-card"
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    void selectPatient(
                      appointment.patient,
                      workspace.recentEncounters,
                      appointment
                    )
                  }
                >
                  <span className={`doctor-status ${appointment.status}`}>
                    {appointmentStatusLabels[appointment.status]}
                  </span>
                  <strong>{patientName(appointment.patient)}</strong>
                  <small>{appointment.patient.mrn ?? "MRN pending"}</small>
                  <em>{appointment.reason || "General consultation"}</em>
                </button>

                <div className="doctor-action-row">
                  {appointment.status === "scheduled" && (
                    <button
                      className="command-btn"
                      type="button"
                      disabled={saving}
                      onClick={() => handleAppointmentStatus(appointment, "checked_in")}
                    >
                      Check in
                    </button>
                  )}
                  {appointment.status !== "in_consultation" && (
                    <button
                      className="command-btn primary"
                      type="button"
                      disabled={saving}
                      onClick={() => handleAppointmentStatus(appointment, "in_consultation")}
                    >
                      Start
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="doctor-patient-strip">
          <div>
            <label htmlFor="doctor-patient-search">Patient</label>
            <div className="doctor-search-field">
              <FiSearch />
              <input
                id="doctor-patient-search"
                list="doctor-patient-options"
                value={patientSearch}
                onChange={(event) => handlePatientSearch(event.target.value)}
                placeholder="Search by name, MRN, or phone"
              />
            </div>
            <datalist id="doctor-patient-options">
              {workspace?.patients.map((patient) => (
                <option key={patient.id} value={patientOptionLabel(patient)} />
              ))}
            </datalist>
          </div>

          {selectedPatient && (
            <div className="doctor-selected-patient">
              <div className="doctor-patient-avatar">
                {selectedPatient.photoDataUrl || selectedPatient.photoUrl ? (
                  <img
                    src={selectedPatient.photoDataUrl ?? selectedPatient.photoUrl ?? ""}
                    alt={patientName(selectedPatient)}
                  />
                ) : (
                  initials(selectedPatient)
                )}
              </div>
              <div>
                <strong>{patientName(selectedPatient)}</strong>
                <span>{selectedPatient.mrn ?? "MRN pending"}</span>
              </div>
              <small>
                {ageFromDob(selectedPatient.dateOfBirth)} - {selectedPatient.gender}
              </small>
            </div>
          )}
        </section>

        {selectedPatient && (
          <section className="doctor-patient-details">
            <article>
              <span>Contact</span>
              <strong>{selectedPatient.phone || "No phone"}</strong>
              <small>{selectedPatient.email || "No email"}</small>
            </article>
            <article>
              <span>Insurance</span>
              <strong>{selectedPatient.insuranceProvider?.name || "Self pay"}</strong>
              <small>{selectedPatient.insurancePolicyNumber || "No policy number"}</small>
            </article>
            <article>
              <span>Clinical alerts</span>
              <strong>{selectedPatient.allergies || "No allergies recorded"}</strong>
              <small>
                {[selectedPatient.bloodGroup, selectedPatient.genotype].filter(Boolean).join(" / ") ||
                  "Blood group not set"}
              </small>
            </article>
            <article>
              <span>Emergency</span>
              <strong>{selectedPatient.emergencyContactName || "No emergency contact"}</strong>
              <small>{selectedPatient.emergencyContactPhone || "No phone"}</small>
            </article>
          </section>
        )}

        <div className="doctor-work-grid">
          <form className="doctor-panel doctor-note-panel" onSubmit={handleSaveEncounter}>
            <div className="doctor-panel-heading">
              <div>
                <span>Consultation</span>
                <h2>Medical remarks</h2>
              </div>
              <FiClipboard />
            </div>

            <div className="doctor-form-grid">
              <label>
                Visit type
                <input
                  value={encounterForm.visitType}
                  onChange={(event) =>
                    setEncounterForm((current) => ({ ...current, visitType: event.target.value }))
                  }
                />
              </label>
              <label>
                Chief complaint
                <input
                  value={encounterForm.chiefComplaint}
                  onChange={(event) =>
                    setEncounterForm((current) => ({
                      ...current,
                      chiefComplaint: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label>
              History
              <textarea
                rows={3}
                value={encounterForm.history}
                onChange={(event) =>
                  setEncounterForm((current) => ({ ...current, history: event.target.value }))
                }
              />
            </label>

            <label>
              Examination
              <textarea
                rows={3}
                value={encounterForm.examination}
                onChange={(event) =>
                  setEncounterForm((current) => ({ ...current, examination: event.target.value }))
                }
              />
            </label>

            <div className="doctor-form-grid">
              <label>
                Diagnosis
                <textarea
                  rows={3}
                  value={encounterForm.diagnosis}
                  onChange={(event) =>
                    setEncounterForm((current) => ({ ...current, diagnosis: event.target.value }))
                  }
                />
              </label>
              <label>
                Plan
                <textarea
                  rows={3}
                  value={encounterForm.plan}
                  onChange={(event) =>
                    setEncounterForm((current) => ({ ...current, plan: event.target.value }))
                  }
                />
              </label>
            </div>

            <label>
              Remarks
              <textarea
                rows={3}
                value={encounterForm.remarks}
                onChange={(event) =>
                  setEncounterForm((current) => ({ ...current, remarks: event.target.value }))
                }
              />
            </label>

            <div className="doctor-action-row">
              <button className="command-btn primary" disabled={saving || !selectedPatient} type="submit">
                <FiSave />
                Save note
              </button>
              {activeEncounter && (
                <>
                  <button
                    className="command-btn"
                    type="button"
                    onClick={() => printEncounter(activeEncounter)}
                  >
                    <FiPrinter />
                    Print note
                  </button>
                  {activeEncounter.status !== "completed" && (
                    <button
                      className="command-btn"
                      type="button"
                      onClick={() => handleCloseEncounter(activeEncounter)}
                    >
                      <FiCheckCircle />
                      Close visit
                    </button>
                  )}
                </>
              )}
            </div>
          </form>

          <aside className="doctor-side-stack">
            <form className="doctor-panel" onSubmit={handleRequestLab}>
              <div className="doctor-panel-heading">
                <div>
                  <span>Laboratory</span>
                  <h2>Request test</h2>
                </div>
                <FaFlask />
              </div>

              <label>
                Test
                <select
                  value={labTemplateId}
                  onChange={(event) => setLabTemplateId(event.target.value)}
                >
                  <option value="">Select test</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Clinical notes
                <textarea
                  rows={3}
                  value={labNotes}
                  onChange={(event) => setLabNotes(event.target.value)}
                />
              </label>

              <button className="command-btn primary" disabled={saving || !selectedPatient} type="submit">
                <FiSend />
                Send to lab
              </button>
            </form>

            <form className="doctor-panel" onSubmit={handleSendPrescription}>
              <div className="doctor-panel-heading">
                <div>
                  <span>Medication</span>
                  <h2>Prescription</h2>
                </div>
                <FaPills />
              </div>

              <label>
                Medicine
                <input
                  list="doctor-medication-options"
                  value={prescriptionDraft.medicationName}
                  onChange={(event) => handleMedicationSelection(event.target.value)}
                />
              </label>
              <datalist id="doctor-medication-options">
                {workspace?.medications.map((medication) => (
                  <option key={medication.id} value={medicineLabel(medication)} />
                ))}
              </datalist>

              <div className="doctor-form-grid compact">
                <label>
                  Dose
                  <input
                    value={prescriptionDraft.dose}
                    onChange={(event) =>
                      setPrescriptionDraft((current) => ({ ...current, dose: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Frequency
                  <input
                    value={prescriptionDraft.frequency}
                    onChange={(event) =>
                      setPrescriptionDraft((current) => ({
                        ...current,
                        frequency: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Duration
                  <input
                    value={prescriptionDraft.duration}
                    onChange={(event) =>
                      setPrescriptionDraft((current) => ({
                        ...current,
                        duration: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Qty
                  <input
                    type="number"
                    min="1"
                    value={prescriptionDraft.quantity}
                    onChange={(event) =>
                      setPrescriptionDraft((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                Instructions
                <textarea
                  rows={2}
                  value={prescriptionDraft.instructions}
                  onChange={(event) =>
                    setPrescriptionDraft((current) => ({
                      ...current,
                      instructions: event.target.value,
                    }))
                  }
                />
              </label>

              <button className="command-btn" type="button" onClick={addPrescriptionItem}>
                Add item
              </button>

              {prescriptionItems.length > 0 && (
                <div className="doctor-prescription-list">
                  {prescriptionItems.map((item, index) => (
                    <div key={`${item.medicationName}-${index}`}>
                      <strong>{item.medicationName}</strong>
                      <span>
                        {item.dose} · {item.frequency} · {item.duration}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <label>
                Notes
                <textarea
                  rows={2}
                  value={prescriptionNotes}
                  onChange={(event) => setPrescriptionNotes(event.target.value)}
                />
              </label>

              <button className="command-btn primary" disabled={saving || !selectedPatient} type="submit">
                <FiSend />
                Send prescription
              </button>
            </form>
          </aside>
        </div>

        <section className="doctor-history-grid">
          <div className="doctor-panel">
            <div className="doctor-panel-heading">
              <div>
                <span>History</span>
                <h2>Clinical notes</h2>
              </div>
              <FiFileText />
            </div>

            <div className="doctor-record-list">
              {selectedPatientHistory.length === 0 && <p>No clinical notes yet.</p>}
              {selectedPatientHistory.map((encounter) => (
                <article key={encounter.id} className="doctor-record-card">
                  <div>
                    <strong>{encounter.diagnosis || encounter.chiefComplaint || encounter.visitType}</strong>
                    <span>{formatDate(encounter.startedAt)}</span>
                  </div>
                  <p>{encounter.remarks || encounter.plan || "No remarks recorded."}</p>
                  <div className="doctor-action-row">
                    <button className="command-btn" type="button" onClick={() => printEncounter(encounter)}>
                      <FiPrinter />
                      Print
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="doctor-panel">
            <div className="doctor-panel-heading">
              <div>
                <span>Laboratory</span>
                <h2>Recent results</h2>
              </div>
              <FaFlask />
            </div>

            <div className="doctor-record-list">
              {[...pendingLabsForPatient, ...completedLabsForPatient].length === 0 && (
                <p>No lab activity for this patient.</p>
              )}
              {[...pendingLabsForPatient, ...completedLabsForPatient].map((request) => (
                <article key={request.id} className="doctor-record-card slim">
                  <div>
                    <strong>{request.template.name}</strong>
                    <span>{request.requestNumber}</span>
                  </div>
                  <span className={`doctor-status ${request.status}`}>{request.status.replaceAll("_", " ")}</span>
                  {request.interpretation && <p>{request.interpretation}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>

        {printingEncounter && (
          <section className="doctor-print-template">
            <header>
              <img src={mdsLogo} alt="MDS Hospital" />
              <div>
                <h1>MDS Hospital</h1>
                <p>Medical Consultation Note</p>
              </div>
              <span>{printingEncounter.encounterNumber}</span>
            </header>

            <div className="doctor-print-meta">
              <div>
                <small>Patient</small>
                <strong>{patientName(printingEncounter.patient)}</strong>
              </div>
              <div>
                <small>MRN</small>
                <strong>{printingEncounter.patient.mrn ?? "Not assigned"}</strong>
              </div>
              <div>
                <small>Age / Gender</small>
                <strong>
                  {ageFromDob(printingEncounter.patient.dateOfBirth)} / {printingEncounter.patient.gender}
                </strong>
              </div>
              <div>
                <small>Date</small>
                <strong>{formatDate(printingEncounter.startedAt)}</strong>
              </div>
            </div>

            <div className="doctor-print-section">
              <h2>Clinical Details</h2>
              <p><strong>Complaint:</strong> {printingEncounter.chiefComplaint || "Not recorded"}</p>
              <p><strong>History:</strong> {printingEncounter.history || "Not recorded"}</p>
              <p><strong>Examination:</strong> {printingEncounter.examination || "Not recorded"}</p>
              <p><strong>Diagnosis:</strong> {printingEncounter.diagnosis || "Not recorded"}</p>
              <p><strong>Plan:</strong> {printingEncounter.plan || "Not recorded"}</p>
              <p><strong>Remarks:</strong> {printingEncounter.remarks || "Not recorded"}</p>
            </div>

            <footer>
              <div>
                <small>Doctor</small>
                <strong>
                  Dr. {printingEncounter.doctor?.firstName ?? user?.firstName}{" "}
                  {printingEncounter.doctor?.lastName ?? user?.lastName}
                </strong>
              </div>
              <div className="doctor-signature">Signature / Stamp</div>
            </footer>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
