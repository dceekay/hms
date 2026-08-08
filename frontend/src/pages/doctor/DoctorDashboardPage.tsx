import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheckCircle,
  FiCalendar,
  FiClipboard,
  FiFileText,
  FiHome,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSend,
  FiShare2,
  FiUser,
} from "react-icons/fi";
import { FaFlask, FaNotesMedical, FaPills, FaUserMd } from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import mdsLogo from "../../assets/logo.png";
import {
  completeClinicalEncounter,
  createAdmissionRequest,
  createClinicalEncounter,
  createPrescription,
  createReferral,
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
  AdmissionRequestFormValues,
  ClinicalAdmissionRequest,
  ClinicalEncounter,
  ClinicalEncounterFormValues,
  ClinicalRequestPriority,
  ClinicalReferral,
  ClinicalWorkspace,
  PrescriptionItemFormValues,
  ReferralFormValues,
} from "../../types/clinical";
import type { LaboratoryRequest, LaboratoryTemplate } from "../../types/laboratory";
import type { Patient } from "../../types/patient";
import type { Medication } from "../../types/pharmacy";

type DoctorTool = "note" | "lab" | "prescription" | "admission" | "referral";

const priorityOptions: ClinicalRequestPriority[] = ["routine", "urgent", "emergency"];

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

const emptyAdmissionForm: AdmissionRequestFormValues = {
  patientId: "",
  encounterId: "",
  wardId: "",
  bedId: "",
  priority: "routine",
  diagnosis: "",
  reason: "",
  notes: "",
};

const emptyReferralForm: ReferralFormValues = {
  patientId: "",
  encounterId: "",
  priority: "routine",
  destinationFacility: "",
  departmentOrSpecialty: "",
  reason: "",
  clinicalSummary: "",
  notes: "",
};

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  checked_in: "Checked in",
  in_consultation: "In consultation",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

const defaultWorkspaceSummary: ClinicalWorkspace["summary"] = {
  activePatients: 0,
  assignedAppointments: 0,
  todayEncounters: 0,
  pendingLabRequests: 0,
  completedLabResults: 0,
  prescriptionsSent: 0,
  pendingAdmissionRequests: 0,
  referralsSent: 0,
  encounters: {},
};

function normalizeWorkspace(workspace: Partial<ClinicalWorkspace>): ClinicalWorkspace {
  return {
    patients: workspace.patients ?? [],
    assignedAppointments: workspace.assignedAppointments ?? [],
    recentEncounters: workspace.recentEncounters ?? [],
    recentPrescriptions: workspace.recentPrescriptions ?? [],
    pendingLabRequests: workspace.pendingLabRequests ?? [],
    completedLabRequests: workspace.completedLabRequests ?? [],
    medications: workspace.medications ?? [],
    admissionRequests: workspace.admissionRequests ?? [],
    referrals: workspace.referrals ?? [],
    wards: workspace.wards ?? [],
    availableBeds: workspace.availableBeds ?? [],
    summary: {
      ...defaultWorkspaceSummary,
      ...(workspace.summary ?? {}),
      encounters: workspace.summary?.encounters ?? {},
    },
  };
}

function patientName(patient?: Patient | null) {
  if (!patient) return "Unknown patient";
  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim();
  return fullName || "Unknown patient";
}

function patientOptionLabel(patient?: Patient | null) {
  if (!patient) return "Unknown patient";
  const name = patientName(patient);
  return `${name}${patient.mrn ? ` | ${patient.mrn}` : ""}${patient.phone ? ` | ${patient.phone}` : ""}`;
}

