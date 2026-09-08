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
  scheduled: "Waiting",
  checked_in: "Checked In",
  in_consultation: "In Consultation",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const REASON_PRESETS = [
  "General OPD Consultation",
  "Specialist Follow-up",
  "Urgent / Priority Triage",
  "Lab & Scan Review",
  "Routine Prescription Refill",
  "Post-Op Assessment",
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

    const confirmed = await confirmImportantAction({
      title: "Book & Assign Appointment?",
      text: `Are you sure you want to ${
        timingMode === "immediate" ? "immediately send" : "schedule"
      } ${selectedPatient ? patientName(selectedPatient) : "the selected patient"} to ${
        selectedDoctor ? doctorName(selectedDoctor) : "the selected doctor"
      }?`,
      confirmButtonText: "Yes, Book Appointment",
    });
    if (!confirmed) return;

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
              <FiZap /> Live Clinic Queue
            </span>
            <h1>Doctor Assignment & Consultation Queue</h1>
            <p>Fast-track patient triage, allocate on-duty doctors, and manage real-time clinic flow.</p>
          </div>

          <div className="queue-command-actions">
            <button
              className={`queue-refresh-btn ${loading ? "spinning" : ""}`}
              type="button"
              onClick={loadPage}
              disabled={loading}
            >
              <FiRefreshCw />
              <span>{loading ? "Syncing..." : "Refresh Queue"}</span>
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
              <span>Total in Queue</span>
              <strong>{kpis.total}</strong>
            </div>
          </div>

          <div className="queue-kpi-card tone-amber">
            <div className="queue-kpi-icon">
              <FiClock />
            </div>
            <div className="queue-kpi-data">
              <span>Awaiting Doctor</span>
              <strong>{kpis.waiting}</strong>
            </div>
          </div>

          <div className="queue-kpi-card tone-purple">
            <div className="queue-kpi-icon">
              <FaStethoscope />
            </div>
            <div className="queue-kpi-data">
              <span>In Consultation</span>
              <strong>{kpis.consulting}</strong>
            </div>
          </div>

          <div className="queue-kpi-card tone-emerald">
            <div className="queue-kpi-icon">
              <FiCheckCircle />
            </div>
            <div className="queue-kpi-data">
              <span>Completed Today</span>
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
                <h2>Assign Patient</h2>
                <p>Send patient to doctor room or OPD queue</p>
              </div>
              <span className="studio-header-badge">
                <FiUserCheck /> Quick Assign
              </span>
            </div>

            {/* Step 1: Patient Search & Live Snapshot Card */}
            <div>
              <label className="studio-section-label">
                <span>1. Patient Selection</span>
                <small>{selectedPatient ? "Selected" : "Required"}</small>
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
                  placeholder="Search by name, MRN, or phone number..."
                />
              ) : (
                <div className="patient-snapshot-card">
                  <div className="snapshot-left">
                    <div className="snapshot-avatar">
                      {selectedPatient.firstName[0]}
                    </div>
                    <div className="snapshot-details">
                      <strong>{patientName(selectedPatient)}</strong>
                      <div className="snapshot-tags">
                        {selectedPatient.physicalFileNumber && (
                          <span className="snapshot-pfile" title="Physical Folder Number">
                            📁 P-File: {selectedPatient.physicalFileNumber}
                          </span>
                        )}
                        <span className="snapshot-mrn">{selectedPatient.mrn || "MRN Pending"}</span>
                        <span className="snapshot-cat">{selectedPatient.patientCategory ? selectedPatient.patientCategory.replace("_", " ") : "Patient"}</span>
                        {calculateAge(selectedPatient.dateOfBirth) && (
                          <span className="snapshot-cat">{calculateAge(selectedPatient.dateOfBirth)} yrs</span>
                        )}
                        {selectedPatient.phone && (
                          <span className="snapshot-cat">{selectedPatient.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="snapshot-clear-btn"
                    onClick={() => setForm((c) => ({ ...c, patientId: "" }))}
                    title="Change patient"
                  >
                    <FiX />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Visual Doctor Selector */}
            <div>
              <label className="studio-section-label">
                <span>2. Select On-Duty Doctor</span>
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
                            {isOnline ? "Online" : "Offline"}
                          </span>
                          <span className={`doc-queue-pill ${queueCount > 0 ? "has-queue" : ""}`}>
                            {queueCount} in queue
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
                <span>3. Reason / Chief Complaint</span>
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
                <span>4. Timing</span>
              </label>

              <div className="timing-segmented-bar">
                <button
                  type="button"
                  className={`timing-btn ${timingMode === "immediate" ? "active" : ""}`}
                  onClick={() => setTimingMode("immediate")}
                >
                  <FiZap /> Immediate Walk-in
                </button>
                <button
                  type="button"
                  className={`timing-btn ${timingMode === "scheduled" ? "active" : ""}`}
                  onClick={() => setTimingMode("scheduled")}
                >
                  <FiCalendar /> Scheduled Time
                </button>
              </div>

              {timingMode === "scheduled" && (
                <div style={{ marginTop: "10px" }}>
                  <input
                    type="datetime-local"
                    className="studio-textarea"
                    value={form.scheduledFor}
                    onChange={(event) => setForm((cur) => ({ ...cur, scheduledFor: event.target.value }))}
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
              <span>{saving ? "Assigning..." : "Assign to Doctor's Queue"}</span>
            </button>
          </form>

          {/* Right Column: Live Doctor Queue & Workbench */}
          <section className="queue-workbench-panel">
            <div className="workbench-top-bar">
              <div className="workbench-title">
                <h2>Live Consultation Queue</h2>
                <p>{filteredAppointments.length} appointment(s) currently shown</p>
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
                  In Consultation ({kpis.consulting})
                </button>
                <button
                  type="button"
                  className={`queue-segment-btn ${statusTab === "completed" ? "active" : ""}`}
                  onClick={() => setStatusTab("completed")}
                >
                  Completed ({kpis.completed})
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
                  placeholder="Search patient, MRN, doctor, or complaint..."
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: 0, color: "#94a3b8", cursor: "pointer" }}>
                    <FiX />
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
                            <strong>{pName}</strong>
                            <small>
                              {appointment.patient?.physicalFileNumber && (
                                <strong className="queue-pfile-pill" title="Physical File Number">
                                  📁 {appointment.patient.physicalFileNumber} •{" "}
                                </strong>
                              )}
                              {appointment.patient?.mrn || "MRN Pending"} | {appointment.patient?.phone || "No phone"}
                            </small>
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
                          <strong>Complaint / Reason:</strong> {appointment.reason}
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
                              Check In Patient
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
                              Send to Doctor Room
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
                              Mark Completed
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
