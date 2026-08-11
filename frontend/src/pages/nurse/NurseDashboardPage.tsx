import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiHeart,
  FiHome,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiX,
} from "react-icons/fi";
import { FaBed, FaCapsules, FaNotesMedical, FaUserNurse } from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import { PatientIdCard } from "../../components/patients/PatientIdCard";
import { fetchPatientQr } from "../../services/patients/patientService";
import {
  acknowledgeNurseOrder,
  administerMedication,
  createNursingNote,
  fetchNursingWorkspace,
  recordVitals,
} from "../../services/nursingService";
import { useAuthStore } from "../../store/authStore";
import type {
  MedicationAdministrationSchedule,
  NurseView,
  NursingPatient,
  NursingWorkspace,
} from "../../types/nursing";
import type { PatientQr } from "../../types/patient";
import {
  CLINICAL_ALERT_REPEAT_MS,
  playClinicalAlertSound,
} from "../../utils/alertSound";

const nurseViewMeta: Record<NurseView, { title: string; label: string; description: string }> = {
  overview: {
    title: "Nurse dashboard",
    label: "Nurse Desk",
    description: "Shift summary and urgent care tasks.",
  },
  patients: {
    title: "Patients",
    label: "Patients",
    description: "Find patients, view ID cards, and confirm ward status.",
  },
  ward: {
    title: "Ward patients",
    label: "Ward",
    description: "Admitted patients, ward, room, and bed details.",
  },
  medications: {
    title: "Medication rounds",
    label: "Medication",
    description: "Due, overdue, and completed administrations.",
  },
  orders: {
    title: "Doctor orders",
    label: "Orders",
    description: "Prescriptions, lab requests, admissions, and referrals.",
  },
  vitals: {
    title: "Vitals",
    label: "Vitals",
    description: "Record and review patient observations.",
  },
  notes: {
    title: "Nursing notes",
    label: "Notes",
    description: "Shift notes and handover records.",
  },
  reminders: {
    title: "Reminders",
    label: "Reminders",
    description: "Medication alerts and follow-up reminders.",
  },
};

const emptyVitalsForm = {
  patientId: "",
  temperatureCelsius: "",
  systolicBp: "",
  diastolicBp: "",
  pulse: "",
  respiration: "",
  spo2: "",
  painScore: "",
  notes: "",
};

const emptyNoteForm = {
  patientId: "",
  shift: "general" as const,
  note: "",
};

function normalizeNurseView(value?: string): NurseView {
  if (
    value === "patients" ||
    value === "ward" ||
    value === "medications" ||
    value === "orders" ||
    value === "vitals" ||
    value === "notes" ||
    value === "reminders"
  ) {
    return value;
  }

  return "overview";
}