function medicineLabel(medication?: Medication | null) {
  if (!medication) return "Unknown medication";
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ageFromDob(value?: string | null) {
  if (!value) return "Age not set";
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return "Age not set";

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
  return `${patient.firstName?.charAt(0) ?? ""}${patient.lastName?.charAt(0) ?? ""}`.toUpperCase() || "PT";
}

function requestsForPatient<T extends { patientId: string }>(requests: T[], patientId?: string) {
  if (!patientId) return [];
  return requests.filter((request) => request.patientId === patientId);
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
  const [activeTool, setActiveTool] = useState<DoctorTool>("note");
  const [prescriptionDraft, setPrescriptionDraft] =
    useState<PrescriptionItemFormValues>(emptyPrescriptionDraft);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemFormValues[]>([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [labTemplateId, setLabTemplateId] = useState("");
  const [labNotes, setLabNotes] = useState("");
  const [admissionForm, setAdmissionForm] =
    useState<AdmissionRequestFormValues>(emptyAdmissionForm);
  const [referralForm, setReferralForm] = useState<ReferralFormValues>(emptyReferralForm);
  const [printingEncounter, setPrintingEncounter] = useState<ClinicalEncounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedPatientRef = useRef<Patient | null>(null);

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

  const patientAdmissionRequests = useMemo(
    () => requestsForPatient(workspace?.admissionRequests ?? [], selectedPatient?.id),
    [workspace?.admissionRequests, selectedPatient?.id]
  );

  const patientReferrals = useMemo(
    () => requestsForPatient(workspace?.referrals ?? [], selectedPatient?.id),
    [workspace?.referrals, selectedPatient?.id]
  );

  const availableBedsForWard = useMemo(
    () =>
      (workspace?.availableBeds ?? []).filter(
        (bed) => !admissionForm.wardId || bed.wardId === admissionForm.wardId
      ),
    [workspace?.availableBeds, admissionForm.wardId]
  );

  async function loadWorkspace() {
    setLoading(true);
    setError(null);

    const [workspaceResult, templatesResult] = await Promise.all([
      fetchDoctorWorkspace(),
      fetchLaboratoryTemplates("", true),
    ]);

    if (workspaceResult.workspace) {
      const workspaceData = normalizeWorkspace(workspaceResult.workspace);
      setWorkspace(workspaceData);
      setPatientHistory(workspaceData.recentEncounters);

      if (!selectedPatientRef.current) {
        const appointments = workspaceData.assignedAppointments ?? [];
        const firstAppointment = appointments[0];
        const patients = workspaceData.patients ?? [];
        const firstPatient = firstAppointment?.patient ?? patients[0];

        if (firstPatient) {
          void selectPatient(
            firstPatient,
            workspaceData.recentEncounters,
            firstAppointment ?? null
          );
        }
      }
    }

    if (templatesResult.result) {
      setTemplates(templatesResult.result.items ?? []);
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
    selectedPatientRef.current = patient;
    setSelectedAppointment(appointment);
    setPatientSearch(patientOptionLabel(patient));
    setEncounterForm({ ...emptyEncounterForm, patientId: patient.id });
    setLabTemplateId("");
    setLabNotes("");
    setPrescriptionItems([]);
    setPrescriptionDraft(emptyPrescriptionDraft);
    setPrescriptionNotes("");
    setAdmissionForm({ ...emptyAdmissionForm, patientId: patient.id });
    setReferralForm({ ...emptyReferralForm, patientId: patient.id });
    setActiveEncounter(null);
    setActiveTool("note");

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
    const patient = (workspace?.patients ?? []).find((item) => patientOptionLabel(item) === value);

    if (patient) {
      void selectPatient(patient);
    }
  }

  function handleMedicationSelection(value: string) {
    const medication = (workspace?.medications ?? []).find((item) => medicineLabel(item) === value);

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
    setAdmissionForm((current) => ({ ...current, encounterId: current.encounterId || encounter.id }));
    setReferralForm((current) => ({ ...current, encounterId: current.encounterId || encounter.id }));
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

  async function handleRequestAdmission(event: FormEvent) {
    event.preventDefault();

    if (!selectedPatient) {
      setError("Select a patient first.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const { admissionRequest, error: admissionError } = await createAdmissionRequest({
      ...admissionForm,
      patientId: selectedPatient.id,
      encounterId: admissionForm.encounterId || activeEncounter?.id || "",
    });

    setSaving(false);

    if (!admissionRequest) {
      setError(admissionError ?? "Unable to request ward or bed.");
      return;
    }

    setMessage("Admission request sent.");
    setAdmissionForm({ ...emptyAdmissionForm, patientId: selectedPatient.id });
    await loadWorkspace();
  }

  async function handleCreateReferral(event: FormEvent) {
    event.preventDefault();

    if (!selectedPatient) {
      setError("Select a patient first.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const { referral, error: referralError } = await createReferral({
      ...referralForm,
      patientId: selectedPatient.id,
      encounterId: referralForm.encounterId || activeEncounter?.id || "",
    });

    setSaving(false);

    if (!referral) {
      setError(referralError ?? "Unable to create referral.");
      return;
    }

    setMessage("Referral saved.");
    setReferralForm({ ...emptyReferralForm, patientId: selectedPatient.id });
    await loadWorkspace();
  }

  function printEncounter(encounter: ClinicalEncounter) {
    setPrintingEncounter(encounter);
    window.setTimeout(() => window.print(), 80);
  }

  const stats = workspace?.summary ?? defaultWorkspaceSummary;
  const assignedAppointments = workspace?.assignedAppointments ?? [];
  const patients = workspace?.patients ?? [];
  const recentPrescriptions = workspace?.recentPrescriptions ?? [];
  const pendingLabRequests = workspace?.pendingLabRequests ?? [];

  return (
    <AdminLayout>
      <div className="doctor-page">
        <section className="doctor-command">
          <div className="doctor-command-title">
            <span className="doctor-icon">
              <FaUserMd />
            </span>
            <div>
              <p className="eyebrow">Doctor Desk</p>
              <h1>Clinical work queue</h1>
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
            <span>Queue</span>
            <strong>{stats.assignedAppointments}</strong>
          </article>
          <article>
            <FaNotesMedical />
            <span>Notes today</span>
            <strong>{stats.todayEncounters}</strong>
          </article>
          <article>
            <FaFlask />
            <span>Pending labs</span>
            <strong>{stats.pendingLabRequests}</strong>
          </article>
          <article>
            <FiHome />
            <span>Ward requests</span>
            <strong>{stats.pendingAdmissionRequests}</strong>
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
            {assignedAppointments.length === 0 && <p>No assigned patients yet.</p>}

            {assignedAppointments.map((appointment) => (
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
                  disabled={!appointment.patient}
                  onClick={() =>
                    appointment.patient
                      ? void selectPatient(
                          appointment.patient,
                          workspace?.recentEncounters ?? [],
                          appointment
                        )
                      : undefined
                  }
                >
                  <span className={`doctor-status ${appointment.status}`}>
                    {appointmentStatusLabels[appointment.status] ?? appointment.status.replaceAll("_", " ")}
                  </span>
                  <strong>{patientName(appointment.patient)}</strong>
                  <small>{appointment.patient?.mrn ?? "MRN pending"}</small>
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
              {patients.map((patient) => (
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
                {ageFromDob(selectedPatient.dateOfBirth)} | {selectedPatient.gender}
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

        <section className="doctor-panel doctor-workbench">
          <div className="doctor-panel-heading">
            <div>
              <span>Care actions</span>
              <h2>{selectedPatient ? patientName(selectedPatient) : "Select a patient"}</h2>
            </div>
            <FiClipboard />
          </div>

          <div className="doctor-tool-tabs" role="tablist" aria-label="Doctor actions">
            {[
              { key: "note", label: "Note", icon: <FaNotesMedical /> },
              { key: "lab", label: "Lab", icon: <FaFlask /> },
              { key: "prescription", label: "Rx", icon: <FaPills /> },
              { key: "admission", label: "Ward", icon: <FiHome /> },
              { key: "referral", label: "Referral", icon: <FiShare2 /> },
            ].map((tool) => (
              <button
                key={tool.key}
                className={activeTool === tool.key ? "active" : ""}
                type="button"
                onClick={() => setActiveTool(tool.key as DoctorTool)}
              >
                {tool.icon}
                {tool.label}
              </button>
            ))}
          </div>

          {activeTool === "note" && (
            <form className="doctor-action-form" onSubmit={handleSaveEncounter}>
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

              <div className="doctor-form-grid">
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
              </div>

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
                      Print
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
          )}

          {activeTool === "lab" && (
            <form className="doctor-action-form" onSubmit={handleRequestLab}>
              <div className="doctor-form-grid">
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
              </div>

              <button className="command-btn primary" disabled={saving || !selectedPatient} type="submit">
                <FiSend />
                Send to lab
              </button>
            </form>
          )}

          {activeTool === "prescription" && (
            <form className="doctor-action-form" onSubmit={handleSendPrescription}>
              <div className="doctor-form-grid">
                <label>
                  Medicine
                  <input
                    list="doctor-medication-options"
                    value={prescriptionDraft.medicationName}
                    onChange={(event) => handleMedicationSelection(event.target.value)}
                  />
                </label>
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
              </div>
              <datalist id="doctor-medication-options">
                {(workspace?.medications ?? []).map((medication) => (
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

              <div className="doctor-action-row">
                <button className="command-btn" type="button" onClick={addPrescriptionItem}>
                  Add item
                </button>
                <button className="command-btn primary" disabled={saving || !selectedPatient} type="submit">
                  <FiSend />
                  Send prescription
                </button>
              </div>

              {prescriptionItems.length > 0 && (
                <div className="doctor-prescription-list">
                  {prescriptionItems.map((item, index) => (
                    <div key={`${item.medicationName}-${index}`}>
                      <strong>{item.medicationName}</strong>
                      <span>
                        {item.dose} | {item.frequency} | {item.duration}
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
            </form>
          )}

          {activeTool === "admission" && (
            <form className="doctor-action-form" onSubmit={handleRequestAdmission}>
              <div className="doctor-form-grid compact">
                <label>
                  Priority
                  <select
                    value={admissionForm.priority}
                    onChange={(event) =>
                      setAdmissionForm((current) => ({
                        ...current,
                        priority: event.target.value as ClinicalRequestPriority,
                      }))
                    }
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Ward
                  <select
                    value={admissionForm.wardId}
                    onChange={(event) =>
                      setAdmissionForm((current) => ({
                        ...current,
                        wardId: event.target.value,
                        bedId: "",
                      }))
                    }
                  >
                    <option value="">Any ward</option>
                    {(workspace?.wards ?? []).map((ward) => (
                      <option key={ward.id} value={ward.id}>
                        {ward.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Bed
                  <select
                    value={admissionForm.bedId}
                    onChange={(event) =>
                      setAdmissionForm((current) => ({ ...current, bedId: event.target.value }))
                    }
                  >
                    <option value="">Assign later</option>
                    {availableBedsForWard.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        {bed.bedNumber}
                        {bed.ward?.name ? ` | ${bed.ward.name}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Diagnosis
                  <input
                    value={admissionForm.diagnosis}
                    onChange={(event) =>
                      setAdmissionForm((current) => ({ ...current, diagnosis: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="doctor-form-grid">
                <label>
                  Reason
                  <textarea
                    rows={3}
                    required
                    value={admissionForm.reason}
                    onChange={(event) =>
                      setAdmissionForm((current) => ({ ...current, reason: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={admissionForm.notes}
                    onChange={(event) =>
                      setAdmissionForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
              </div>

              <button className="command-btn primary" disabled={saving || !selectedPatient} type="submit">
                <FiHome />
                Request ward
              </button>
            </form>
          )}

          {activeTool === "referral" && (
            <form className="doctor-action-form" onSubmit={handleCreateReferral}>
              <div className="doctor-form-grid compact">
                <label>
                  Priority
                  <select
                    value={referralForm.priority}
                    onChange={(event) =>
                      setReferralForm((current) => ({
                        ...current,
                        priority: event.target.value as ClinicalRequestPriority,
                      }))
                    }
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Destination
                  <input
                    required
                    value={referralForm.destinationFacility}
                    onChange={(event) =>
                      setReferralForm((current) => ({
                        ...current,
                        destinationFacility: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Specialty
                  <input
                    value={referralForm.departmentOrSpecialty}
                    onChange={(event) =>
                      setReferralForm((current) => ({
                        ...current,
                        departmentOrSpecialty: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="doctor-form-grid">
                <label>
                  Reason
                  <textarea
                    rows={3}
                    required
                    value={referralForm.reason}
                    onChange={(event) =>
                      setReferralForm((current) => ({ ...current, reason: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Clinical summary
                  <textarea
                    rows={3}
                    value={referralForm.clinicalSummary}
                    onChange={(event) =>
                      setReferralForm((current) => ({
                        ...current,
                        clinicalSummary: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  rows={2}
                  value={referralForm.notes}
                  onChange={(event) =>
                    setReferralForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </label>

              <button className="command-btn primary" disabled={saving || !selectedPatient} type="submit">
                <FiShare2 />
                Save referral
              </button>
            </form>
          )}
        </section>

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
                <h2>Tests and results</h2>
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
                    <strong>{request.template?.name ?? "Lab request"}</strong>
                    <span>{request.requestNumber}</span>
                  </div>
                  <span className={`doctor-status ${request.status}`}>{request.status.replaceAll("_", " ")}</span>
                  {request.interpretation && <p>{request.interpretation}</p>}
                </article>
              ))}
            </div>
          </div>

          <div className="doctor-panel">
            <div className="doctor-panel-heading">
              <div>
                <span>Handoffs</span>
                <h2>Ward and referrals</h2>
              </div>
              <FiShare2 />
            </div>

            <div className="doctor-record-list">
              {patientAdmissionRequests.map((request) => (
                <article key={request.id} className="doctor-record-card slim">
                  <div>
                    <strong>{request.requestNumber}</strong>
                    <span>
                      {request.ward?.name ?? "Ward pending"} | {request.reason}
                    </span>
                  </div>
                  <span className={`doctor-status ${request.status}`}>{request.status}</span>
                </article>
              ))}

              {patientReferrals.map((referral) => (
                <article key={referral.id} className="doctor-record-card slim">
                  <div>
                    <strong>{referral.destinationFacility}</strong>
                    <span>{referral.reason}</span>
                  </div>
                  <span className={`doctor-status ${referral.status}`}>{referral.status}</span>
                </article>
              ))}

              {patientAdmissionRequests.length === 0 && patientReferrals.length === 0 && (
                <p>No ward requests or referrals for this patient.</p>
              )}
            </div>
          </div>

          <div className="doctor-panel">
            <div className="doctor-panel-heading">
              <div>
                <span>Recent</span>
                <h2>Lab and pharmacy</h2>
              </div>
              <FiClipboard />
            </div>

            <div className="doctor-record-list">
              {pendingLabRequests.slice(0, 2).map((request) => (
                <article key={request.id} className="doctor-record-card slim">
                  <div>
                    <strong>{patientName(request.patient)}</strong>
                    <span>{request.template?.name ?? "Lab request"} pending</span>
                  </div>
                  <span className={`doctor-status ${request.status}`}>{request.status.replaceAll("_", " ")}</span>
                </article>
              ))}

              {recentPrescriptions.slice(0, 2).map((prescription) => (
                <article key={prescription.id} className="doctor-record-card slim">
                  <div>
                    <strong>{patientName(prescription.patient)}</strong>
                    <span>{prescription.prescriptionNumber}</span>
                  </div>
                  <span className={`doctor-status ${prescription.status}`}>
                    {prescription.status.replaceAll("_", " ")}
                  </span>
                </article>
              ))}

              {pendingLabRequests.length === 0 && recentPrescriptions.length === 0 && (
                <p>No recent lab or pharmacy handoffs.</p>
              )}
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
