import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiHeart,
  FiInfo,
  FiList,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUsers,
  FiVolume2,
  FiVolumeX,
  FiWifi,
  FiWifiOff,
  FiX,
  FiChevronDown,
  FiHome,
  FiHelpCircle,
} from "react-icons/fi";
import {
  FaBed,
  FaCapsules,
  FaNotesMedical,
  FaUserNurse,
  FaStethoscope,
} from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import { startRoleTour } from "../../components/tour/RoleTour";
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
  NursingPatient,
  NursingWorkspace,
  VitalSignRecord,
  NursingNote,
} from "../../types/nursing";
import type { PatientQr } from "../../types/patient";
import {
  CLINICAL_ALERT_REPEAT_MS,
  playClinicalAlertSound,
} from "../../utils/alertSound";
import { confirmImportantAction, showSuccessWithSound } from "../../utils/sweetAlert";
import "../../styles/nurse.css";

// 4 simple, intuitive tabs for everyday nursing work
type NurseTool = "vitals" | "medications" | "patients" | "notes";

const emptyVitalsForm = {
  patientId: "",
  temperatureCelsius: "",
  systolicBp: "",
  diastolicBp: "",
  pulse: "",
  respiration: "",
  spo2: "",
  painScore: "0",
  weightKg: "",
  heightCm: "",
  notes: "",
};

const emptyNoteForm: {
  patientId: string;
  shift: "morning" | "afternoon" | "night";
  note: string;
} = {
  patientId: "",
  shift: "morning",
  note: "",
};

function normalizeNurseView(value?: string): NurseTool {
  if (value === "medications") return "medications";
  if (value === "patients" || value === "inpatients" || value === "ward" || value === "wardmap" || value === "orders") {
    return "patients";
  }
  if (value === "notes") return "notes";
  return "vitals";
}

function patientName(patient?: NursingPatient | null) {
  if (!patient) return "Select Patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || "Unknown Patient";
}

