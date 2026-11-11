import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUserCheck,
  FiUsers,
  FiX,
  FiXCircle,
  FiZap,
} from "react-icons/fi";
import { FaStethoscope, FaUserInjured, FaUserMd } from "react-icons/fa";
import PatientSearchSelect from "../../components/common/PatientSearchSelect";
import AppDateTimePicker from "../../components/common/AppDateTimePicker";
import AdminLayout from "../../layouts/AdminLayout";
import {
  createAppointment,
  fetchAppointmentDoctors,
  fetchAppointments,
  updateAppointmentStatus,
} from "../../services/appointmentService";
import { fetchPatients } from "../../services/patients/patientService";
import { useAuthStore } from "../../store/authStore";
import type { Appointment, AppointmentFormValues, AppointmentStatus } from "../../types/appointment";
import type { Patient } from "../../types/patient";
import type { AppUser } from "../../types/rbac";
import { fireSweetAlert } from "../../components/common/SweetAlertToast";
import { confirmImportantAction, showSuccessWithSound } from "../../utils/sweetAlert";
import "../../styles/appointments.css";

const emptyForm: AppointmentFormValues = {
  patientId: "",
  doctorId: "",
  scheduledFor: "",
  reason: "",
  notes: "",
};

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Waiting for Doctor",
  checked_in: "Called In / Ready",
  in_consultation: "With Doctor",
  completed: "Finished",
  cancelled: "Cancelled",
  no_show: "Did Not Show",
};

const REASON_PRESETS = [
  "General Consultation",
  "Follow-up Visit",
  "Emergency / Urgent",
  "Check Lab / Scan Results",
  "Medication Refill",
  "Ante-Natal / Maternity",
];

