import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUserCheck,
  FiXCircle,
} from "react-icons/fi";
import { FaUserMd } from "react-icons/fa";
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

const emptyForm: AppointmentFormValues = {
  patientId: "",
  doctorId: "",
  scheduledFor: "",
  reason: "",
  notes: "",
};

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  checked_in: "Checked in",
  in_consultation: "In consultation",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

function patientName(patient: Patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function patientOptionLabel(patient: Patient) {
  return `${patientName(patient)}${patient.mrn ? ` | ${patient.mrn}` : ""}${patient.phone ? ` | ${patient.phone}` : ""}`;
}

function doctorName(doctor: AppUser) {
  return `Dr. ${doctor.firstName} ${doctor.lastName}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function AppointmentsPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("appointments.create");
  const canUpdate = permissions.includes("appointments.update");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<AppUser[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState<AppointmentFormValues>({
    ...emptyForm,
    scheduledFor: localDateTimeValue(),
  });
  const [patientSearch, setPatientSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === form.patientId) ?? null,
    [patients, form.patientId]
  );

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === form.doctorId) ?? null,
    [doctors, form.doctorId]
  );

  async function loadPage() {
    setLoading(true);
    setError(null);

    const [patientItems, doctorResult, appointmentResult] = await Promise.all([
      fetchPatients({ status: "active" }),
      fetchAppointmentDoctors(),
      fetchAppointments({ search, status }),
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
  }, [search, status]);

  function handlePatientSearch(value: string) {
    setPatientSearch(value);
    const patient = patients.find((item) => patientOptionLabel(item) === value);

    if (patient) {
      setForm((current) => ({ ...current, patientId: patient.id }));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canCreate) {
      setError("You do not have permission to create appointments.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const { appointment, error: createError } = await createAppointment(form);
    setSaving(false);

    if (!appointment) {
      setError(createError ?? "Unable to schedule appointment.");
      return;
    }

    setMessage("Patient assigned to doctor.");
    setForm({ ...emptyForm, scheduledFor: localDateTimeValue() });
    setPatientSearch("");
    await loadPage();
  }

  async function changeStatus(appointment: Appointment, nextStatus: AppointmentStatus) {
    if (!canUpdate) return;

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
      setError(updateError ?? "Unable to update appointment.");
      return;
    }

    setAppointments((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
    setMessage(`Appointment marked ${statusLabels[nextStatus].toLowerCase()}.`);
  }

  return (
    <AdminLayout>
      <div className="appointments-page">
        <section className="appointments-command">
          <div>
            <p className="eyebrow">Appointments</p>
            <h1>Doctor assignment queue</h1>
            <p>Assign patients to doctors and keep consultations moving.</p>
          </div>

          <button className="command-btn" type="button" onClick={loadPage} disabled={loading}>
            <FiRefreshCw />
            Refresh
          </button>
        </section>

        {(message || error) && (
          <div className={error ? "doctor-alert error" : "doctor-alert"}>
            {error ?? message}
          </div>
        )}

        <div className="appointments-grid">
          <form className="doctor-panel appointments-form" onSubmit={handleSubmit}>
            <div className="doctor-panel-heading">
              <div>
                <span>Reception</span>
                <h2>Assign patient</h2>
              </div>
              <FiUserCheck />
            </div>

            <label>
              Patient
              <div className="doctor-search-field">
                <FiSearch />
                <input
                  list="appointment-patient-options"
                  value={patientSearch}
                  onChange={(event) => handlePatientSearch(event.target.value)}
                  placeholder="Search name, MRN, or phone"
                />
              </div>
            </label>
            <datalist id="appointment-patient-options">
              {patients.map((patient) => (
                <option key={patient.id} value={patientOptionLabel(patient)} />
              ))}
            </datalist>

            <label>
              Doctor
              <select
                value={form.doctorId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, doctorId: event.target.value }))
                }
              >
                <option value="">Select doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctorName(doctor)}
                    {doctor.doctorProfile?.specialty ? ` | ${doctor.doctorProfile.specialty}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Time
              <input
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, scheduledFor: event.target.value }))
                }
              />
            </label>

            <label>
              Reason
              <textarea
                rows={3}
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="Brief reason for consultation"
              />
            </label>

            <label>
              Notes
              <textarea
                rows={2}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Optional reception note"
              />
            </label>

            <button
              className="command-btn primary"
              type="submit"
              disabled={saving || !canCreate || !form.patientId || !form.doctorId}
            >
              <FiSend />
              Assign to doctor
            </button>

            {(selectedPatient || selectedDoctor) && (
              <div className="appointment-selection-summary">
                {selectedPatient && <span>{patientName(selectedPatient)}</span>}
                {selectedDoctor && <span>{doctorName(selectedDoctor)}</span>}
              </div>
            )}
          </form>

          <section className="doctor-panel appointments-list-panel">
            <div className="doctor-panel-heading">
              <div>
                <span>Queue</span>
                <h2>All appointments</h2>
              </div>
              <FiCalendar />
            </div>

            <div className="appointments-toolbar">
              <div className="doctor-search-field">
                <FiSearch />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search patient, doctor, MRN"
                />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as AppointmentStatus | "all")}
              >
                <option value="all">All status</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="appointment-card-list">
              {appointments.length === 0 && <p>No appointments found.</p>}
              {appointments.map((appointment) => (
                <article key={appointment.id} className="appointment-card">
                  <div className="appointment-card-main">
                    <span className={`doctor-status ${appointment.status}`}>
                      {statusLabels[appointment.status]}
                    </span>
                    <strong>{patientName(appointment.patient)}</strong>
                    <small>{appointment.patient.mrn ?? "MRN pending"}</small>
                    <p>{appointment.reason || "No reason recorded."}</p>
                  </div>

                  <div className="appointment-card-meta">
                    <span>
                      <FaUserMd />
                      {doctorName(appointment.doctor)}
                    </span>
                    <span>
                      <FiClock />
                      {formatDateTime(appointment.scheduledFor)}
                    </span>
                  </div>

                  {canUpdate && (
                    <div className="doctor-action-row">
                      <button
                        className="command-btn"
                        type="button"
                        onClick={() => changeStatus(appointment, "checked_in")}
                        disabled={saving || appointment.status !== "scheduled"}
                      >
                        <FiCheckCircle />
                        Check in
                      </button>
                      <button
                        className="command-btn"
                        type="button"
                        onClick={() => changeStatus(appointment, "no_show")}
                        disabled={saving || appointment.status === "completed"}
                      >
                        <FiXCircle />
                        No show
                      </button>
                      <button
                        className="command-btn"
                        type="button"
                        onClick={() => changeStatus(appointment, "cancelled")}
                        disabled={saving || appointment.status === "completed"}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