function calculateAge(dob?: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? `${age} yrs` : "Infant";
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

function formatTimeOnly(value?: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function wardLabel(patient?: NursingPatient | null) {
  const admission = patient?.currentAdmission;
  if (!admission) return "Outpatient / Triage";

  return [
    admission.ward?.name || "General Ward",
    admission.room?.roomNumber ? `Room ${admission.room.roomNumber}` : "",
    admission.bed?.bedNumber ? `Bed ${admission.bed.bedNumber}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function scheduleState(schedule: MedicationAdministrationSchedule) {
  if (!schedule.nextDueAt) return "completed";

  const due = new Date(schedule.nextDueAt).getTime();
  const now = Date.now();
  const soon = now + 45 * 60 * 1000;

  if (due < now - 30 * 60 * 1000) return "overdue";
  if (due <= soon) return "due";
  return "upcoming";
}

export default function NurseDashboardPage() {
  const { view } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [workspace, setWorkspace] = useState<NursingWorkspace | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<NursingPatient | null>(null);
  const [patientQr, setPatientQr] = useState<PatientQr | null>(null);
  const [showIdCard, setShowIdCard] = useState(false);
  const [search, setSearch] = useState("");
  const [medFilter, setMedFilter] = useState<"all" | "due" | "upcoming">("all");
  const [patientCategoryFilter, setPatientCategoryFilter] = useState<"all" | "admitted" | "outpatient">("all");
  const [isMuted, setIsMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [vitalsForm, setVitalsForm] = useState(emptyVitalsForm);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [activeTool, setActiveTool] = useState<NurseTool>(normalizeNurseView(view));

  // Synchronize URL view parameter with active tool and patient filters
  useEffect(() => {
    if (!view) {
      setActiveTool("vitals");
      return;
    }
    const lower = view.toLowerCase();
    if (lower === "medications" || lower === "medicine" || lower === "meds") {
      setActiveTool("medications");
    } else if (lower === "ward" || lower === "inpatients" || lower === "beds") {
      setActiveTool("patients");
      setPatientCategoryFilter("admitted");
    } else if (lower === "patients" || lower === "directory") {
      setActiveTool("patients");
      setPatientCategoryFilter("all");
    } else if (lower === "orders") {
      setActiveTool("patients");
    } else if (lower === "notes") {
      setActiveTool("notes");
    } else if (lower === "vitals" || lower === "triage") {
      setActiveTool("vitals");
    }
  }, [view]);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userRoles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const isAdminOrSuperAdmin = useMemo(
    () =>
      userRoles.some((r) => {
        const lower = r.toLowerCase();
        return lower === "super admin" || lower === "administrator" || lower === "admin";
      }),
    [userRoles]
  );

  const lastMedicationAlertRef = useRef(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const patients = workspace?.patients ?? [];
  const admittedPatients = patients.filter((p) => p.isAdmitted);
  const outpatientList = patients.filter((p) => !p.isAdmitted);

  const schedules = workspace?.medicationSchedules ?? [];
  const dueSchedules = schedules.filter((s) => scheduleState(s) === "due");
  const overdueSchedules = schedules.filter((s) => scheduleState(s) === "overdue");
  const urgentMedCount = dueSchedules.length + overdueSchedules.length;

  const visiblePatients = useMemo(() => {
    let list = patients;
    if (patientCategoryFilter === "admitted") list = admittedPatients;
    if (patientCategoryFilter === "outpatient") list = outpatientList;

    const term = search.trim().toLowerCase();
    if (!term) return list;

    return list.filter((p) =>
      [p.firstName, p.lastName, p.mrn, p.phone, wardLabel(p)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [patients, admittedPatients, outpatientList, patientCategoryFilter, search]);

  const filteredSchedules = useMemo(() => {
    if (medFilter === "due") {
      return schedules.filter((s) => {
        const st = scheduleState(s);
        return st === "due" || st === "overdue";
      });
    }
    if (medFilter === "upcoming") {
      return schedules.filter((s) => scheduleState(s) === "upcoming");
    }
    return schedules;
  }, [schedules, medFilter]);

  // Vitals Real-time Plain-English Evaluation
  const vitalsAnalysis = useMemo(() => {
    const sbp = Number(vitalsForm.systolicBp);
    const dbp = Number(vitalsForm.diastolicBp);
    const temp = Number(vitalsForm.temperatureCelsius);
    const spo2 = Number(vitalsForm.spo2);
    const pulse = Number(vitalsForm.pulse);

    let bpText = "";
    let bpColor = "#10b981"; // green
    if (sbp > 0 && dbp > 0) {
      if (sbp >= 140 || dbp >= 90) {
        bpText = "High BP (Hypertension)";
        bpColor = "#ef4444";
      } else if (sbp >= 130 || dbp >= 85) {
        bpText = "Mildly High BP";
        bpColor = "#f59e0b";
      } else if (sbp < 90 || dbp < 60) {
        bpText = "Low BP (Hypotension)";
        bpColor = "#f59e0b";
      } else {
        bpText = "Normal Blood Pressure";
        bpColor = "#10b981";
      }
    }

    let tempText = "";
    let tempColor = "#10b981";
    if (temp > 0) {
      if (temp >= 38.0) {
        tempText = "High Fever (>38°C)";
        tempColor = "#ef4444";
      } else if (temp >= 37.4) {
        tempText = "Mild Fever (37.4°C - 37.9°C)";
        tempColor = "#f59e0b";
      } else if (temp < 35.5) {
        tempText = "Low Body Temperature (<35.5°C)";
        tempColor = "#f59e0b";
      } else {
        tempText = "Normal Temperature (36.5°C - 37.3°C)";
        tempColor = "#10b981";
      }
    }

    let spo2Text = "";
    let spo2Color = "#10b981";
    if (spo2 > 0) {
      if (spo2 < 93) {
        spo2Text = "Low Oxygen (<93%) - Alert Doctor";
        spo2Color = "#ef4444";
      } else if (spo2 < 96) {
        spo2Text = "Borderline Oxygen (93-95%)";
        spo2Color = "#f59e0b";
      } else {
        spo2Text = "Normal Oxygen (96-100%)";
        spo2Color = "#10b981";
      }
    }

    let pulseText = "";
    let pulseColor = "#10b981";
    if (pulse > 0) {
      if (pulse > 100) {
        pulseText = "Fast Heart Rate (Tachycardia)";
        pulseColor = "#f59e0b";
      } else if (pulse < 60) {
        pulseText = "Slow Heart Rate (Bradycardia)";
        pulseColor = "#f59e0b";
      } else {
        pulseText = "Normal Heart Rate (60-100 bpm)";
        pulseColor = "#10b981";
      }
    }

    return { bpText, bpColor, tempText, tempColor, spo2Text, spo2Color, pulseText, pulseColor };
  }, [vitalsForm]);

  async function loadWorkspace() {
    setLoading(true);
    const result = await fetchNursingWorkspace();
    setLoading(false);

    if (!result.workspace) {
      setError(result.error ?? "Unable to load nurse station records.");
      return;
    }

    setWorkspace(result.workspace);
    if (!selectedPatient && result.workspace.patients[0]) {
      selectPatient(result.workspace.patients[0]);
    }
  }

  useEffect(() => {
    void loadWorkspace();
    const interval = window.setInterval(loadWorkspace, 25000);
    return () => window.clearInterval(interval);
  }, []);

  // Medication Audio Alert
  useEffect(() => {
    if (urgentMedCount === 0 || isMuted) {
      lastMedicationAlertRef.current = 0;
      return;
    }

    function runMedicationAlert() {
      if (isMuted) return;
      const now = Date.now();
      if (now - lastMedicationAlertRef.current < CLINICAL_ALERT_REPEAT_MS) return;

      lastMedicationAlertRef.current = now;
      playClinicalAlertSound(overdueSchedules.length > 0 ? "critical" : "urgent");
    }

    runMedicationAlert();
    const interval = window.setInterval(runMedicationAlert, CLINICAL_ALERT_REPEAT_MS);
    return () => window.clearInterval(interval);
  }, [urgentMedCount, overdueSchedules.length, isMuted]);

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
    const confirmed = await confirmImportantAction({
      title: "Confirm Medication Administration?",
      text: `Are you sure you want to record ${schedule.medicationName || "this medication"} as ${status.toUpperCase()} for ${patientName(schedule.patient)}?`,
      confirmButtonText: "Yes, Record Dose",
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    const result = await administerMedication(schedule.id, {
      status,
      scheduledFor: schedule.nextDueAt ?? new Date().toISOString(),
      nurseInitials: `${user?.firstName?.charAt(0) ?? "N"}${user?.lastName?.charAt(0) ?? "S"}`.toUpperCase(),
    });
    setSaving(false);

    if (!result.record) {
      setError(result.error ?? "Unable to record medication.");
      return;
    }

    setMessage(`✓ Medication marked as ${status.toUpperCase()} for ${patientName(schedule.patient)}.`);
    void showSuccessWithSound({
      title: "Medication Administered",
      text: `${schedule.medicationName || "Medication"} recorded as ${status.toUpperCase()} for ${patientName(schedule.patient)}.`,
    });
    await loadWorkspace();
  }

  async function handleVitalsSubmit(event: FormEvent) {
    event.preventDefault();
    if (!vitalsForm.patientId) {
      setError("Please select a patient before saving vitals.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await recordVitals({
      patientId: vitalsForm.patientId,
      temperatureCelsius: vitalsForm.temperatureCelsius,
      systolicBp: vitalsForm.systolicBp,
      diastolicBp: vitalsForm.diastolicBp,
      pulse: vitalsForm.pulse,
      respiration: vitalsForm.respiration,
      spo2: vitalsForm.spo2,
      painScore: vitalsForm.painScore,
      weightKg: vitalsForm.weightKg,
      heightCm: vitalsForm.heightCm,
      notes: vitalsForm.notes,
    });
    setSaving(false);

    if (!result.record) {
      setError(result.error ?? "Unable to record vital signs.");
      return;
    }

    setMessage(`✓ Vitals recorded successfully for ${patientName(selectedPatient)}!`);
    setVitalsForm((current) => ({
      ...emptyVitalsForm,
      patientId: current.patientId,
    }));
    await loadWorkspace();
  }

  async function handleNoteSubmit(event: FormEvent) {
    event.preventDefault();
    if (!noteForm.patientId) {
      setError("Please select a patient before writing a note.");
      return;
    }
    if (!noteForm.note.trim()) {
      setError("Please type your observation or note content.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await createNursingNote({
      patientId: noteForm.patientId,
      shift: noteForm.shift,
      note: noteForm.note,
    });
    setSaving(false);

    if (!result.note) {
      setError(result.error ?? "Unable to save nursing note.");
      return;
    }

    setMessage(`✓ Shift note saved successfully!`);
    setNoteForm((current) => ({
      ...emptyNoteForm,
      patientId: current.patientId,
    }));
    await loadWorkspace();
  }

  async function handleAcknowledge(
    orderType: "prescription" | "lab_request" | "admission_request" | "referral",
    orderId: string,
    patientId: string
  ) {
    const confirmed = await confirmImportantAction({
      title: "Acknowledge Doctor Order?",
      text: "Are you sure you want to record this doctor order as processed and completed?",
      confirmButtonText: "Yes, Acknowledge",
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    const result = await acknowledgeNurseOrder({
      orderType,
      orderId,
      patientId,
    });
    setSaving(false);

    if (!result.acknowledgement) {
      setError(result.error ?? "Unable to acknowledge doctor order.");
      return;
    }

    setMessage("✓ Doctor order acknowledged.");
    void showSuccessWithSound({
      title: "Doctor Order Acknowledged",
      text: "Order marked as processed and completed.",
    });
    await loadWorkspace();
  }

  // Filtered lists for currently selected patient
  const selectedVitals = useMemo(
    () => (workspace?.recentVitals ?? []).filter((r) => r.patientId === selectedPatient?.id),
    [workspace?.recentVitals, selectedPatient?.id]
  );

  const selectedNotes = useMemo(
    () => (workspace?.recentNotes ?? []).filter((n) => n.patientId === selectedPatient?.id),
    [workspace?.recentNotes, selectedPatient?.id]
  );

  const selectedOrders = useMemo(() => {
    if (!selectedPatient || !workspace?.doctorOrders) return [];
    const orders: Array<{ id: string; type: "prescription" | "lab_request" | "admission_request"; title: string; details: string; date: string }> = [];

    for (const p of workspace.doctorOrders.prescriptions ?? []) {
      if (p.patientId === selectedPatient.id) {
        orders.push({
          id: p.id,
          type: "prescription",
          title: `Prescription #${p.prescriptionNumber}`,
          details: `${p.items?.length || 0} medication(s) prescribed by Dr. ${p.doctor?.lastName || "Doctor"}`,
          date: p.prescribedAt,
        });
      }
    }

    for (const l of workspace.doctorOrders.labRequests ?? []) {
      if (l.patientId === selectedPatient.id) {
        orders.push({
          id: l.id,
          type: "lab_request",
          title: `Lab Test: ${l.template?.name || "Investigation"}`,
          details: `Status: ${l.status?.toUpperCase()} • Sample: ${l.sampleCollected ? "Collected" : "Pending"}`,
          date: l.requestedAt,
        });
      }
    }

    return orders;
  }, [workspace?.doctorOrders, selectedPatient]);

  return (
    <AdminLayout>
      <div className="nurse-simple-page">
        {/* Quick Executive Return Bar for Admins */}
        {isAdminOrSuperAdmin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(135deg, #0c4a60 0%, #083344 100%)",
              color: "#ffffff",
              padding: "0.65rem 1.25rem",
              borderRadius: "12px",
              marginBottom: "1rem",
              boxShadow: "0 2px 10px rgba(12, 74, 96, 0.15)",
              border: "1px solid rgba(212, 175, 55, 0.4)",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.88rem", fontWeight: 500 }}>
              <FiHome style={{ color: "#d4af37", fontSize: "1.15rem" }} />
              <span>
                <strong>Executive Access:</strong> You are currently viewing the Ward & Inpatient Nurse Station.
              </span>
            </div>
            <Link
              to="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.4rem 1rem",
                borderRadius: "8px",
                background: "#d4af37",
                color: "#0c4a60",
                fontWeight: 700,
                fontSize: "0.84rem",
                textDecoration: "none",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                transition: "all 0.15s ease",
              }}
            >
              ← Back to Main Dashboard
            </Link>
          </div>
        )}

        {/* 1. FRIENDLY NURSE STATION HEADER */}
        <header className="nurse-simple-header">
          <div className="nurse-header-left">
            <div className="nurse-header-avatar">
              <FaUserNurse />
            </div>
            <div>
              <div className="nurse-greeting-row">
                <h1>Nurse Station</h1>
                <span className="nurse-status-badge on-duty">
                  <span className="nurse-status-dot" /> On Duty
                </span>
                {isOnline ? (
                  <span className="nurse-status-badge online"><FiWifi /> Connected</span>
                ) : (
                  <span className="nurse-status-badge offline"><FiWifiOff /> Offline</span>
                )}
              </div>
              <p className="nurse-greeting-sub">
                Welcome, <strong>Nurse {user?.firstName} {user?.lastName}</strong> • MDS Hospital Ward
              </p>
            </div>
          </div>

          <div className="nurse-header-actions">
            <button
              type="button"
              className="nurse-pill-btn tour-btn"
              onClick={startRoleTour}
              title="Need help? Start interactive Nurse Walkthrough"
            >
              <FiHelpCircle />
              <span>Tour & Guide</span>
            </button>
            <button
              type="button"
              className={`nurse-pill-btn ${isMuted ? "muted" : "alert-on"}`}
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Turn on alert sounds" : "Mute alert sounds"}
            >
              {isMuted ? <FiVolumeX /> : <FiVolume2 />}
              <span>{isMuted ? "Alerts Muted" : "Alerts Active"}</span>
            </button>
            <button
              type="button"
              className="nurse-pill-btn refresh"
              disabled={loading}
              onClick={loadWorkspace}
              title="Refresh nurse station"
            >
              <FiRefreshCw className={loading ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* 2. INSTANT FEEDBACK MESSAGES */}
        {message && (
          <div className="nurse-alert-banner success">
            <FiCheckCircle />
            <span>{message}</span>
            <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message" title="Dismiss">
              <FiX size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {error && (
          <div className="nurse-alert-banner error">
            <FiAlertCircle />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error" title="Dismiss">
              <FiX size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* 3. FEW MENUS: 4 CLEAR, LARGE NAVIGATION TABS */}
        <nav className="nurse-simple-tabs" aria-label="Nurse Station Sections">
          <button
            type="button"
            className={`nurse-tab-btn ${activeTool === "vitals" ? "active" : ""}`}
            onClick={() => {
              setActiveTool("vitals");
              navigate("/nurse/vitals");
            }}
          >
            <div className="nurse-tab-icon vitals"><FaStethoscope /></div>
            <div className="nurse-tab-text">
              <strong>Record Vitals</strong>
              <small>Triage & Health Checks</small>
            </div>
          </button>

          <button
            type="button"
            className={`nurse-tab-btn ${activeTool === "medications" ? "active" : ""}`}
            onClick={() => {
              setActiveTool("medications");
              navigate("/nurse/medications");
            }}
          >
            <div className="nurse-tab-icon meds"><FaCapsules /></div>
            <div className="nurse-tab-text">
              <strong>Give Medicine</strong>
              <small>
                {urgentMedCount > 0 ? (
                  <span className="nurse-tab-badge urgent">{urgentMedCount} Due Now</span>
                ) : (
                  `${schedules.length} Scheduled`
                )}
              </small>
            </div>
          </button>

          <button
            type="button"
            className={`nurse-tab-btn ${activeTool === "patients" ? "active" : ""}`}
            onClick={() => {
              setActiveTool("patients");
              setPatientCategoryFilter("admitted");
              navigate("/nurse/ward");
            }}
          >
            <div className="nurse-tab-icon ward"><FaBed /></div>
            <div className="nurse-tab-text">
              <strong>Patients & Beds</strong>
              <small>{admittedPatients.length} Inpatients • {outpatientList.length} Outpatients</small>
            </div>
          </button>

          <button
            type="button"
            className={`nurse-tab-btn ${activeTool === "notes" ? "active" : ""}`}
            onClick={() => {
              setActiveTool("notes");
              navigate("/nurse/notes");
            }}
          >
            <div className="nurse-tab-icon notes"><FaNotesMedical /></div>
            <div className="nurse-tab-text">
              <strong>Shift Notes</strong>
              <small>Observations & Handoff</small>
            </div>
          </button>
        </nav>

        {/* 4. ACTIVE PATIENT SPOTLIGHT & QUICK SELECT BAR */}
        <section className="nurse-patient-strip">
          <div className="nurse-patient-strip-top">
            <div className="nurse-search-wrap">
              <FiSearch className="nurse-search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient by name, bed, or MRN..."
                className="nurse-search-input"
              />
              {search && (
                <button type="button" className="nurse-search-clear" onClick={() => setSearch("")}>
                  <FiX />
                </button>
              )}
            </div>

            {selectedPatient && (
              <button
                type="button"
                className="nurse-id-quick-btn"
                onClick={() => openIdCard(selectedPatient)}
                title="View scannable patient ID card"
              >
                <FiPrinter /> Patient ID & Health Card
              </button>
            )}
          </div>

          {/* Quick Select Patient Chips (Tap any patient to activate) */}
          <div className="nurse-quick-chips-row">
            <span className="nurse-quick-chips-label"><FiUser /> Quick Pick:</span>
            <div className="nurse-quick-chips-scroll">
              {patients.slice(0, 10).map((p) => {
                const isSelected = selectedPatient?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`nurse-quick-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => selectPatient(p)}
                  >
                    <span className="chip-avatar">{p.firstName?.charAt(0)}{p.lastName?.charAt(0)}</span>
                    <span className="chip-name">{p.firstName} {p.lastName}</span>
                    {p.isAdmitted && <span className="chip-bed-tag"><FaBed /> Inpatient</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Patient Card Banner */}
          {selectedPatient ? (
            <div className="nurse-selected-patient-card">
              <div className="nurse-selected-avatar">
                {selectedPatient.firstName?.charAt(0)}{selectedPatient.lastName?.charAt(0)}
              </div>
              <div className="nurse-selected-details">
                <div className="nurse-selected-name-line">
                  <h2>{patientName(selectedPatient)}</h2>
                  <span className="nurse-mrn-badge">MRN: {selectedPatient.mrn || "Pending"}</span>
                  <span className={`nurse-adm-badge ${selectedPatient.isAdmitted ? "admitted" : "outpatient"}`}>
                    {selectedPatient.isAdmitted ? "🛏️ Inpatient (Bed Assigned)" : "🩺 Outpatient / Triage"}
                  </span>
                </div>
                <p className="nurse-selected-meta">
                  <span><strong>Age:</strong> {calculateAge(selectedPatient.dateOfBirth) || "Not recorded"}</span>
                  <span>•</span>
                  <span><strong>Gender:</strong> {selectedPatient.gender?.toUpperCase()}</span>
                  <span>•</span>
                  <span><strong>Location:</strong> {wardLabel(selectedPatient)}</span>
                  {selectedPatient.bloodGroup && (
                    <>
                      <span>•</span>
                      <span><strong>Blood:</strong> {selectedPatient.bloodGroup}</span>
                    </>
                  )}
                  {selectedPatient.allergies && (
                    <span className="nurse-allergy-alert">
                      <FiAlertTriangle /> Allergies: {selectedPatient.allergies}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="nurse-no-patient-prompt">
              <FiInfo />
              <span>Please pick a patient above or search to record vitals, medications, and notes.</span>
            </div>
          )}
        </section>

        {/* ====================================================================
            TAB 1: RECORD VITALS & TRIAGE (SUPER SIMPLE FORM WITH LIVE BADGES)
            ==================================================================== */}
        {activeTool === "vitals" && (
          <section className="nurse-workspace-card">
            <div className="nurse-card-header">
              <div className="nurse-card-title">
                <FaStethoscope className="title-icon vitals" />
                <div>
                  <h2>Record Vital Signs & Triage</h2>
                  <p>
                    {selectedPatient
                      ? `Recording vitals for ${patientName(selectedPatient)} (${selectedPatient.mrn || "MRN"})`
                      : "Select a patient above to start recording vitals."}
                  </p>
                </div>
              </div>
              <div className="nurse-vitals-quick-tools">
                <button
                  type="button"
                  className="nurse-quick-preset-btn"
                  onClick={() => {
                    setVitalsForm((prev) => ({
                      ...prev,
                      temperatureCelsius: "36.8",
                      systolicBp: "120",
                      diastolicBp: "80",
                      pulse: "75",
                      spo2: "98",
                      respiration: "16",
                      painScore: "0",
                    }));
                  }}
                  title="Auto-fill standard normal adult baseline vitals"
                >
                  ⚡ Fill Normal Baseline
                </button>
              </div>
            </div>

            <form onSubmit={handleVitalsSubmit} className="nurse-vitals-form">
              <div className="nurse-vitals-grid">
                {/* 1. Body Temperature */}
                <div className="nurse-input-box">
                  <label className="nurse-input-label">
                    <span>🌡️ Body Temperature (°C)</span>
                    {vitalsAnalysis.tempText && (
                      <span className="nurse-calc-pill" style={{ color: vitalsAnalysis.tempColor, borderColor: vitalsAnalysis.tempColor }}>
                        {vitalsAnalysis.tempText}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="45"
                    placeholder="e.g. 36.8"
                    value={vitalsForm.temperatureCelsius}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temperatureCelsius: e.target.value })}
                    className="nurse-big-input"
                  />
                  <small className="nurse-input-hint">Normal: 36.5°C – 37.3°C</small>
                </div>

                {/* 2. Blood Pressure (Systolic & Diastolic Side by Side) */}
                <div className="nurse-input-box">
                  <label className="nurse-input-label">
                    <span>💓 Blood Pressure (mmHg)</span>
                    {vitalsAnalysis.bpText && (
                      <span className="nurse-calc-pill" style={{ color: vitalsAnalysis.bpColor, borderColor: vitalsAnalysis.bpColor }}>
                        {vitalsAnalysis.bpText}
                      </span>
                    )}
                  </label>
                  <div className="nurse-bp-inputs-row">
                    <input
                      type="number"
                      min="50"
                      max="260"
                      placeholder="Systolic (120)"
                      value={vitalsForm.systolicBp}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, systolicBp: e.target.value })}
                      className="nurse-big-input"
                    />
                    <span className="nurse-bp-slash">/</span>
                    <input
                      type="number"
                      min="30"
                      max="160"
                      placeholder="Diastolic (80)"
                      value={vitalsForm.diastolicBp}
                      onChange={(e) => setVitalsForm({ ...vitalsForm, diastolicBp: e.target.value })}
                      className="nurse-big-input"
                    />
                  </div>
                  <small className="nurse-input-hint">Normal: 120 / 80 mmHg</small>
                </div>

                {/* 3. Pulse / Heart Rate */}
                <div className="nurse-input-box">
                  <label className="nurse-input-label">
                    <span>🫀 Pulse Rate (BPM)</span>
                    {vitalsAnalysis.pulseText && (
                      <span className="nurse-calc-pill" style={{ color: vitalsAnalysis.pulseColor, borderColor: vitalsAnalysis.pulseColor }}>
                        {vitalsAnalysis.pulseText}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="220"
                    placeholder="e.g. 72"
                    value={vitalsForm.pulse}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                    className="nurse-big-input"
                  />
                  <small className="nurse-input-hint">Normal resting: 60 – 100 bpm</small>
                </div>

                {/* 4. Oxygen Saturation (SpO2) */}
                <div className="nurse-input-box">
                  <label className="nurse-input-label">
                    <span>🫁 Oxygen Saturation (SpO2 %)</span>
                    {vitalsAnalysis.spo2Text && (
                      <span className="nurse-calc-pill" style={{ color: vitalsAnalysis.spo2Color, borderColor: vitalsAnalysis.spo2Color }}>
                        {vitalsAnalysis.spo2Text}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    placeholder="e.g. 98"
                    value={vitalsForm.spo2}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                    className="nurse-big-input"
                  />
                  <small className="nurse-input-hint">Normal: 96% – 100%</small>
                </div>

                {/* 5. Weight & Respiration */}
                <div className="nurse-input-box">
                  <label className="nurse-input-label">
                    <span>⚖️ Weight (Kg)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="300"
                    placeholder="e.g. 68.5"
                    value={vitalsForm.weightKg}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, weightKg: e.target.value })}
                    className="nurse-big-input"
                  />
                  <small className="nurse-input-hint">Patient body weight</small>
                </div>

                <div className="nurse-input-box">
                  <label className="nurse-input-label">
                    <span>🌬️ Respiration Rate (/min)</span>
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="60"
                    placeholder="e.g. 16"
                    value={vitalsForm.respiration}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, respiration: e.target.value })}
                    className="nurse-big-input"
                  />
                  <small className="nurse-input-hint">Normal: 12 – 20 breaths/min</small>
                </div>

                {/* 6. Pain Level Scale (0 - 10) */}
                <div className="nurse-input-box full-width">
                  <label className="nurse-input-label">
                    <span>😣 Pain Scale Level (0 = No Pain, 10 = Severe)</span>
                    <span
                      className="nurse-calc-pill"
                      style={{
                        color: Number(vitalsForm.painScore) >= 7 ? "#ef4444" : Number(vitalsForm.painScore) >= 4 ? "#f59e0b" : "#10b981",
                        borderColor: Number(vitalsForm.painScore) >= 7 ? "#ef4444" : Number(vitalsForm.painScore) >= 4 ? "#f59e0b" : "#10b981",
                      }}
                    >
                      {Number(vitalsForm.painScore) === 0
                        ? "0 - No Pain"
                        : Number(vitalsForm.painScore) <= 3
                        ? `${vitalsForm.painScore} - Mild Pain`
                        : Number(vitalsForm.painScore) <= 6
                        ? `${vitalsForm.painScore} - Moderate Pain`
                        : `${vitalsForm.painScore} - Severe Pain`}
                    </span>
                  </label>
                  <div className="nurse-pain-chips-row">
                    {[
                      { val: "0", label: "0 None" },
                      { val: "2", label: "2 Mild" },
                      { val: "4", label: "4 Moderate" },
                      { val: "6", label: "6 Distressing" },
                      { val: "8", label: "8 Severe" },
                      { val: "10", label: "10 Unbearable" },
                    ].map((chip) => (
                      <button
                        key={chip.val}
                        type="button"
                        className={`nurse-pain-chip ${vitalsForm.painScore === chip.val ? "active" : ""}`}
                        onClick={() => setVitalsForm({ ...vitalsForm, painScore: chip.val })}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clinical Remarks / Symptoms */}
              <div className="nurse-input-box full-width">
                <label className="nurse-input-label">
                  <span>📝 Nurse Triage Observation / Notes (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patient complaining of headache and chills since last night..."
                  value={vitalsForm.notes}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                  className="nurse-text-input"
                />
              </div>

              {/* Big, Friendly Submit Button */}
              <div className="nurse-submit-row">
                <button
                  type="submit"
                  disabled={saving || !selectedPatient}
                  className="nurse-primary-action-btn"
                >
                  <FiCheckCircle />
                  <span>{saving ? "Saving Vitals..." : `✓ Save Vitals for ${selectedPatient ? selectedPatient.firstName : "Patient"}`}</span>
                </button>
              </div>
            </form>

            {/* Past Vitals History for this Patient */}
            {selectedVitals.length > 0 && (
              <div className="nurse-history-section">
                <h3>Past Vitals for {patientName(selectedPatient)} ({selectedVitals.length})</h3>
                <div className="nurse-history-grid">
                  {selectedVitals.slice(0, 4).map((v) => (
                    <div key={v.id} className="nurse-history-card">
                      <div className="history-time-row">
                        <span className="history-date"><FiClock /> {formatDate(v.recordedAt)}</span>
                        <span className="history-nurse">By: {v.recordedBy?.firstName || "Nurse"}</span>
                      </div>
                      <div className="history-vitals-values">
                        {v.temperatureCelsius && (
                          <span className="vital-tag">🌡️ {v.temperatureCelsius}°C</span>
                        )}
                        {v.systolicBp && v.diastolicBp && (
                          <span className="vital-tag">💓 {v.systolicBp}/{v.diastolicBp} mmHg</span>
                        )}
                        {v.pulse && <span className="vital-tag">🫀 {v.pulse} bpm</span>}
                        {v.spo2 && <span className="vital-tag">🫁 {v.spo2}% SpO2</span>}
                      </div>
                      {v.notes && <p className="history-notes-text">"{v.notes}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ====================================================================
            TAB 2: GIVE MEDICATIONS (CLEAR, ACCESSIBLE MEDICATION CARDS)
            ==================================================================== */}
        {activeTool === "medications" && (
          <section className="nurse-workspace-card">
            <div className="nurse-card-header">
              <div className="nurse-card-title">
                <FaCapsules className="title-icon meds" />
                <div>
                  <h2>Medication Administration (MAR)</h2>
                  <p>Administer scheduled medications and record doses with 1 click.</p>
                </div>
              </div>

              {/* Medication Filters */}
              <div className="nurse-filter-pills">
                <button
                  type="button"
                  className={`nurse-filter-btn ${medFilter === "all" ? "active" : ""}`}
                  onClick={() => setMedFilter("all")}
                >
                  All ({schedules.length})
                </button>
                <button
                  type="button"
                  className={`nurse-filter-btn ${medFilter === "due" ? "active" : ""}`}
                  onClick={() => setMedFilter("due")}
                >
                  ⚠️ Due Now & Overdue ({urgentMedCount})
                </button>
                <button
                  type="button"
                  className={`nurse-filter-btn ${medFilter === "upcoming" ? "active" : ""}`}
                  onClick={() => setMedFilter("upcoming")}
                >
                  Upcoming
                </button>
              </div>
            </div>

            {filteredSchedules.length === 0 ? (
              <div className="nurse-empty-state">
                <FaCapsules />
                <h3>No medications due right now!</h3>
                <p>All scheduled patient medications are up to date or none matched your filter.</p>
              </div>
            ) : (
              <div className="nurse-meds-cards-grid">
                {filteredSchedules.map((schedule) => {
                  const state = scheduleState(schedule);
                  const isUrgent = state === "overdue" || state === "due";
                  return (
                    <article key={schedule.id} className={`nurse-med-card ${state}`}>
                      <div className="med-card-top">
                        <div>
                          <span className={`med-due-pill ${state}`}>
                            <FiClock />
                            {state === "overdue" && "OVERDUE • Give Immediately"}
                            {state === "due" && "DUE NOW"}
                            {state === "upcoming" && `Next: ${formatTimeOnly(schedule.nextDueAt)}`}
                            {state === "completed" && "Completed"}
                          </span>
                          <h3 className="med-drug-name">{schedule.medicationName}</h3>
                          <span className="med-dosage-text">
                            <strong>Dose:</strong> {schedule.dose} • {schedule.route || "Oral"} • {schedule.frequency}
                          </span>
                        </div>

                        <div className="med-patient-box">
                          <strong className="med-patient-name">{patientName(schedule.patient)}</strong>
                          <span className="med-patient-location">{wardLabel(schedule.patient)}</span>
                        </div>
                      </div>

                      {schedule.instructions && (
                        <div className="med-instruction-box">
                          <FiInfo /> <span>{schedule.instructions}</span>
                        </div>
                      )}

                      {/* Giant Action Button: Mark as Given */}
                      <div className="med-card-actions">
                        <button
                          type="button"
                          disabled={saving}
                          className="med-give-btn"
                          onClick={() => handleMedicationAction(schedule, "given")}
                        >
                          <FiCheckCircle />
                          <span>✓ Mark as Given</span>
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          className="med-secondary-btn"
                          onClick={() => {
                            const reason = window.prompt("Reason for holding / not giving medication (e.g. Patient asleep / NPO):");
                            if (reason !== null) {
                              void handleMedicationAction(schedule, "held");
                            }
                          }}
                        >
                          Hold / Skip
                        </button>
                      </div>

                      {/* Last Given Record */}
                      {schedule.records?.length > 0 && (
                        <div className="med-last-given">
                          <FiCheck /> Last given at {formatTimeOnly(schedule.records[0].administeredAt)} by {schedule.records[0].nurseInitials}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ====================================================================
            TAB 3: PATIENTS & WARD BEDS (CLEAN LIST WITH 1-TAP ACTIONS)
            ==================================================================== */}
        {activeTool === "patients" && (
          <section className="nurse-workspace-card">
            <div className="nurse-card-header">
              <div className="nurse-card-title">
                <FaBed className="title-icon ward" />
                <div>
                  <h2>Patients in Hospital & Ward Beds</h2>
                  <p>Find any admitted patient or triage outpatient and manage their care.</p>
                </div>
              </div>

              {/* Patient Type Filter */}
              <div className="nurse-filter-pills">
                <button
                  type="button"
                  className={`nurse-filter-btn ${patientCategoryFilter === "all" ? "active" : ""}`}
                  onClick={() => setPatientCategoryFilter("all")}
                >
                  All Patients ({patients.length})
                </button>
                <button
                  type="button"
                  className={`nurse-filter-btn ${patientCategoryFilter === "admitted" ? "active" : ""}`}
                  onClick={() => setPatientCategoryFilter("admitted")}
                >
                  🛏️ Inpatients in Beds ({admittedPatients.length})
                </button>
                <button
                  type="button"
                  className={`nurse-filter-btn ${patientCategoryFilter === "outpatient" ? "active" : ""}`}
                  onClick={() => setPatientCategoryFilter("outpatient")}
                >
                  🩺 Outpatients / Triage ({outpatientList.length})
                </button>
              </div>
            </div>

            {visiblePatients.length === 0 ? (
              <div className="nurse-empty-state">
                <FaBed />
                <h3>No patients matched your search</h3>
                <p>Try searching with another name, room number, or MRN.</p>
              </div>
            ) : (
              <div className="nurse-patient-cards-grid">
                {visiblePatients.map((patient) => {
                  const isSelected = selectedPatient?.id === patient.id;
                  return (
                    <article key={patient.id} className={`nurse-inpatient-card ${isSelected ? "selected" : ""}`}>
                      <div className="inpatient-card-top">
                        <div className="inpatient-avatar">
                          {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                        </div>
                        <div className="inpatient-info">
                          <h3 className="inpatient-name">{patient.firstName} {patient.lastName}</h3>
                          <span className="inpatient-mrn">MRN: <strong>{patient.mrn || "N/A"}</strong> • {calculateAge(patient.dateOfBirth)} • {patient.gender?.toUpperCase()}</span>
                          <span className="inpatient-ward-badge">
                            <FaBed /> {wardLabel(patient)}
                          </span>
                        </div>
                      </div>

                      {patient.currentAdmission?.diagnosis && (
                        <p className="inpatient-diagnosis">
                          <strong>Diagnosis:</strong> {patient.currentAdmission.diagnosis}
                        </p>
                      )}

                      {/* 1-Tap Quick Action Buttons */}
                      <div className="inpatient-actions-row">
                        <button
                          type="button"
                          className="inpatient-action-btn vitals"
                          onClick={() => {
                            selectPatient(patient);
                            setActiveTool("vitals");
                            navigate("/nurse/vitals");
                          }}
                        >
                          <FaStethoscope /> Take Vitals
                        </button>
                        <button
                          type="button"
                          className="inpatient-action-btn meds"
                          onClick={() => {
                            selectPatient(patient);
                            setActiveTool("medications");
                            navigate("/nurse/medications");
                          }}
                        >
                          <FaCapsules /> Give Meds
                        </button>
                        <button
                          type="button"
                          className="inpatient-action-btn notes"
                          onClick={() => {
                            selectPatient(patient);
                            setActiveTool("notes");
                            navigate("/nurse/notes");
                          }}
                        >
                          <FaNotesMedical /> Note
                        </button>
                        <button
                          type="button"
                          className="inpatient-action-btn id-card"
                          onClick={() => openIdCard(patient)}
                          title="Patient ID Card"
                        >
                          <FiPrinter /> ID Card
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Doctor Orders for Active Patient (if any) */}
            {selectedOrders.length > 0 && (
              <div className="nurse-orders-section">
                <h3>Doctor Orders for {patientName(selectedPatient)} ({selectedOrders.length})</h3>
                <div className="nurse-orders-list">
                  {selectedOrders.map((order) => (
                    <div key={order.id} className="nurse-order-row">
                      <div>
                        <strong>{order.title}</strong>
                        <p>{order.details}</p>
                        <small><FiClock /> Ordered at: {formatDate(order.date)}</small>
                      </div>
                      <button
                        type="button"
                        className="nurse-ack-btn"
                        onClick={() => handleAcknowledge(order.type, order.id, selectedPatient!.id)}
                      >
                        <FiCheck /> Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ====================================================================
            TAB 4: SHIFT NOTES (SIMPLE OBSERVATIONS & HANDOFF)
            ==================================================================== */}
        {activeTool === "notes" && (
          <section className="nurse-workspace-card">
            <div className="nurse-card-header">
              <div className="nurse-card-title">
                <FaNotesMedical className="title-icon notes" />
                <div>
                  <h2>Nurse Shift Notes & Observations</h2>
                  <p>
                    {selectedPatient
                      ? `Writing note for ${patientName(selectedPatient)} (${selectedPatient.mrn || "MRN"})`
                      : "Select a patient above to write a shift observation."}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleNoteSubmit} className="nurse-note-form">
              <div className="nurse-shift-selector">
                <label>Duty Shift:</label>
                <div className="nurse-shift-pills">
                  {(["morning", "afternoon", "night"] as const).map((shift) => (
                    <button
                      key={shift}
                      type="button"
                      className={`nurse-shift-btn ${noteForm.shift === shift ? "active" : ""}`}
                      onClick={() => setNoteForm({ ...noteForm, shift })}
                    >
                      {shift === "morning" && "☀️ Morning Shift"}
                      {shift === "afternoon" && "🌤️ Afternoon Shift"}
                      {shift === "night" && "🌙 Night Shift"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="nurse-input-box full-width">
                <label className="nurse-input-label">
                  <span>Observation & Clinical Handoff Note</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Patient resting comfortably in bed. Slept well overnight. Tolerated morning breakfast without vomiting. Vitals stable..."
                  value={noteForm.note}
                  onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                  className="nurse-textarea-input"
                />
              </div>

              <div className="nurse-submit-row">
                <button
                  type="submit"
                  disabled={saving || !selectedPatient}
                  className="nurse-primary-action-btn"
                >
                  <FiCheckCircle />
                  <span>{saving ? "Saving Note..." : "✓ Save Nurse Shift Note"}</span>
                </button>
              </div>
            </form>

            {/* Previous Shift Notes for this Patient */}
            {selectedNotes.length > 0 && (
              <div className="nurse-history-section">
                <h3>Previous Notes for {patientName(selectedPatient)} ({selectedNotes.length})</h3>
                <div className="nurse-notes-list">
                  {selectedNotes.map((n) => (
                    <div key={n.id} className="nurse-note-item">
                      <div className="note-header-line">
                        <span className={`note-shift-tag ${n.shift}`}>{n.shift?.toUpperCase()} SHIFT</span>
                        <span className="note-time"><FiClock /> {formatDate(n.recordedAt)}</span>
                        <span className="note-author">By Nurse {n.recordedBy?.firstName || "Staff"}</span>
                      </div>
                      <p className="note-content-text">{n.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 5. PATIENT ID & HEALTH RECORD CARD MODAL */}
        {showIdCard && selectedPatient && (
          <div className="nurse-modal-backdrop" onClick={() => setShowIdCard(false)}>
            <div className="nurse-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="nurse-modal-header">
                <h3>Official Patient Health & ID Card</h3>
                <button
                  type="button"
                  onClick={() => setShowIdCard(false)}
                  className="modal-close-btn"
                  aria-label="Close patient ID card"
                  title="Close"
                >
                  <FiX size={18} strokeWidth={2.5} />
                </button>
              </div>
              <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
                <PatientIdCard patient={selectedPatient} patientQr={patientQr} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
