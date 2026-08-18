import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiEdit3,
  FiFileText,
  FiHeart,
  FiPhone,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiShield,
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
import "../../styles/nurse.css";

type NurseTool = "vitals" | "medications" | "notes" | "orders" | "summary";
type PatientFilter = "all" | "ward" | "outpatient";

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
  shift: "morning" as "morning" | "afternoon" | "night" | "general",
  note: "",
};

const quickNotePhrases = [
  "Vitals stable, resting comfortably in bed.",
  "Scheduled medication administered as prescribed.",
  "Doctor orders reviewed and acknowledged.",
  "Wound dressing inspected, clean and intact.",
  "IV fluids running at prescribed rate.",
  "Patient ambulatory and tolerating oral intake.",
];

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

function formatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.toUpperCase() || "PT";
}

function wardLabel(patient?: NursingPatient | null) {
  const admission = patient?.currentAdmission;
  if (!admission) return "Outpatient";

  return [
    admission.ward?.name,
    admission.room?.roomNumber ? `Rm ${admission.room.roomNumber}` : "",
    admission.bed?.bedNumber ? `Bed ${admission.bed.bedNumber}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
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
  const user = useAuthStore((state) => state.user);
  const [workspace, setWorkspace] = useState<NursingWorkspace | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<NursingPatient | null>(null);
  const [patientQr, setPatientQr] = useState<PatientQr | null>(null);
  const [showIdCard, setShowIdCard] = useState(false);
  const [search, setSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState<PatientFilter>("all");
  const [vitalsForm, setVitalsForm] = useState(emptyVitalsForm);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [activeTool, setActiveTool] = useState<NurseTool>("vitals");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const lastMedicationAlertRef = useRef(0);
  const workspaceTopRef = useRef<HTMLDivElement | null>(null);

  const patients = workspace?.patients ?? [];
  const admittedPatients = useMemo(() => patients.filter((p) => p.isAdmitted), [patients]);
  const outpatientPatients = useMemo(() => patients.filter((p) => !p.isAdmitted), [patients]);

  const schedules = workspace?.medicationSchedules ?? [];
  const dueSchedules = useMemo(() => schedules.filter((s) => scheduleState(s) === "due"), [schedules]);
  const overdueSchedules = useMemo(() => schedules.filter((s) => scheduleState(s) === "overdue"), [schedules]);

  const acknowledgementKeys = new Set(
    (workspace?.acknowledgements ?? []).map((item) => `${item.orderType}:${item.orderId}`)
  );

  const filteredPatients = useMemo(() => {
    let list = patients;
    if (patientFilter === "ward") list = admittedPatients;
    if (patientFilter === "outpatient") list = outpatientPatients;

    const term = search.trim().toLowerCase();
    if (!term) return list;

    return list.filter((p) =>
      [p.firstName, p.lastName, p.mrn, p.phone, p.currentAdmission?.ward?.name, p.currentAdmission?.bed?.bedNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [patients, patientFilter, search, admittedPatients, outpatientPatients]);

  const selectedSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.patientId === selectedPatient?.id),
    [schedules, selectedPatient?.id]
  );

  const selectedVitals = useMemo(
    () => (workspace?.recentVitals ?? []).filter((record) => record.patientId === selectedPatient?.id),
    [workspace?.recentVitals, selectedPatient?.id]
  );

  const selectedNotes = useMemo(
    () => (workspace?.recentNotes ?? []).filter((note) => note.patientId === selectedPatient?.id),
    [workspace?.recentNotes, selectedPatient?.id]
  );

  const selectedPrescriptions = useMemo(
    () => (workspace?.doctorOrders.prescriptions ?? []).filter((order) => order.patientId === selectedPatient?.id),
    [workspace?.doctorOrders.prescriptions, selectedPatient?.id]
  );

  const selectedLabRequests = useMemo(
    () => (workspace?.doctorOrders.labRequests ?? []).filter((order) => order.patientId === selectedPatient?.id),
    [workspace?.doctorOrders.labRequests, selectedPatient?.id]
  );

  const selectedAdmissionRequests = useMemo(
    () => (workspace?.doctorOrders.admissionRequests ?? []).filter((order) => order.patientId === selectedPatient?.id),
    [workspace?.doctorOrders.admissionRequests, selectedPatient?.id]
  );

  const selectedReferrals = useMemo(
    () => (workspace?.doctorOrders.referrals ?? []).filter((order) => order.patientId === selectedPatient?.id),
    [workspace?.doctorOrders.referrals, selectedPatient?.id]
  );

  const totalOrdersCount = useMemo(
    () =>
      selectedPrescriptions.length +
      selectedLabRequests.length +
      selectedAdmissionRequests.length +
      selectedReferrals.length,
    [selectedPrescriptions, selectedLabRequests, selectedAdmissionRequests, selectedReferrals]
  );

  // Load Nursing Workspace
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
  }, []);

  // Audio Alerts on Due / Overdue Meds
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

  function handlePatientCardClick(patient: NursingPatient, tool?: NurseTool) {
    selectPatient(patient);
    if (tool) setActiveTool(tool);
    setError(null);
    setMessage(null);
  }

  async function openIdCard(patient: NursingPatient) {
    selectPatient(patient);
    setPatientQr(await fetchPatientQr(patient.id));
    setShowIdCard(true);
  }

  // Medication Administration
  async function handleMedicationAction(
    schedule: MedicationAdministrationSchedule,
    status: "given" | "held" | "missed" | "refused"
  ) {
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await administerMedication(schedule.id, {
      status,
      nurseInitials: `${user?.firstName?.charAt(0) ?? ""}${user?.lastName?.charAt(0) ?? ""}`.toUpperCase() || "RN",
      note: status === "held" ? "Dose temporarily held per clinical evaluation" : undefined,
    });

    setSaving(false);

    if (!result.record) {
      setError(result.error ?? "Unable to record medication administration.");
      return;
    }

    setMessage(`Medication marked as ${status}.`);
    await loadWorkspace();
  }

  // Vitals Recording
  async function handleVitalsSubmit(event: FormEvent) {
    event.preventDefault();
    if (!vitalsForm.patientId) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await recordVitals({
      patientId: vitalsForm.patientId,
      temperatureCelsius: vitalsForm.temperatureCelsius || undefined,
      systolicBp: vitalsForm.systolicBp || undefined,
      diastolicBp: vitalsForm.diastolicBp || undefined,
      pulse: vitalsForm.pulse || undefined,
      respiration: vitalsForm.respiration || undefined,
      spo2: vitalsForm.spo2 || undefined,
      painScore: vitalsForm.painScore || undefined,
      notes: vitalsForm.notes.trim() || undefined,
    });

    setSaving(false);

    if (!result.record) {
      setError(result.error ?? "Unable to record vitals.");
      return;
    }

    setMessage("Vitals recorded successfully.");
    setVitalsForm({ ...emptyVitalsForm, patientId: vitalsForm.patientId });
    await loadWorkspace();
  }

  // Quick fill normal vitals
  function fillNormalVitals() {
    setVitalsForm((current) => ({
      ...current,
      temperatureCelsius: "36.8",
      systolicBp: "120",
      diastolicBp: "80",
      pulse: "72",
      respiration: "18",
      spo2: "98",
      painScore: "0",
    }));
  }

  // Nursing Note Submit
  async function handleNoteSubmit(event: FormEvent) {
    event.preventDefault();
    if (!noteForm.patientId || !noteForm.note.trim()) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await createNursingNote({
      patientId: noteForm.patientId,
      shift: noteForm.shift,
      note: noteForm.note.trim(),
    });

    setSaving(false);

    if (!result.note) {
      setError(result.error ?? "Unable to save nursing note.");
      return;
    }

    setMessage("Nursing note saved.");
    setNoteForm({ ...emptyNoteForm, patientId: noteForm.patientId });
    await loadWorkspace();
  }

  // Doctor Order Acknowledge
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

    setMessage("Doctor order acknowledged.");
    await loadWorkspace();
  }

  const latestVitals = selectedVitals[0];

  return (
    <AdminLayout>
      <div className="nurse-page-v2" ref={workspaceTopRef}>
        {/* Top Nurse Profile & Shift Status Header */}
        <section className="nurse-profile-header">
          <div className="nurse-identity-block">
            <div className="nurse-avatar-badge">
              <FaUserNurse />
            </div>
            <div>
              <div className="nurse-name-row">
                <h1>{user ? `${user.firstName} ${user.lastName}` : "Nurse Desk"}</h1>
                <span className="nurse-duty-pill">
                  <span className="live-dot" /> On Duty
                </span>
              </div>
              <p className="nurse-dept-subtitle">Inpatient Ward Rounds • Emergency Triage</p>
            </div>
          </div>

          <div className="nurse-quick-metrics">
            <button
              type="button"
              className="quick-metric-pill"
              onClick={() => setPatientFilter("ward")}
              title="Admitted in Wards"
            >
              <FaBed className="metric-icon ward" />
              <span><strong>{admittedPatients.length}</strong> in Ward</span>
            </button>
            <button
              type="button"
              className={`quick-metric-pill ${dueSchedules.length + overdueSchedules.length > 0 ? "has-alert" : ""}`}
              onClick={() => setActiveTool("medications")}
              title="Medication doses due"
            >
              <FaCapsules className="metric-icon med" />
              <span><strong>{dueSchedules.length + overdueSchedules.length}</strong> Due Meds</span>
            </button>
            <button
              type="button"
              className="nurse-refresh-btn"
              onClick={loadWorkspace}
              disabled={loading}
              title="Refresh desk data"
            >
              <FiRefreshCw className={loading ? "spin" : ""} />
            </button>
          </div>
        </section>

        {/* Global Notifications */}
        {(message || error) && (
          <div className={`nurse-toast-alert ${error ? "error" : "success"}`}>
            {error ? <FiAlertTriangle /> : <FiCheckCircle />}
            <span>{error ?? message}</span>
            <button type="button" onClick={() => { setMessage(null); setError(null); }}>
              <FiX />
            </button>
          </div>
        )}

        {/* TOP PATIENT SELECTOR SECTION (Patient list right at the top!) */}
        <section className="nurse-patient-selector-section">
          <div className="patient-selector-header">
            <div className="filter-chips-row">
              <button
                type="button"
                className={`filter-chip ${patientFilter === "all" ? "active" : ""}`}
                onClick={() => setPatientFilter("all")}
              >
                All Patients ({patients.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${patientFilter === "ward" ? "active" : ""}`}
                onClick={() => setPatientFilter("ward")}
              >
                <FaBed /> Ward ({admittedPatients.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${patientFilter === "outpatient" ? "active" : ""}`}
                onClick={() => setPatientFilter("outpatient")}
              >
                Outpatients ({outpatientPatients.length})
              </button>
            </div>

            <div className="nurse-search-box">
              <FiSearch />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, MRN, Bed..."
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                  <FiX />
                </button>
              )}
            </div>
          </div>

          {/* Horizontal / Compact Patient Cards Carousel */}
          <div className="nurse-patient-carousel">
            {filteredPatients.length === 0 && (
              <div className="patient-empty-notice">
                <FiUser />
                <p>No patients match filter or search.</p>
              </div>
            )}

            {filteredPatients.map((patient) => {
              const isSelected = selectedPatient?.id === patient.id;
              const hasDueMed = schedules.some(
                (s) => s.patientId === patient.id && (scheduleState(s) === "due" || scheduleState(s) === "overdue")
              );

              return (
                <button
                  key={patient.id}
                  type="button"
                  className={`nurse-patient-pill-card ${isSelected ? "selected" : ""} ${patient.isAdmitted ? "ward-patient" : ""}`}
                  onClick={() => handlePatientCardClick(patient)}
                >
                  <div className="patient-pill-avatar">
                    {getInitials(patient.firstName, patient.lastName)}
                  </div>
                  <div className="patient-pill-info">
                    <strong className="patient-pill-name">{patientName(patient)}</strong>
                    <div className="patient-pill-tags">
                      <span className="patient-mrn">{patient.mrn || "No MRN"}</span>
                      <span className={`patient-loc ${patient.isAdmitted ? "admitted" : "outpatient"}`}>
                        {patient.isAdmitted ? wardLabel(patient) : "Outpatient"}
                      </span>
                    </div>
                  </div>
                  {hasDueMed && <span className="patient-due-indicator" title="Medication due" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* ACTIVE PATIENT WORKSPACE */}
        {selectedPatient ? (
          <main className="nurse-active-patient-workspace">
            {/* Patient Spotlight Hero Card */}
            <div className="patient-spotlight-card">
              <div className="patient-spotlight-main">
                <div className="spotlight-avatar">
                  {getInitials(selectedPatient.firstName, selectedPatient.lastName)}
                </div>
                <div className="spotlight-details">
                  <div className="spotlight-name-line">
                    <h2>{patientName(selectedPatient)}</h2>
                    <span className={`admission-badge ${selectedPatient.isAdmitted ? "admitted" : "outpatient"}`}>
                      {selectedPatient.isAdmitted ? "🏥 Admitted" : "🚶 Outpatient"}
                    </span>
                  </div>
                  <div className="spotlight-meta-grid">
                    <span><strong>MRN:</strong> {selectedPatient.mrn || "Pending"}</span>
                    <span><strong>Location:</strong> {wardLabel(selectedPatient)}</span>
                    {selectedPatient.bloodGroup && <span><strong>Blood:</strong> {selectedPatient.bloodGroup}</span>}
                    {selectedPatient.allergies && (
                      <span className="allergy-alert-pill">
                        <FiAlertTriangle /> {selectedPatient.allergies}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Latest Vitals Snapshot Bar */}
              {latestVitals && (
                <div className="spotlight-vitals-snapshot">
                  <span className="snapshot-label">Latest:</span>
                  <span className="snapshot-item">BP: <strong>{latestVitals.systolicBp ?? "-"}/{latestVitals.diastolicBp ?? "-"}</strong></span>
                  <span className="snapshot-item">Pulse: <strong>{latestVitals.pulse ?? "-"} bpm</strong></span>
                  <span className="snapshot-item">Temp: <strong>{latestVitals.temperatureCelsius ?? "-"}°C</strong></span>
                  <span className="snapshot-item">SpO2: <strong>{latestVitals.spo2 ?? "-"}%</strong></span>
                  <span className="snapshot-time">{formatTime(latestVitals.recordedAt)}</span>
                </div>
              )}
            </div>

            {/* BIG 1-TAP ACTION BUTTONS (Clean, Touch-Friendly Action Hub) */}
            <nav className="nurse-action-hub-buttons" aria-label="Nurse patient tools">
              <button
                type="button"
                className={`nurse-hub-action-btn vitals-btn ${activeTool === "vitals" ? "active" : ""}`}
                onClick={() => setActiveTool("vitals")}
              >
                <FiHeart className="hub-btn-icon" />
                <div>
                  <strong>Record Vitals</strong>
                  <small>{selectedVitals.length} recorded</small>
                </div>
              </button>

              <button
                type="button"
                className={`nurse-hub-action-btn meds-btn ${activeTool === "medications" ? "active" : ""} ${
                  selectedSchedules.some((s) => scheduleState(s) === "due" || scheduleState(s) === "overdue")
                    ? "has-due"
                    : ""
                }`}
                onClick={() => setActiveTool("medications")}
              >
                <FaCapsules className="hub-btn-icon" />
                <div>
                  <strong>Medications</strong>
                  <small>{selectedSchedules.length} schedules</small>
                </div>
              </button>

              <button
                type="button"
                className={`nurse-hub-action-btn notes-btn ${activeTool === "notes" ? "active" : ""}`}
                onClick={() => setActiveTool("notes")}
              >
                <FaNotesMedical className="hub-btn-icon" />
                <div>
                  <strong>Shift Notes</strong>
                  <small>{selectedNotes.length} notes</small>
                </div>
              </button>

              <button
                type="button"
                className={`nurse-hub-action-btn orders-btn ${activeTool === "orders" ? "active" : ""}`}
                onClick={() => setActiveTool("orders")}
              >
                <FiFileText className="hub-btn-icon" />
                <div>
                  <strong>Doctor Orders</strong>
                  <small>{totalOrdersCount} active</small>
                </div>
              </button>

              <button
                type="button"
                className="nurse-hub-action-btn id-btn"
                onClick={() => openIdCard(selectedPatient)}
                title="Print Patient ID"
              >
                <FiCreditCard className="hub-btn-icon" />
                <div>
                  <strong>ID Card</strong>
                  <small>QR & Badge</small>
                </div>
              </button>
            </nav>

            {/* ACTION TOOL WORKBENCH CONTENT */}
            <section className="nurse-tool-workbench">
              {/* 1. VITALS OBSERVATION TOOL */}
              {activeTool === "vitals" && (
                <div className="nurse-workbench-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Record Patient Observations</h3>
                      <p>Enter current vital signs. Abnormal values are highlighted automatically.</p>
                    </div>
                    <button type="button" className="quick-fill-btn" onClick={fillNormalVitals}>
                      ⚡ Normal Defaults
                    </button>
                  </div>

                  <form className="nurse-vitals-form" onSubmit={handleVitalsSubmit}>
                    <div className="vitals-inputs-grid">
                      <label className="vital-input-card">
                        <span className="vital-title">🌡️ Temperature (°C)</span>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="36.8"
                          value={vitalsForm.temperatureCelsius}
                          onChange={(e) => setVitalsForm((c) => ({ ...c, temperatureCelsius: e.target.value }))}
                        />
                        {Number(vitalsForm.temperatureCelsius) >= 38 && (
                          <span className="vital-flag-pill hot">🔥 Fever Alert</span>
                        )}
                      </label>

                      <label className="vital-input-card">
                        <span className="vital-title">💓 Blood Pressure (SYS/DIA)</span>
                        <div className="bp-input-split">
                          <input
                            type="number"
                            placeholder="120"
                            value={vitalsForm.systolicBp}
                            onChange={(e) => setVitalsForm((c) => ({ ...c, systolicBp: e.target.value }))}
                          />
                          <span className="bp-slash">/</span>
                          <input
                            type="number"
                            placeholder="80"
                            value={vitalsForm.diastolicBp}
                            onChange={(e) => setVitalsForm((c) => ({ ...c, diastolicBp: e.target.value }))}
                          />
                        </div>
                        {Number(vitalsForm.systolicBp) >= 140 && (
                          <span className="vital-flag-pill hot">⚠️ High BP</span>
                        )}
                      </label>

                      <label className="vital-input-card">
                        <span className="vital-title">❤️ Pulse Rate (bpm)</span>
                        <input
                          type="number"
                          placeholder="72"
                          value={vitalsForm.pulse}
                          onChange={(e) => setVitalsForm((c) => ({ ...c, pulse: e.target.value }))}
                        />
                      </label>

                      <label className="vital-input-card">
                        <span className="vital-title">🫁 SpO2 Oxygen (%)</span>
                        <input
                          type="number"
                          placeholder="98"
                          value={vitalsForm.spo2}
                          onChange={(e) => setVitalsForm((c) => ({ ...c, spo2: e.target.value }))}
                        />
                        {Number(vitalsForm.spo2) > 0 && Number(vitalsForm.spo2) < 95 && (
                          <span className="vital-flag-pill hot">⚠️ Low SpO2</span>
                        )}
                      </label>

                      <label className="vital-input-card">
                        <span className="vital-title">💨 Respiration (/min)</span>
                        <input
                          type="number"
                          placeholder="18"
                          value={vitalsForm.respiration}
                          onChange={(e) => setVitalsForm((c) => ({ ...c, respiration: e.target.value }))}
                        />
                      </label>

                      <label className="vital-input-card">
                        <span className="vital-title">⚡ Pain Score (0 - 10)</span>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          placeholder="0"
                          value={vitalsForm.painScore}
                          onChange={(e) => setVitalsForm((c) => ({ ...c, painScore: e.target.value }))}
                        />
                      </label>
                    </div>

                    <label className="vitals-note-field">
                      <span>Clinical Observation Note</span>
                      <textarea
                        rows={2}
                        placeholder="Optional clinical observation notes..."
                        value={vitalsForm.notes}
                        onChange={(e) => setVitalsForm((c) => ({ ...c, notes: e.target.value }))}
                      />
                    </label>

                    <button
                      type="submit"
                      className="nurse-submit-cta"
                      disabled={saving || !vitalsForm.patientId}
                    >
                      <FiHeart />
                      {saving ? "Saving Observation..." : "Save Vitals Observation"}
                    </button>
                  </form>

                  {/* Vitals History List */}
                  <div className="vitals-history-block">
                    <h4>Recent Vitals History</h4>
                    {selectedVitals.length === 0 && (
                      <p className="empty-history-text">No previous vitals recorded for this patient.</p>
                    )}
                    <div className="vitals-timeline-list">
                      {selectedVitals.map((v) => (
                        <div key={v.id} className="vitals-history-card">
                          <div className="vitals-history-time">
                            <strong>{formatDate(v.recordedAt)}</strong>
                            <small>{formatTime(v.recordedAt)}</small>
                          </div>
                          <div className="vitals-history-data">
                            <span>BP: <strong>{v.systolicBp ?? "-"}/{v.diastolicBp ?? "-"}</strong></span>
                            <span>Pulse: <strong>{v.pulse ?? "-"} bpm</strong></span>
                            <span>Temp: <strong>{v.temperatureCelsius ?? "-"}°C</strong></span>
                            <span>SpO2: <strong>{v.spo2 ?? "-"}%</strong></span>
                            {v.painScore !== null && v.painScore !== undefined && (
                              <span>Pain: <strong>{v.painScore}/10</strong></span>
                            )}
                          </div>
                          {v.notes && <p className="vitals-history-note">"{v.notes}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. MEDICATION ROUNDS (MAR) TOOL */}
              {activeTool === "medications" && (
                <div className="nurse-workbench-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Medication Administration Record (MAR)</h3>
                      <p>Check due medications and log dose administrations.</p>
                    </div>
                  </div>

                  {selectedSchedules.length === 0 ? (
                    <div className="empty-meds-box">
                      <FaCapsules />
                      <p>No active prescription schedules for this patient.</p>
                    </div>
                  ) : (
                    <div className="nurse-mar-cards-list">
                      {selectedSchedules.map((schedule) => {
                        const state = scheduleState(schedule);

                        return (
                          <article key={schedule.id} className={`nurse-mar-card ${state}`}>
                            <div className="mar-card-top">
                              <div>
                                <span className={`mar-status-tag ${state}`}>{state.toUpperCase()}</span>
                                <h4>{schedule.medicationName}</h4>
                                <p className="mar-dosage-line">
                                  <strong>Dose:</strong> {schedule.dose} • <strong>Freq:</strong> {schedule.frequency}
                                </p>
                              </div>
                              <div className="mar-due-time">
                                <span>Next Due:</span>
                                <strong>{formatTime(schedule.nextDueAt) || "Completed"}</strong>
                              </div>
                            </div>

                            {schedule.instructions && (
                              <p className="mar-instructions">📌 {schedule.instructions}</p>
                            )}

                            {/* Large Touch-Target Action Buttons */}
                            <div className="mar-action-buttons-row">
                              <button
                                type="button"
                                className="mar-action-btn given"
                                disabled={saving}
                                onClick={() => handleMedicationAction(schedule, "given")}
                              >
                                <FiCheck /> Given (Now)
                              </button>
                              <button
                                type="button"
                                className="mar-action-btn hold"
                                disabled={saving}
                                onClick={() => handleMedicationAction(schedule, "held")}
                              >
                                Hold
                              </button>
                              <button
                                type="button"
                                className="mar-action-btn missed"
                                disabled={saving}
                                onClick={() => handleMedicationAction(schedule, "missed")}
                              >
                                Missed
                              </button>
                              <button
                                type="button"
                                className="mar-action-btn refused"
                                disabled={saving}
                                onClick={() => handleMedicationAction(schedule, "refused")}
                              >
                                Refused
                              </button>
                            </div>

                            {schedule.records.length > 0 && (
                              <small className="mar-last-record">
                                Last logged: {schedule.records[0].status.toUpperCase()} at {formatDate(schedule.records[0].administeredAt)}
                              </small>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. SHIFT NOTES TOOL */}
              {activeTool === "notes" && (
                <div className="nurse-workbench-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Nursing Shift Notes & Handover</h3>
                      <p>Log observations, patient condition, and ward handover notes.</p>
                    </div>
                  </div>

                  <form className="nurse-note-form" onSubmit={handleNoteSubmit}>
                    <div className="shift-selector-row">
                      <span className="shift-label">Shift:</span>
                      {(["morning", "afternoon", "night", "general"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`shift-pill ${noteForm.shift === s ? "active" : ""}`}
                          onClick={() => setNoteForm((c) => ({ ...c, shift: s }))}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Quick Phrases */}
                    <div className="quick-phrases-box">
                      <span className="phrases-label">⚡ 1-Tap Quick Note:</span>
                      <div className="phrases-pills">
                        {quickNotePhrases.map((phrase, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="phrase-chip"
                            onClick={() =>
                              setNoteForm((c) => ({
                                ...c,
                                note: c.note ? `${c.note} ${phrase}` : phrase,
                              }))
                            }
                          >
                            + {phrase}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="note-textarea-field">
                      <span>Nursing Note Content</span>
                      <textarea
                        rows={4}
                        placeholder="Write detailed patient care notes, reactions, or handovers..."
                        value={noteForm.note}
                        onChange={(e) => setNoteForm((c) => ({ ...c, note: e.target.value }))}
                      />
                    </label>

                    <button
                      type="submit"
                      className="nurse-submit-cta"
                      disabled={saving || !noteForm.patientId || !noteForm.note.trim()}
                    >
                      <FaNotesMedical />
                      {saving ? "Saving Note..." : "Save Nursing Note"}
                    </button>
                  </form>

                  {/* Notes Timeline */}
                  <div className="notes-timeline-block">
                    <h4>Previous Shift Notes</h4>
                    {selectedNotes.length === 0 && (
                      <p className="empty-history-text">No nursing notes logged for this patient yet.</p>
                    )}
                    <div className="notes-list">
                      {selectedNotes.map((n) => (
                        <article key={n.id} className="nurse-note-card">
                          <div className="note-card-header">
                            <span className="shift-badge">{n.shift.toUpperCase()}</span>
                            <span className="note-date">{formatDate(n.recordedAt)}</span>
                          </div>
                          <p className="note-text">{n.note}</p>
                          <small className="note-author">Logged by {n.recordedBy?.firstName ?? "Nurse"}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DOCTOR ORDERS TOOL */}
              {activeTool === "orders" && (
                <div className="nurse-workbench-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Doctor Orders & Directives</h3>
                      <p>Review and acknowledge prescriptions, lab orders, and admission directives.</p>
                    </div>
                  </div>

                  {totalOrdersCount === 0 ? (
                    <div className="empty-orders-box">
                      <FiFileText />
                      <p>No active doctor directives found for this patient.</p>
                    </div>
                  ) : (
                    <div className="orders-cards-list">
                      {selectedPrescriptions.map((order) => {
                        const isAck = acknowledgementKeys.has(`prescription:${order.id}`);
                        return (
                          <article key={order.id} className="nurse-order-card">
                            <div className="order-content">
                              <span className="order-type-pill prescription">Prescription</span>
                              <h4>{order.prescriptionNumber}</h4>
                              <p>{order.items?.map((i: any) => `${i.medicationName} (${i.dosage})`).join(", ")}</p>
                              <small>Ordered by Dr. {order.doctor?.firstName} {order.doctor?.lastName}</small>
                            </div>
                            <button
                              type="button"
                              className={`order-ack-btn ${isAck ? "acknowledged" : ""}`}
                              disabled={saving || isAck}
                              onClick={() => handleAcknowledge("prescription", order.id, order.patientId)}
                            >
                              <FiCheck /> {isAck ? "Acknowledged" : "Acknowledge"}
                            </button>
                          </article>
                        );
                      })}

                      {selectedLabRequests.map((order: any) => {
                        const isAck = acknowledgementKeys.has(`lab_request:${order.id}`);
                        return (
                          <article key={order.id} className="nurse-order-card">
                            <div className="order-content">
                              <span className="order-type-pill lab">Lab Investigation</span>
                              <h4>{order.testType || order.testName || "Lab Requisition"}</h4>
                              <p>{order.notes || "Routine sample collection requested"}</p>
                            </div>
                            <button
                              type="button"
                              className={`order-ack-btn ${isAck ? "acknowledged" : ""}`}
                              disabled={saving || isAck}
                              onClick={() => handleAcknowledge("lab_request", order.id, order.patientId)}
                            >
                              <FiCheck /> {isAck ? "Acknowledged" : "Acknowledge"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 5. SUMMARY TOOL */}
              {activeTool === "summary" && (
                <div className="nurse-workbench-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Patient Care Overview</h3>
                      <p>Demographics, emergency contacts, and admission records.</p>
                    </div>
                  </div>

                  <div className="nurse-summary-details-grid">
                    <div className="summary-info-card">
                      <span>Full Name</span>
                      <strong>{patientName(selectedPatient)}</strong>
                    </div>
                    <div className="summary-info-card">
                      <span>MRN</span>
                      <strong>{selectedPatient.mrn || "Pending"}</strong>
                    </div>
                    <div className="summary-info-card">
                      <span>Ward & Bed</span>
                      <strong>{wardLabel(selectedPatient)}</strong>
                    </div>
                    <div className="summary-info-card">
                      <span>Contact Phone</span>
                      <strong>
                        {selectedPatient.phone ? (
                          <a href={`tel:${selectedPatient.phone}`} className="phone-dial-link">
                            <FiPhone /> {selectedPatient.phone}
                          </a>
                        ) : (
                          "No phone"
                        )}
                      </strong>
                    </div>
                    <div className="summary-info-card">
                      <span>Insurance Provider</span>
                      <strong>{selectedPatient.insuranceProvider?.name || "Self Pay"}</strong>
                    </div>
                    <div className="summary-info-card">
                      <span>Emergency Contact</span>
                      <strong>
                        {selectedPatient.emergencyContactName || "Not set"}{" "}
                        {selectedPatient.emergencyContactPhone && `(${selectedPatient.emergencyContactPhone})`}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </main>
        ) : (
          <div className="nurse-no-patient-state">
            <FiUser />
            <h3>No Patient Selected</h3>
            <p>Select a patient from the top list to record observations or manage medications.</p>
          </div>
        )}

        {/* Patient ID Card Modal */}
        {showIdCard && selectedPatient && (
          <div className="nurse-id-modal-backdrop" onClick={() => setShowIdCard(false)}>
            <div className="nurse-id-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-top">
                <h3>Patient ID Card</h3>
                <button type="button" onClick={() => setShowIdCard(false)} aria-label="Close ID card">
                  <FiX />
                </button>
              </div>
              <PatientIdCard
                patient={selectedPatient}
                patientQr={patientQr}
              />
              <button type="button" className="print-modal-btn" onClick={() => window.print()}>
                <FiPrinter /> Print ID Card
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
