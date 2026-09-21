import { useEffect, useMemo, useState } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiCreditCard,
  FiExternalLink,
  FiFileText,
  FiFolder,
  FiPlus,
  FiSearch,
  FiShield,
  FiTruck,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { FaStethoscope, FaUserMd } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import type { DashboardOverview } from "../../services/dashboardService";
import type { Patient } from "../../types/patient";
import type { Appointment } from "../../types/appointment";
import { fetchPatients } from "../../services/patients/patientService";
import { fetchAppointments, updateAppointmentStatus } from "../../services/appointmentService";
import PatientSearchSelect, { calculateAge } from "../common/PatientSearchSelect";
import "../../styles/reception-desk.css";

interface FrontDeskWorkspaceProps {
  overview: DashboardOverview | null;
  overviewLoading: boolean;
  permissions: string[];
}

export default function FrontDeskWorkspace({
  overview,
  overviewLoading,
  permissions,
}: FrontDeskWorkspaceProps) {
  const navigate = useNavigate();
  const [activeQueueTab, setActiveQueueTab] = useState<"all" | "waiting" | "consulting" | "completed">("all");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [copiedPFile, setCopiedPFile] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  async function loadWorkspaceData() {
    try {
      setLoadingData(true);
      const [patientsList, apptResult] = await Promise.all([
        fetchPatients({ status: "active" }),
        fetchAppointments({ status: "all" }),
      ]);
      setPatients(patientsList ?? []);
      if (apptResult.result?.items) {
        setAppointments(apptResult.result.items);
      }
    } catch (err) {
      console.error("Error loading front desk data", err);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    void loadWorkspaceData();
    const interval = setInterval(() => {
      if (mounted) void loadWorkspaceData();
    }, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const availableDoctors = overview?.users.availableDoctors ?? [];
  const doctorCount = overviewLoading ? "..." : availableDoctors.length.toString();

  // Queue KPI counts
  const kpis = useMemo(() => {
    const waiting = appointments.filter(
      (a) => a.status === "scheduled" || a.status === "checked_in"
    ).length;
    const consulting = appointments.filter(
      (a) => a.status === "in_consultation"
    ).length;
    const completed = appointments.filter(
      (a) => a.status === "completed"
    ).length;
    return {
      total: appointments.length,
      waiting,
      consulting,
      completed,
    };
  }, [appointments]);

  const actionItems = [
    {
      title: "Register Patient",
      detail: "Create electronic record with P-File",
      to: "/register-patient",
      icon: <FiUserPlus />,
      className: "highlight-teal",
    },
    {
      title: "Book / Queue",
      detail: "Assign patient to doctor room",
      to: "/appointments",
      icon: <FiCalendar />,
      className: "highlight-blue",
    },
    {
      title: "Find Patient Records",
      detail: "Search by P-File, name, or MRN",
      to: "/patients",
      icon: <FiSearch />,
      className: "highlight-purple",
    },
    {
      title: "HMO & Insurance",
      detail: "Verify NHIA, KSCHIMA & claims",
      to: "/desk-office",
      icon: <FiShield />,
      className: "highlight-indigo",
    },
    ...(permissions.includes("billing.read")
      ? [
          {
            title: "Billing Desk",
            detail: "POS receipts & invoice payments",
            to: "/billing",
            icon: <FiCreditCard />,
            className: "highlight-rose",
          },
        ]
      : []),
    ...(permissions.includes("semsas.read")
      ? [
          {
            title: "SEMSAS",
            detail: "Ambulance emergency arrivals",
            to: "/operations/semsas",
            icon: <FiTruck />,
            className: "highlight-orange",
          },
        ]
      : []),
    {
      title: "Full Appointments",
      detail: `${kpis.total} appointments today`,
      to: "/appointments",
      icon: <FiFileText />,
      className: "highlight-slate",
    },
  ];

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt: Appointment) => {
      if (activeQueueTab === "all") return true;
      if (activeQueueTab === "waiting")
        return appt.status === "scheduled" || appt.status === "checked_in";
      if (activeQueueTab === "consulting")
        return appt.status === "in_consultation";
      if (activeQueueTab === "completed")
        return appt.status === "completed";
      return true;
    });
  }, [appointments, activeQueueTab]);

  const handleCopyPFile = (pFileNo?: string | null) => {
    if (!pFileNo) return;
    void navigator.clipboard.writeText(pFileNo);
    setCopiedPFile(true);
    setTimeout(() => setCopiedPFile(false), 2000);
  };

  const handleQuickCheckIn = async (appointmentId: string) => {
    try {
      setActionInProgress(appointmentId);
      const res = await updateAppointmentStatus(appointmentId, "checked_in");
      if (res.appointment) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? { ...a, status: "checked_in" } : a))
        );
      }
    } catch (e) {
      console.error("Check in error", e);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="frontdesk-workspace-root">
      {/* 1. Header & Desk Metrics Summary */}
      <section className="frontdesk-top-banner">
        <div className="banner-text-group">
          <div className="banner-badge">
            <span className="live-pulse-dot" />
            <span>Front Desk & Reception Desk Console</span>
          </div>
          <h1>Reception & Clinical Records Hub</h1>
          <p>
            Locate patient physical medical folders (P-Files), manage OPD queues, and assign patients to on-duty doctors.
          </p>
        </div>

        <div className="banner-action-group">
          <Link to="/register-patient" className="btn-banner-primary">
            <FiUserPlus />
            <span>New Patient (with P-File)</span>
          </Link>
          <Link to="/appointments" className="btn-banner-secondary">
            <FiCalendar />
            <span>Assign Doctor</span>
          </Link>
        </div>
      </section>

      {/* 2. Desk KPI Counters */}
      <section className="frontdesk-kpi-bar" aria-label="Reception Desk KPIs">
        <div className="desk-kpi-card tone-teal">
          <div className="kpi-icon-wrap">
            <FiFolder />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Records</span>
            <strong className="kpi-value">{patients.length}</strong>
            <small className="kpi-sub">Total enrolled</small>
          </div>
        </div>

        <div className="desk-kpi-card tone-amber">
          <div className="kpi-icon-wrap">
            <FiClock />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Waiting for Doctor</span>
            <strong className="kpi-value">{kpis.waiting}</strong>
            <small className="kpi-sub">In reception / vitals</small>
          </div>
        </div>

        <div className="desk-kpi-card tone-blue">
          <div className="kpi-icon-wrap">
            <FaStethoscope />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">With Doctor</span>
            <strong className="kpi-value">{kpis.consulting}</strong>
            <small className="kpi-sub">In consultation</small>
          </div>
        </div>

        <div className="desk-kpi-card tone-emerald">
          <div className="kpi-icon-wrap">
            <FaUserMd />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Doctors on Duty</span>
            <strong className="kpi-value">{doctorCount}</strong>
            <small className="kpi-sub">Consulting rooms</small>
          </div>
        </div>

        <div className="desk-kpi-card tone-purple">
          <div className="kpi-icon-wrap">
            <FiCheckCircle />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Completed Today</span>
            <strong className="kpi-value">{kpis.completed}</strong>
            <small className="kpi-sub">Finished consultation</small>
          </div>
        </div>
      </section>

      {/* 3. Physical File & Patient Quick-Lookup Hub */}
      <section className="frontdesk-quickbar-card">
        <div className="frontdesk-quickbar-header">
          <div className="quickbar-title-wrap">
            <div className="pfile-title-icon">
              <FiFolder />
            </div>
            <div>
              <h3>Physical File & Patient Quick Finder</h3>
              <p>Search by Physical File Number (P-File), Full Name, MRN, or Phone Number</p>
            </div>
          </div>
          <Link to="/register-patient" className="quickbar-reg-btn">
            <FiPlus />
            <span>Register New Patient</span>
          </Link>
        </div>

        <div className="frontdesk-search-container">
          <PatientSearchSelect
            patients={patients}
            selectedPatientId={selectedPatient?.id ?? null}
            onSelectPatient={(patient) => setSelectedPatient(patient)}
            placeholder="Type Physical File Number (e.g. MDS-0142), Name, MRN, or Phone..."
          />
        </div>

        {/* Selected Patient Physical File Quick Card */}
        {selectedPatient && (
          <div className="patient-quick-card">
            <div className="pqc-left">
              <div className="pqc-avatar">
                {selectedPatient.firstName?.[0]}
                {selectedPatient.lastName?.[0]}
              </div>
              <div className="pqc-main-info">
                <div className="pqc-name-row">
                  <h4>
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h4>
                  <span className={`pqc-cat-badge ${selectedPatient.patientCategory || "new_patient"}`}>
                    {(selectedPatient.patientCategory || "New").replace("_", " ")}
                  </span>
                </div>

                {/* Primary Physical File Number & MRN callouts */}
                <div className="pqc-identifiers-row">
                  <div className="pqc-pfile-box">
                    <span className="pfile-box-label">
                      <FiFolder /> Physical File Number (P-File)
                    </span>
                    <div className="pfile-box-value">
                      <strong>
                        {selectedPatient.physicalFileNumber ? selectedPatient.physicalFileNumber : "No P-File Assigned"}
                      </strong>
                      {selectedPatient.physicalFileNumber && (
                        <button
                          type="button"
                          className="copy-pfile-btn"
                          onClick={() => handleCopyPFile(selectedPatient.physicalFileNumber)}
                          title="Copy P-File Number to clipboard"
                        >
                          {copiedPFile ? <FiCheck /> : <FiCopy />}
                          <span>{copiedPFile ? "Copied!" : "Copy"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pqc-mrn-box">
                    <span className="pfile-box-label">Electronic MRN</span>
                    <div className="pfile-box-value">
                      <code>{selectedPatient.mrn || "Pending MRN"}</code>
                    </div>
                  </div>
                </div>

                <div className="pqc-meta-row">
                  {selectedPatient.phone && <span>📞 {selectedPatient.phone}</span>}
                  {selectedPatient.gender && <span>👤 {selectedPatient.gender}</span>}
                  {selectedPatient.dateOfBirth && (
                    <span>🎂 {calculateAge(selectedPatient.dateOfBirth)}</span>
                  )}
                  {(selectedPatient.insuranceProvider || selectedPatient.insurancePolicyNumber) && (
                    <span className="pqc-hmo-tag">
                      <FiShield /> {selectedPatient.insuranceProvider?.name || "HMO"}
                      {selectedPatient.insurancePolicyNumber ? ` (${selectedPatient.insurancePolicyNumber})` : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pqc-actions">
              <button
                type="button"
                className="pqc-action-btn primary"
                onClick={() => navigate(`/appointments?patientId=${selectedPatient.id}`)}
              >
                <FiCalendar />
                <span>Send to Doctor Queue</span>
              </button>

              <button
                type="button"
                className="pqc-action-btn secondary"
                onClick={() =>
                  navigate(`/patients?search=${encodeURIComponent(selectedPatient.physicalFileNumber || selectedPatient.mrn || selectedPatient.firstName)}`)
                }
              >
                <FiExternalLink />
                <span>View Full Medical Record</span>
              </button>

              <button
                type="button"
                className="pqc-clear-btn"
                onClick={() => setSelectedPatient(null)}
                title="Clear selection"
                aria-label="Clear selected patient"
              >
                <FiX size={16} strokeWidth={2.5} />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Action Launchpad */}
      <section className="frontdesk-action-grid" aria-label="Reception shortcuts">
        {actionItems.map((item) => (
          <Link className={`launchpad-card ${item.className}`} to={item.to} key={`${item.title}-${item.to}`}>
            <div className="launchpad-icon">{item.icon}</div>
            <div className="launchpad-text">
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </div>
            <FiArrowRight className="launchpad-arrow" />
          </Link>
        ))}
      </section>

      {/* 5. Main 2-Column Split Workspace */}
      <div className="frontdesk-main-grid">
        {/* Left Column: Doctors on Duty Live Roster */}
        <article className="frontdesk-panel frontdesk-doctors-panel">
          <div className="frontdesk-panel-heading">
            <div>
              <h2>Doctors on Duty</h2>
              <p>{doctorCount} active doctor account(s)</p>
            </div>
            <span className="live-count-chip">
              <span className="live-pulse-dot" />
              Live Clinic Roster
            </span>
          </div>

          <div className="frontdesk-doctor-list">
            {availableDoctors.length === 0 ? (
              <div className="empty-panel-msg">
                <FaUserMd />
                <p>No doctors currently logged in or scheduled.</p>
              </div>
            ) : (
              availableDoctors.map((doctor) => (
                <div className="frontdesk-doctor-card" key={doctor.id}>
                  <div className="doctor-avatar-box">
                    <FaUserMd />
                    <span className="doctor-active-indicator" />
                  </div>
                  <div className="doctor-info-box">
                    <strong>{doctor.name}</strong>
                    <small>{doctor.specialty || doctor.serviceArea || "General Consultation"}</small>
                  </div>
                  <Link
                    to={`/appointments?doctorId=${doctor.id}`}
                    className="doctor-assign-btn"
                    title={`Assign patient to ${doctor.name}`}
                  >
                    <FiCalendar />
                    <span>Assign</span>
                  </Link>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Right Column: Today's Live Queue with Folder Callouts */}
        <article className="frontdesk-panel frontdesk-queue-panel">
          <div className="frontdesk-panel-heading queue-heading">
            <div>
              <h2>Today&apos;s Patient Queue</h2>
              <p>{loadingData ? "Refreshing records..." : `${filteredAppointments.length} patient(s) in queue`}</p>
            </div>

            <div className="queue-filter-tabs">
              <button
                type="button"
                className={`queue-tab-btn ${activeQueueTab === "all" ? "active" : ""}`}
                onClick={() => setActiveQueueTab("all")}
              >
                All ({appointments.length})
              </button>
              <button
                type="button"
                className={`queue-tab-btn ${activeQueueTab === "waiting" ? "active" : ""}`}
                onClick={() => setActiveQueueTab("waiting")}
              >
                Waiting ({kpis.waiting})
              </button>
              <button
                type="button"
                className={`queue-tab-btn ${activeQueueTab === "consulting" ? "active" : ""}`}
                onClick={() => setActiveQueueTab("consulting")}
              >
                With Doctor ({kpis.consulting})
              </button>
              <button
                type="button"
                className={`queue-tab-btn ${activeQueueTab === "completed" ? "active" : ""}`}
                onClick={() => setActiveQueueTab("completed")}
              >
                Done ({kpis.completed})
              </button>
            </div>
          </div>

          <div className="queue-list-container">
            {filteredAppointments.length === 0 ? (
              <div className="empty-panel-msg">
                <FiClock />
                <p>No patients currently in this queue view.</p>
                <Link to="/appointments" className="empty-cta-link">
                  Assign / Queue Patient
                </Link>
              </div>
            ) : (
              <div className="queue-cards-list">
                {filteredAppointments.slice(0, 10).map((appt: Appointment) => {
                  const patientName = appt.patient
                    ? `${appt.patient.firstName} ${appt.patient.lastName}`
                    : "Patient";
                  const doctorName = appt.doctor
                    ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`
                    : "Assigned Doctor";

                  const pFile = appt.patient?.physicalFileNumber;

                  return (
                    <div className="queue-patient-row" key={appt.id}>
                      <div className="queue-patient-avatar">
                        {patientName[0] || <FiUsers />}
                      </div>

                      <div className="queue-patient-details">
                        <div className="queue-patient-header">
                          <strong className="queue-p-name">{patientName}</strong>

                          {/* PROMINENT P-FILE BADGE */}
                          {pFile ? (
                            <span
                              className="queue-pfile-pill"
                              title="Physical Medical Folder Number - Click to Copy"
                              onClick={() => handleCopyPFile(pFile)}
                            >
                              <FiFolder /> P-File: {pFile}
                            </span>
                          ) : (
                            <span className="queue-pfile-missing" title="Physical file number not yet assigned">
                              📁 No P-File
                            </span>
                          )}

                          {appt.patient?.mrn && (
                            <span className="mrn-badge">{appt.patient.mrn}</span>
                          )}

                          {(appt.patient?.insuranceProvider || appt.patient?.insurancePolicyNumber) && (
                            <span
                              className="hmo-badge"
                              title={`HMO: ${appt.patient.insuranceProvider?.name || "Insured"}`}
                            >
                              <FiShield /> {appt.patient.insuranceProvider?.name || "HMO"}
                            </span>
                          )}

                          <span className={`appt-status-pill status-${appt.status}`}>
                            {appt.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="queue-patient-meta">
                          <span className="meta-doctor">
                            <FaUserMd /> {doctorName}
                          </span>
                          {appt.scheduledFor && (
                            <span className="meta-time">
                              <FiClock />{" "}
                              {new Date(appt.scheduledFor).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          {appt.reason && (
                            <span className="meta-complaint" title={appt.reason}>
                              📋 {appt.reason}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="queue-patient-actions">
                        {appt.status === "scheduled" && (
                          <button
                            type="button"
                            className="queue-checkin-btn"
                            disabled={actionInProgress === appt.id}
                            onClick={() => handleQuickCheckIn(appt.id)}
                            title="Mark patient as checked in at reception"
                          >
                            <FiCheckCircle />
                            <span>{actionInProgress === appt.id ? "Checking in..." : "Check In"}</span>
                          </button>
                        )}

                        <Link
                          to="/appointments"
                          className="queue-action-btn"
                          title="Manage appointment in booking studio"
                        >
                          <FiExternalLink />
                          <span>Manage</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