function patientName(patient?: NursingPatient | null) {
  if (!patient) return "Unknown patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || "Unknown patient";
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function nurseInitials(firstName?: string, lastName?: string) {
  return `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.toUpperCase() || "NS";
}

function wardLabel(patient?: NursingPatient | null) {
  const admission = patient?.currentAdmission;
  if (!admission) return "Not admitted";

  return [
    admission.ward?.name,
    admission.room?.roomNumber || admission.room?.name,
    admission.bed?.bedNumber ? `Bed ${admission.bed.bedNumber}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function scheduleState(schedule: MedicationAdministrationSchedule) {
  if (!schedule.nextDueAt) return "completed";

  const due = new Date(schedule.nextDueAt).getTime();
  const now = Date.now();
  const soon = now + 30 * 60 * 1000;

  if (due < now - 30 * 60 * 1000) return "overdue";
  if (due <= soon) return "due";
  return "upcoming";
}

export default function NurseDashboardPage() {
  const { view } = useParams();
  const currentView = normalizeNurseView(view);
  const meta = nurseViewMeta[currentView];
  const user = useAuthStore((state) => state.user);
  const [workspace, setWorkspace] = useState<NursingWorkspace | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<NursingPatient | null>(null);
  const [patientQr, setPatientQr] = useState<PatientQr | null>(null);
  const [showIdCard, setShowIdCard] = useState(false);
  const [search, setSearch] = useState("");
  const [vitalsForm, setVitalsForm] = useState(emptyVitalsForm);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const lastMedicationAlertRef = useRef(0);

  const patients = workspace?.patients ?? [];
  const admittedPatients = patients.filter((patient) => patient.isAdmitted);
  const schedules = workspace?.medicationSchedules ?? [];
  const dueSchedules = schedules.filter((schedule) => scheduleState(schedule) === "due");
  const overdueSchedules = schedules.filter((schedule) => scheduleState(schedule) === "overdue");
  const upcomingSchedules = schedules.filter((schedule) => scheduleState(schedule) === "upcoming");
  const acknowledgementKeys = new Set(
    (workspace?.acknowledgements ?? []).map((item) => `${item.orderType}:${item.orderId}`)
  );

  const visiblePatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) =>
      [patient.firstName, patient.lastName, patient.mrn, patient.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [patients, search]);

  const workspaceCards = [
    { title: "Patients", detail: `${patients.length} active`, path: "/nurse/patients", icon: <FiUser /> },
    { title: "Ward", detail: `${admittedPatients.length} admitted`, path: "/nurse/ward", icon: <FaBed /> },
    { title: "Medication", detail: `${dueSchedules.length} due`, path: "/nurse/medications", icon: <FaCapsules /> },
    { title: "Orders", detail: `${workspace?.summary.newDoctorOrders ?? 0} active`, path: "/nurse/orders", icon: <FiFileText /> },
    { title: "Vitals", detail: `${workspace?.summary.pendingVitals ?? 0} pending`, path: "/nurse/vitals", icon: <FiHeart /> },
    { title: "Notes", detail: `${workspace?.summary.nursingNotesToday ?? 0} today`, path: "/nurse/notes", icon: <FaNotesMedical /> },
    { title: "Reminders", detail: `${overdueSchedules.length} overdue`, path: "/nurse/reminders", icon: <FiBell /> },
  ];

  async function loadWorkspace() {
    setLoading(true);
    const result = await fetchNursingWorkspace();
    setLoading(false);

    if (!result.workspace) {
      setError(result.error ?? "Unable to load nursing portal.");
      return;
    }

    setWorkspace(result.workspace);
    if (!selectedPatient && result.workspace.patients[0]) {
      selectPatient(result.workspace.patients[0]);
    }
  }

  useEffect(() => {
    void loadWorkspace();
    const interval = window.setInterval(loadWorkspace, 20000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const alertCount = dueSchedules.length + overdueSchedules.length;
    if (alertCount === 0) {
      lastMedicationAlertRef.current = 0;
      return;
    }

    function runMedicationAlert() {
      const now = Date.now();
      if (now - lastMedicationAlertRef.current < CLINICAL_ALERT_REPEAT_MS) return;

      lastMedicationAlertRef.current = now;
      playClinicalAlertSound(overdueSchedules.length > 0 ? "critical" : "urgent");

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Medication round reminder", {
          body:
            overdueSchedules.length > 0
              ? `${overdueSchedules.length} medication task(s) overdue.`
              : `${dueSchedules.length} medication task(s) due now.`,
          tag: "nurse-medication-round",
        });
      }
    }

    runMedicationAlert();
    const interval = window.setInterval(runMedicationAlert, CLINICAL_ALERT_REPEAT_MS);

    return () => window.clearInterval(interval);
  }, [dueSchedules.length, overdueSchedules.length]);

  function selectPatient(patient: NursingPatient) {
    setSelectedPatient(patient);
    setVitalsForm((current) => ({ ...current, patientId: patient.id }));
    setNoteForm((current) => ({ ...current, patientId: patient.id }));
  }

  async function openIdCard(patient: NursingPatient) {
    selectPatient(patient);
    setPatientQr(await fetchPatientQr(patient.id));
    setShowIdCard(true);
  }

  async function handleMedicationAction(
    schedule: MedicationAdministrationSchedule,
    status: "given" | "held" | "missed" | "refused"
  ) {
    setSaving(true);
    setError(null);
    const result = await administerMedication(schedule.id, {
      status,
      scheduledFor: schedule.nextDueAt ?? new Date().toISOString(),
      nurseInitials: nurseInitials(user?.firstName, user?.lastName),
    });
    setSaving(false);

    if (!result.record) {
      setError(result.error ?? "Unable to record medication.");
      return;
    }

    setMessage(`Medication marked ${status}.`);
    await loadWorkspace();
  }

  async function handleVitalsSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await recordVitals(vitalsForm);
    setSaving(false);

    if (!result.record) {
      setError(result.error ?? "Unable to record vitals.");
      return;
    }

    setMessage("Vitals recorded.");
    setVitalsForm({ ...emptyVitalsForm, patientId: vitalsForm.patientId });
    await loadWorkspace();
  }

  async function handleNoteSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createNursingNote(noteForm);
    setSaving(false);

    if (!result.note) {
      setError(result.error ?? "Unable to save note.");
      return;
    }

    setMessage("Nursing note saved.");
    setNoteForm({ ...emptyNoteForm, patientId: noteForm.patientId });
    await loadWorkspace();
  }

  async function handleAcknowledge(
    orderType: "prescription" | "lab_request" | "admission_request" | "referral",
    orderId: string,
    patientId: string
  ) {
    setSaving(true);
    const result = await acknowledgeNurseOrder({ orderType, orderId, patientId });
    setSaving(false);

    if (!result.acknowledgement) {
      setError(result.error ?? "Unable to acknowledge order.");
      return;
    }

    setMessage("Order acknowledged.");
    await loadWorkspace();
  }

  function MedicationCard({ schedule }: { schedule: MedicationAdministrationSchedule }) {
    const state = scheduleState(schedule);
    return (
      <article className={`nurse-med-card ${state}`}>
        <div>
          <span className={`nurse-status ${state}`}>{state}</span>
          <h3>{schedule.medicationName}</h3>
          <p>{patientName(schedule.patient)} | {schedule.patient.mrn ?? "MRN pending"}</p>
        </div>
        <div className="nurse-med-meta">
          <span><strong>Dose</strong>{schedule.dose}</span>
          <span><strong>Frequency</strong>{schedule.frequency}</span>
          <span><strong>Due</strong>{formatDate(schedule.nextDueAt)}</span>
          <span><strong>Doctor</strong>Dr. {schedule.prescription?.doctor?.firstName ?? ""} {schedule.prescription?.doctor?.lastName ?? ""}</span>
        </div>
        {schedule.instructions && <p className="nurse-muted">{schedule.instructions}</p>}
        <div className="nurse-action-row">
          <button className="command-btn primary" disabled={saving} type="button" onClick={() => handleMedicationAction(schedule, "given")}>
            <FiCheck /> Given
          </button>
          <button className="command-btn" disabled={saving} type="button" onClick={() => handleMedicationAction(schedule, "held")}>Hold</button>
          <button className="command-btn danger" disabled={saving} type="button" onClick={() => handleMedicationAction(schedule, "missed")}>
            <FiX /> Missed
          </button>
          <button className="command-btn" disabled={saving} type="button" onClick={() => handleMedicationAction(schedule, "refused")}>Refused</button>
        </div>
        {schedule.records.length > 0 && (
          <small className="nurse-muted">
            Last: {schedule.records[0].status} by {schedule.records[0].nurseInitials} at {formatDate(schedule.records[0].administeredAt)}
          </small>
        )}
      </article>
    );
  }

  return (
    <AdminLayout>
      <div className="nurse-page">
        <section className="nurse-command">
          <div className="doctor-command-title">
            <span className="doctor-icon">
              <FaUserNurse />
            </span>
            <div>
              <p className="eyebrow">{meta.label}</p>
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>
          </div>
          <button className="command-btn" type="button" disabled={loading} onClick={loadWorkspace}>
            <FiRefreshCw /> Refresh
          </button>
        </section>

        {(message || error) && <div className={error ? "doctor-alert error" : "doctor-alert"}>{error ?? message}</div>}

        {currentView === "overview" && (
          <>
            <div className="nurse-stats-grid">
              <article><FiUser /><span>Patients</span><strong>{workspace?.summary.activePatients ?? 0}</strong></article>
              <article><FaBed /><span>Admitted</span><strong>{workspace?.summary.admittedPatients ?? 0}</strong></article>
              <article><FaCapsules /><span>Due meds</span><strong>{workspace?.summary.dueMedication ?? 0}</strong></article>
              <article><FiBell /><span>Overdue</span><strong>{workspace?.summary.overdueMedication ?? 0}</strong></article>
              <article><FiHeart /><span>Vitals</span><strong>{workspace?.summary.pendingVitals ?? 0}</strong></article>
              <article><FaNotesMedical /><span>Notes</span><strong>{workspace?.summary.nursingNotesToday ?? 0}</strong></article>
            </div>
            <section className="doctor-workspace-grid">
              {workspaceCards.map((card) => (
                <Link key={card.path} className="doctor-workspace-card" to={card.path}>
                  <span>{card.icon}</span>
                  <strong>{card.title}</strong>
                  <small>{card.detail}</small>
                </Link>
              ))}
            </section>
          </>
        )}

        {(currentView === "patients" || currentView === "vitals" || currentView === "notes") && (
          <section className="doctor-patient-strip">
            <div>
              <label htmlFor="nurse-patient-search">Find patient</label>
              <div className="doctor-search-field">
                <FiSearch />
                <input
                  id="nurse-patient-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, MRN, or phone"
                />
              </div>
            </div>
            {selectedPatient && (
              <div className="doctor-selected-patient">
                <div className="doctor-patient-avatar">{selectedPatient.firstName.charAt(0)}{selectedPatient.lastName.charAt(0)}</div>
                <div>
                  <strong>{patientName(selectedPatient)}</strong>
                  <span>{selectedPatient.mrn ?? "MRN pending"}</span>
                </div>
                <small>{wardLabel(selectedPatient)}</small>
              </div>
            )}
          </section>
        )}

        {currentView === "patients" && (
          <section className="nurse-card-list">
            {visiblePatients.map((patient) => (
              <article key={patient.id} className="nurse-patient-card">
                <div>
                  <span className={patient.isAdmitted ? "nurse-status admitted" : "nurse-status"}>{patient.isAdmitted ? "Admitted" : "Outpatient"}</span>
                  <h3>{patientName(patient)}</h3>
                  <p>{patient.mrn ?? "MRN pending"} | {patient.phone || "No phone"}</p>
                  <small>{patient.allergies ? `Allergy: ${patient.allergies}` : "No allergy recorded"}</small>
                </div>
                <div className="nurse-ward-chip">
                  <FaBed />
                  <span>{wardLabel(patient)}</span>
                </div>
                <div className="nurse-action-row">
                  <button className="command-btn" type="button" onClick={() => openIdCard(patient)}>
                    <FiCreditCard /> ID
                  </button>
                  <button className="command-btn primary" type="button" onClick={() => selectPatient(patient)}>
                    Select
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {currentView === "ward" && (
          <section className="nurse-card-list">
            {admittedPatients.map((patient) => (
              <article key={patient.id} className="nurse-patient-card">
                <div>
                  <span className="nurse-status admitted">Admitted</span>
                  <h3>{patientName(patient)}</h3>
                  <p>{patient.mrn ?? "MRN pending"} | {wardLabel(patient)}</p>
                  <small>{patient.currentAdmission?.diagnosis || patient.currentAdmission?.reason || "No diagnosis recorded"}</small>
                </div>
                <div className="nurse-action-row">
                  <Link className="command-btn" to="/nurse/medications" onClick={() => selectPatient(patient)}>
                    Medication
                  </Link>
                  <Link className="command-btn" to="/nurse/vitals" onClick={() => selectPatient(patient)}>
                    Vitals
                  </Link>
                  <Link className="command-btn primary" to="/nurse/notes" onClick={() => selectPatient(patient)}>
                    Note
                  </Link>
                </div>
              </article>
            ))}
            {admittedPatients.length === 0 && <p className="nurse-muted">No admitted patients found.</p>}
          </section>
        )}

        {currentView === "medications" && (
          <section className="nurse-med-layout">
            <div className="doctor-panel">
              <div className="doctor-panel-heading"><div><span>Now</span><h2>Due and overdue</h2></div><FiClock /></div>
              <div className="nurse-card-list">
                {[...overdueSchedules, ...dueSchedules].map((schedule) => <MedicationCard key={schedule.id} schedule={schedule} />)}
                {overdueSchedules.length + dueSchedules.length === 0 && <p className="nurse-muted">No medication due now.</p>}
              </div>
            </div>
            <div className="doctor-panel">
              <div className="doctor-panel-heading"><div><span>Later</span><h2>Upcoming</h2></div><FiBell /></div>
              <div className="nurse-card-list">
                {upcomingSchedules.slice(0, 8).map((schedule) => <MedicationCard key={schedule.id} schedule={schedule} />)}
                {upcomingSchedules.length === 0 && <p className="nurse-muted">No upcoming medication rounds.</p>}
              </div>
            </div>
          </section>
        )}

        {currentView === "orders" && (
          <section className="nurse-card-list">
            {(workspace?.doctorOrders.prescriptions ?? []).map((order) => (
              <article key={order.id} className="nurse-patient-card">
                <div>
                  <span className="nurse-status">Prescription</span>
                  <h3>{patientName(order.patient)}</h3>
                  <p>{order.prescriptionNumber} | Dr. {order.doctor?.firstName} {order.doctor?.lastName}</p>
                  <small>{order.items?.map((item: any) => item.medicationName).join(", ")}</small>
                </div>
                <button
                  className="command-btn primary"
                  disabled={saving || acknowledgementKeys.has(`prescription:${order.id}`)}
                  type="button"
                  onClick={() => handleAcknowledge("prescription", order.id, order.patientId)}
                >
                  {acknowledgementKeys.has(`prescription:${order.id}`) ? "Acknowledged" : "Acknowledge"}
                </button>
              </article>
            ))}
          </section>
        )}

        {currentView === "vitals" && (
          <section className="doctor-panel">
            <div className="doctor-panel-heading"><div><span>Vitals</span><h2>{selectedPatient ? patientName(selectedPatient) : "Select patient"}</h2></div><FiHeart /></div>
            <form className="doctor-action-form" onSubmit={handleVitalsSubmit}>
              <div className="doctor-form-grid compact">
                <label>Temp C<input value={vitalsForm.temperatureCelsius} onChange={(event) => setVitalsForm((current) => ({ ...current, temperatureCelsius: event.target.value }))} /></label>
                <label>SYS<input value={vitalsForm.systolicBp} onChange={(event) => setVitalsForm((current) => ({ ...current, systolicBp: event.target.value }))} /></label>
                <label>DIA<input value={vitalsForm.diastolicBp} onChange={(event) => setVitalsForm((current) => ({ ...current, diastolicBp: event.target.value }))} /></label>
                <label>Pulse<input value={vitalsForm.pulse} onChange={(event) => setVitalsForm((current) => ({ ...current, pulse: event.target.value }))} /></label>
                <label>Resp<input value={vitalsForm.respiration} onChange={(event) => setVitalsForm((current) => ({ ...current, respiration: event.target.value }))} /></label>
                <label>SpO2<input value={vitalsForm.spo2} onChange={(event) => setVitalsForm((current) => ({ ...current, spo2: event.target.value }))} /></label>
                <label>Pain<input value={vitalsForm.painScore} onChange={(event) => setVitalsForm((current) => ({ ...current, painScore: event.target.value }))} /></label>
              </div>
              <label>Notes<textarea rows={3} value={vitalsForm.notes} onChange={(event) => setVitalsForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button className="command-btn primary" disabled={saving || !vitalsForm.patientId} type="submit">Save vitals</button>
            </form>
          </section>
        )}

        {currentView === "notes" && (
          <section className="doctor-panel">
            <div className="doctor-panel-heading"><div><span>Notes</span><h2>{selectedPatient ? patientName(selectedPatient) : "Select patient"}</h2></div><FiFileText /></div>
            <form className="doctor-action-form" onSubmit={handleNoteSubmit}>
              <label>Shift<select value={noteForm.shift} onChange={(event) => setNoteForm((current) => ({ ...current, shift: event.target.value as any }))}><option value="general">General</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="night">Night</option></select></label>
              <label>Note<textarea rows={5} value={noteForm.note} onChange={(event) => setNoteForm((current) => ({ ...current, note: event.target.value }))} /></label>
              <button className="command-btn primary" disabled={saving || !noteForm.patientId} type="submit">Save note</button>
            </form>
          </section>
        )}

        {currentView === "reminders" && (
          <section className="nurse-med-layout">
            <div className="doctor-panel">
              <div className="doctor-panel-heading"><div><span>Alerts</span><h2>Medication reminders</h2></div><FiBell /></div>
              <div className="nurse-card-list">
                {[...overdueSchedules, ...dueSchedules, ...upcomingSchedules.slice(0, 6)].map((schedule) => <MedicationCard key={schedule.id} schedule={schedule} />)}
              </div>
            </div>
            <div className="doctor-panel">
              <div className="doctor-panel-heading"><div><span>Recent</span><h2>Nursing notes</h2></div><FiFileText /></div>
              <div className="nurse-card-list">
                {(workspace?.recentNotes ?? []).slice(0, 8).map((note) => (
                  <article key={note.id} className="doctor-record-card slim">
                    <div><strong>{patientName(note.patient)}</strong><span>{formatDate(note.recordedAt)} | {note.shift}</span></div>
                    <p>{note.note}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {showIdCard && selectedPatient && (
          <div className="nurse-id-modal">
            <div className="nurse-id-dialog">
              <div className="doctor-panel-heading">
                <div><span>ID Card</span><h2>{patientName(selectedPatient)}</h2></div>
                <button className="icon-btn" type="button" onClick={() => setShowIdCard(false)}><FiX /></button>
              </div>
              <PatientIdCard patient={selectedPatient} patientQr={patientQr} />
              <button className="command-btn primary" type="button" onClick={() => window.print()}><FiPrinter /> Print</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