function patientName(patient: Patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function doctorName(doctor: AppUser) {
  return `Dr. ${doctor.firstName} ${doctor.lastName}`;
}

function getDoctorSpecialty(doctor?: AppUser | null) {
  if (!doctor) return "General Practice";
  if (doctor.doctorProfile?.specialty) return doctor.doctorProfile.specialty;
  if (typeof doctor.serviceArea === "string") return doctor.serviceArea;
  if (doctor.serviceArea && typeof doctor.serviceArea === "object") return (doctor.serviceArea as any).name || "General Practice";
  return "General Practice";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Immediate / Now";
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function calculateAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function AppointmentsPage() {
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get("patientId") || "";
  const initialDoctorId = searchParams.get("doctorId") || "";

  const permissions = useAuthStore((state) => state.user)?.permissions ?? [];
  const canCreate = permissions.includes("appointments.create");
  const canUpdate = permissions.includes("appointments.update");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<AppUser[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  const [form, setForm] = useState<AppointmentFormValues>({
    ...emptyForm,
    patientId: initialPatientId,
    doctorId: initialDoctorId,
    scheduledFor: localDateTimeValue(),
  });

  const [timingMode, setTimingMode] = useState<"immediate" | "scheduled">("immediate");
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<AppointmentStatus | "all">("all");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selected Patient Details
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === form.patientId) ?? null,
    [patients, form.patientId]
  );

  // Selected Doctor Details
  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === form.doctorId) ?? null,
    [doctors, form.doctorId]
  );

  // Calculate doctor waiting load
  const doctorQueueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const appt of appointments) {
      if (appt.status === "scheduled" || appt.status === "checked_in" || appt.status === "in_consultation") {
        counts[appt.doctorId] = (counts[appt.doctorId] || 0) + 1;
      }
    }
    return counts;
  }, [appointments]);

  // Queue KPI counts
  const kpis = useMemo(() => {
    const total = appointments.length;
    const waiting = appointments.filter((a) => a.status === "scheduled" || a.status === "checked_in").length;
    const consulting = appointments.filter((a) => a.status === "in_consultation").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    return { total, waiting, consulting, completed };
  }, [appointments]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    const [patientItems, doctorResult, appointmentResult] = await Promise.all([
      fetchPatients({ status: "active" }),
      fetchAppointmentDoctors(),
      fetchAppointments({ search }),
    ]);

    setPatients(patientItems ?? []);

    if (doctorResult.doctors) {
      setDoctors(doctorResult.doctors);
    }

    if (appointmentResult.result) {
      setAppointments(appointmentResult.result.items);
    }

    if (doctorResult.error || appointmentResult.error) {
      setError(doctorResult.error ?? appointmentResult.error ?? "Unable to load appointments.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPage();
    const interval = window.setInterval(loadPage, 15000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Handle URL pre-selection updates
  useEffect(() => {
    if (initialPatientId && !form.patientId) {
      setForm((cur) => ({ ...cur, patientId: initialPatientId }));
    }
    if (initialDoctorId && !form.doctorId) {
      setForm((cur) => ({ ...cur, doctorId: initialDoctorId }));
    }
  }, [initialPatientId, initialDoctorId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canCreate) {
      setError("You do not have permission to create appointments.");
      return;
    }

    if (!form.patientId) {
      setError("Please select a patient to assign.");
      return;
    }

    if (!form.doctorId) {
      setError("Please select a doctor for this consultation.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      ...form,
      scheduledFor: timingMode === "immediate" ? new Date().toISOString() : form.scheduledFor,
    };

    const { appointment, error: createError } = await createAppointment(payload);
    setSaving(false);

    if (!appointment) {
      setError(createError ?? "Unable to assign patient to doctor.");
      return;
    }

    const docOnline = Boolean((appointment as any).doctorOnline);
    const docDisplay = selectedDoctor ? doctorName(selectedDoctor) : "doctor";
    const patientDisplay = selectedPatient
      ? `${selectedPatient.firstName} ${selectedPatient.lastName}`.trim()
      : "Patient";
    const patientMrn = selectedPatient?.mrn;

    fireSweetAlert({
      title: "Patient Assigned Successfully!",
      message: docOnline
        ? `Patient ${patientDisplay} has been successfully assigned to ${docDisplay}. Doctor is online and has received an instant notification.`
        : `Patient ${patientDisplay} has been successfully assigned to ${docDisplay}. Note: Doctor is currently offline (real-time notification skipped).`,
      type: "success",
      patientName: patientDisplay,
      mrn: patientMrn,
      doctorName: docDisplay,
      doctorOnline: docOnline,
      isModal: true,
      playSound: true,
    });

    setMessage(
      docOnline
        ? `Patient successfully assigned to ${docDisplay}. Doctor is online and has been notified.`
        : `Patient successfully assigned to ${docDisplay}. Note: Doctor is currently offline.`
    );

    setForm({
      ...emptyForm,
      scheduledFor: localDateTimeValue(),
    });
    setTimingMode("immediate");
    await loadPage();
  }

  async function changeStatus(appointment: Appointment, nextStatus: AppointmentStatus) {
    if (!canUpdate) return;

    if (nextStatus === "cancelled") {
      const confirmed = await confirmImportantAction({
        title: "Cancel Appointment?",
        text: `Are you sure you want to cancel the appointment for ${patientName(appointment.patient)}?`,
        confirmButtonText: "Yes, Cancel",
        icon: "warning",
        danger: true,
      });
      if (!confirmed) return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    const { appointment: updated, error: updateError } = await updateAppointmentStatus(
      appointment.id,
      nextStatus,
      appointment.notes ?? ""
    );
    setSaving(false);

    if (!updated) {
      setError(updateError ?? "Unable to update appointment status.");
      return;
    }

    setAppointments((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
    setMessage(`Appointment updated to ${statusLabels[nextStatus]}.`);
    void showSuccessWithSound({
      title: `Status: ${statusLabels[nextStatus]}`,
      text: `Appointment for ${patientName(appointment.patient)} updated to ${statusLabels[nextStatus]}.`,
    });
  }

  // Filtered Queue List
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Status Filter
      if (statusTab !== "all" && appt.status !== statusTab) {
        return false;
      }
      // Doctor Filter
      if (doctorFilter !== "all" && appt.doctorId !== doctorFilter) {
        return false;
      }
      // Text Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const pName = `${appt.patient.firstName} ${appt.patient.lastName}`.toLowerCase();
        const mrn = (appt.patient.mrn || "").toLowerCase();
        const dName = `${appt.doctor.firstName} ${appt.doctor.lastName}`.toLowerCase();
        const reason = (appt.reason || "").toLowerCase();
        if (!pName.includes(query) && !mrn.includes(query) && !dName.includes(query) && !reason.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [appointments, statusTab, doctorFilter, search]);

  return (
    <AdminLayout>
      <div className="appointments-page-v2">
        {/* 1. Header Command & Queue Stats */}
        <section className="queue-command-header">
          <div className="queue-command-copy">
            <span className="studio-header-badge">
              <FiZap /> OPD Clinic Line
            </span>
            <h1>Send Patient to Doctor & Appointments</h1>
            <p>Send waiting patients to see on-duty doctors now, or book an appointment for later.</p>
          </div>

          <div className="queue-command-actions">
            <button
              className={`queue-refresh-btn ${loading ? "spinning" : ""}`}
              type="button"
              onClick={loadPage}
              disabled={loading}
            >
              <FiRefreshCw />
              <span>{loading ? "Refreshing..." : "Refresh Queue"}</span>
            </button>
          </div>
        </section>

        {/* Live KPI Ribbon */}
        <section className="queue-kpi-ribbon" aria-label="Queue Metrics">
          <div className="queue-kpi-card tone-blue">
            <div className="queue-kpi-icon">
              <FiUsers />
            </div>
            <div className="queue-kpi-data">
              <span>Total in Line</span>
              <strong>{kpis.total}</strong>
            </div>
          </div>

          <div className="queue-kpi-card tone-amber">
            <div className="queue-kpi-icon">
              <FiClock />
            </div>
            <div className="queue-kpi-data">
              <span>Waiting for Doctor</span>
              <strong>{kpis.waiting}</strong>
            </div>
          </div>

          <div className="queue-kpi-card tone-purple">
            <div className="queue-kpi-icon">
              <FaStethoscope />
            </div>
            <div className="queue-kpi-data">
              <span>With Doctor</span>
              <strong>{kpis.consulting}</strong>
            </div>
          </div>

          <div className="queue-kpi-card tone-emerald">
            <div className="queue-kpi-icon">
              <FiCheckCircle />
            </div>
            <div className="queue-kpi-data">
              <span>Finished Today</span>
              <strong>{kpis.completed}</strong>
            </div>
          </div>
        </section>

        {/* Alerts & Messages */}
        {(message || error) && (
          <div
            className={`p-4 rounded-xl font-bold flex items-center gap-3 ${
              error
                ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
            }`}
          >
            {error ? <FiXCircle className="text-xl shrink-0" /> : <FiCheckCircle className="text-xl shrink-0" />}
            <span>{error ?? message}</span>
          </div>
        )}

        {/* 2. Main 2-Column Split Workspace */}
        <div className="queue-main-grid">
          {/* Left Column: Fast Assignment Studio */}
          <form className="assignment-studio-card" onSubmit={handleSubmit}>
            <div className="studio-header">
              <div>
                <h2>Send Patient to Doctor</h2>
                <p>Pick a patient and send them to the doctor's room</p>
              </div>
              <span className="studio-header-badge">
                <FiUserCheck /> Quick Send
              </span>
            </div>

            {/* Step 1: Patient Search & Full Details Snapshot Card */}
            <div>
              <label className="studio-section-label">
                <span>1. Who is the Patient?</span>
                <small>{selectedPatient ? "Patient Selected" : "Required"}</small>
              </label>

              {!selectedPatient ? (
                <PatientSearchSelect
                  label=""
                  required
                  patients={patients}
                  selectedPatientId={form.patientId}
                  onSelectPatient={(patient) =>
                    setForm((current) => ({
                      ...current,
                      patientId: patient ? patient.id : "",
                    }))
                  }
                  placeholder="Type name, Folder/P-File No, MRN, or phone..."
                />
              ) : (
                <div
                  className="patient-snapshot-card"
                  style={{
                    padding: "1rem",
                    borderRadius: "12px",
                    border: "1.5px solid #38bdf8",
                    background: "rgba(56, 189, 248, 0.06)",
                  }}
                >
                  <div className="snapshot-left" style={{ width: "100%", alignItems: "flex-start" }}>
                    <div
                      className="snapshot-avatar"
                      style={{ width: "48px", height: "48px", minWidth: "48px", fontSize: "1.2rem" }}
                    >
                      {selectedPatient.firstName[0]}
                    </div>
                    <div className="snapshot-details" style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "6px" }}>
                        <strong style={{ fontSize: "1.15rem", color: "var(--text-strong, #0f172a)" }}>
                          {patientName(selectedPatient)}
                        </strong>
                        <button
                          type="button"
                          className="table-action-btn neutral"
                          onClick={() => setForm((c) => ({ ...c, patientId: "" }))}
                          title="Choose different patient"
                          style={{ fontSize: "0.76rem", padding: "4px 8px" }}
                        >
                          <FiX /> Change Patient
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                          gap: "8px 12px",
                          marginTop: "8px",
                          fontSize: "0.82rem",
                        }}
                      >
                        <div>
                          <span style={{ color: "var(--muted)", display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" }}>
                            Hospital Folder No.
                          </span>
                          <strong style={{ color: "#0284c7" }}>
                            📁 {selectedPatient.physicalFileNumber || "No Folder Assigned"}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted)", display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" }}>
                            MRN
                          </span>
                          <strong>{selectedPatient.mrn || "Pending"}</strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted)", display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" }}>
                            Age & Gender
                          </span>
                          <strong>
                            {calculateAge(selectedPatient.dateOfBirth) ? `${calculateAge(selectedPatient.dateOfBirth)} yrs` : "Age N/A"} • {selectedPatient.gender || "N/A"}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted)", display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" }}>
                            Phone Number
                          </span>
                          <strong>{selectedPatient.phone || "No phone"}</strong>
                        </div>
                        {selectedPatient.insuranceProvider && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <span style={{ color: "var(--muted)", display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" }}>
                              HMO / Insurance
                            </span>
                            <span style={{ color: "#059669", fontWeight: 700 }}>
                              🛡️ {selectedPatient.insuranceProvider.name}{" "}
                              {selectedPatient.insurancePolicyNumber ? `(Policy: ${selectedPatient.insurancePolicyNumber})` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Visual Doctor Selector */}
            <div>
              <label className="studio-section-label">
                <span>2. Which Doctor Should See Them?</span>
                <small>{selectedDoctor ? doctorName(selectedDoctor) : "Required"}</small>
              </label>

              <div className="doctor-selection-list">
                {doctors.map((doctor) => {
                  const isSelected = form.doctorId === doctor.id;
                  const queueCount = doctorQueueCounts[doctor.id] || 0;
                  const specialty = getDoctorSpecialty(doctor);
                  const isOnline = Boolean((doctor as any).isOnline);

                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      className={`doctor-select-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setForm((cur) => ({ ...cur, doctorId: doctor.id }))}
                    >
                      <div className="doc-card-top">
                        <div className="doc-avatar-wrap">
                          <FaUserMd />
                          <span className={`doc-duty-dot ${isOnline ? "online" : "offline"}`} />
                        </div>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          <span className={`doc-status-pill ${isOnline ? "online" : "offline"}`}>
                            {isOnline ? "On Duty" : "Offline"}
                          </span>
                          <span className={`doc-queue-pill ${queueCount > 0 ? "has-queue" : ""}`}>
                            {queueCount} waiting
                          </span>
                        </div>
                      </div>

                      <div className="doc-card-name">{doctorName(doctor)}</div>
                      <div className="doc-card-specialty">{specialty}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Consultation Reason Presets */}
            <div>
              <label className="studio-section-label">
                <span>3. Reason for Visit / Complaint</span>
                <small>Tap preset or type below</small>
              </label>

              <div className="preset-chips-container">
                {REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-chip ${form.reason === preset ? "active" : ""}`}
                    onClick={() => setForm((cur) => ({ ...cur, reason: preset }))}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                className="studio-textarea"
                rows={2}
                value={form.reason}
                onChange={(event) => setForm((cur) => ({ ...cur, reason: event.target.value }))}
                placeholder="E.g. Fever, persistent headache, routine checkup..."
              />
            </div>

            {/* Step 4: Timing (Walk-in Immediate vs Specific Time) */}
            <div>
              <label className="studio-section-label">
                <span>4. When Should the Doctor See Them?</span>
              </label>

              <div className="timing-segmented-bar">
                <button
                  type="button"
                  className={`timing-btn ${timingMode === "immediate" ? "active" : ""}`}
                  onClick={() => setTimingMode("immediate")}
                >
                  <FiZap /> See Doctor Now (Walk-in)
                </button>
                <button
                  type="button"
                  className={`timing-btn ${timingMode === "scheduled" ? "active" : ""}`}
                  onClick={() => setTimingMode("scheduled")}
                >
                  <FiCalendar /> Book Future Date &amp; Time
                </button>
              </div>

              {timingMode === "scheduled" && (
                <div style={{ marginTop: "10px" }}>
                  <AppDateTimePicker
                    value={form.scheduledFor}
                    onChange={(val) => setForm((cur) => ({ ...cur, scheduledFor: val }))}
                    placeholder="Pick appointment date & time..."
                    required
                  />
                </div>
              )}
            </div>

            {/* Submit Action */}
            <button
              className="studio-submit-btn"
              type="submit"
              disabled={saving || !canCreate || !form.patientId || !form.doctorId}
            >
              <FiSend />
              <span>{saving ? "Sending to Doctor..." : "Send Patient to Doctor"}</span>
            </button>
          </form>

          {/* Right Column: Live Doctor Queue & Workbench */}
          <section className="queue-workbench-panel">
            <div className="workbench-top-bar">
              <div className="workbench-title">
                <h2>Patients in Line for Doctor</h2>
                <p>{filteredAppointments.length} patient(s) shown</p>
              </div>

              <div className="queue-segmented-tabs">
                <button
                  type="button"
                  className={`queue-segment-btn ${statusTab === "all" ? "active" : ""}`}
                  onClick={() => setStatusTab("all")}
                >
                  All ({appointments.length})
                </button>
                <button
                  type="button"
                  className={`queue-segment-btn ${statusTab === "scheduled" ? "active" : ""}`}
                  onClick={() => setStatusTab("scheduled")}
                >
                  Waiting ({kpis.waiting})
                </button>
                <button
                  type="button"
                  className={`queue-segment-btn ${statusTab === "in_consultation" ? "active" : ""}`}
                  onClick={() => setStatusTab("in_consultation")}
                >
                  With Doctor ({kpis.consulting})
                </button>
                <button
                  type="button"
                  className={`queue-segment-btn ${statusTab === "completed" ? "active" : ""}`}
                  onClick={() => setStatusTab("completed")}
                >
                  Finished Today ({kpis.completed})
                </button>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="workbench-filter-bar">
              <div className="workbench-search-box">
                <FiSearch />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient, Folder No., doctor, or complaint..."
                />
                {search && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <FiX size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              <div className="workbench-doctor-filter">
                <select
                  value={doctorFilter}
                  onChange={(e) => setDoctorFilter(e.target.value)}
                >
                  <option value="all">All Doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {doctorName(d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Queue Cards Stack */}
            <div className="queue-cards-stack">
              {filteredAppointments.length === 0 ? (
                <div className="queue-empty-box">
                  <FiClock />
                  <p>No patients currently in this queue view.</p>
                </div>
              ) : (
                filteredAppointments.map((appointment) => {
                  const pName = appointment.patient ? patientName(appointment.patient) : "Patient";
                  const dName = appointment.doctor ? doctorName(appointment.doctor) : "Doctor";
                  const specialty = getDoctorSpecialty(appointment.doctor);

                  return (
                    <article key={appointment.id} className="queue-patient-card">
                      {/* Top Row: Patient info & Status */}
                      <div className="card-top-row">
                        <div className="card-patient-info">
                          <div className="patient-init-badge">
                            {pName[0] || <FaUserInjured />}
                          </div>
                          <div className="card-patient-text">
                            <strong style={{ fontSize: "1.05rem" }}>{pName}</strong>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                              {appointment.patient?.physicalFileNumber ? (
                                <span className="queue-pfile-pill" title="Physical Folder Number">
                                  📁 Folder: {appointment.patient.physicalFileNumber}
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
                                  No Folder No.
                                </span>
                              )}
                              <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                                MRN: {appointment.patient?.mrn || "Pending"} • {appointment.patient?.phone || "No phone"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className={`queue-status-pill status-${appointment.status}`}>
                          {statusLabels[appointment.status] || appointment.status}
                        </span>
                      </div>

                      {/* Middle Meta Row */}
                      <div className="card-mid-row">
                        <span>
                          <FaUserMd /> {dName} ({specialty})
                        </span>
                        <span>
                          <FiClock /> {formatDateTime(appointment.scheduledFor)}
                        </span>
                      </div>

                      {appointment.reason && (
                        <p className="card-reason-tag">
                          <strong>Complaint:</strong> {appointment.reason}
                        </p>
                      )}

                      {/* Action Row */}
                      {canUpdate && (
                        <div className="card-actions-row">
                          {appointment.status === "scheduled" && (
                            <button
                              className="queue-btn btn-checkin"
                              type="button"
                              onClick={() => changeStatus(appointment, "checked_in")}
                              disabled={saving}
                            >
                              <FiCheckCircle />
                              Call Patient In
                            </button>
                          )}

                          {(appointment.status === "scheduled" || appointment.status === "checked_in") && (
                            <button
                              className="queue-btn btn-consult"
                              type="button"
                              onClick={() => changeStatus(appointment, "in_consultation")}
                              disabled={saving}
                            >
                              <FaStethoscope />
                              Send Inside to Doctor
                            </button>
                          )}

                          {appointment.status === "in_consultation" && (
                            <button
                              className="queue-btn btn-complete"
                              type="button"
                              onClick={() => changeStatus(appointment, "completed")}
                              disabled={saving}
                            >
                              <FiCheckCircle />
                              Finished Consultation
                            </button>
                          )}

                          {appointment.status !== "completed" && appointment.status !== "cancelled" && (
                            <>
                              <button
                                className="queue-btn btn-cancel"
                                type="button"
                                onClick={() => changeStatus(appointment, "no_show")}
                                disabled={saving}
                              >
                                No Show
                              </button>
                              <button
                                className="queue-btn btn-cancel"
                                type="button"
                                onClick={() => changeStatus(appointment, "cancelled")}
                                disabled={saving}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
