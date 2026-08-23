import { useEffect, useState } from "react";
import {
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiExternalLink,
  FiFileText,
  FiSearch,
  FiTruck,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { FaUserMd } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import type { DashboardOverview } from "../../services/dashboardService";
import type { Patient } from "../../types/patient";
import type { Appointment } from "../../types/appointment";
import { fetchPatients } from "../../services/patients/patientService";
import { fetchAppointments } from "../../services/appointmentService";
import PatientSearchSelect from "../common/PatientSearchSelect";
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
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadWorkspaceData() {
      try {
        setLoadingData(true);
        const [patientsList, apptResult] = await Promise.all([
          fetchPatients({ status: "active" }),
          fetchAppointments({ status: "all" }),
        ]);
        if (mounted) {
          setPatients(patientsList ?? []);
          if (apptResult.result?.items) {
            setAppointments(apptResult.result.items);
          }
        }
      } catch (err) {
        console.error("Error loading front desk data", err);
      } finally {
        if (mounted) setLoadingData(false);
      }
    }
    loadWorkspaceData();
    const interval = setInterval(loadWorkspaceData, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const availableDoctors = overview?.users.availableDoctors ?? [];
  const doctorCount = overviewLoading ? "..." : availableDoctors.length.toString();
  const queueCount = overviewLoading ? "..." : appointments.length.toString();

  const actionItems = [
    {
      title: "Register Patient",
      detail: "New, old, or investigation patient",
      to: "/register-patient",
      icon: <FiUserPlus />,
      className: "highlight-teal",
    },
    {
      title: "Book Appointment",
      detail: "Assign patient to a doctor",
      to: "/appointments",
      icon: <FiCalendar />,
      className: "highlight-blue",
    },
    {
      title: "Find Patient",
      detail: "MRN, name, phone, or ID card",
      to: "/patients",
      icon: <FiSearch />,
      className: "highlight-purple",
    },
    ...(permissions.includes("billing.read")
      ? [
          {
            title: "Billing Desk",
            detail: "Receive payment and print receipt",
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
            detail: "Ambulance service records",
            to: "/operations/semsas",
            icon: <FiTruck />,
            className: "highlight-orange",
          },
        ]
      : []),
    {
      title: "Queue",
      detail: `${queueCount} appointments today`,
      to: "/appointments",
      icon: <FiFileText />,
      className: "highlight-slate",
    },
  ];

  const filteredAppointments = appointments.filter((appt: Appointment) => {
    if (activeQueueTab === "all") return true;
    if (activeQueueTab === "waiting") return appt.status === "scheduled" || appt.status === "checked_in";
    if (activeQueueTab === "consulting") return appt.status === "in_consultation";
    if (activeQueueTab === "completed") return appt.status === "completed";
    return true;
  });

  const handlePatientSelect = (patient: Patient | null) => {
    if (patient) {
      navigate(`/patients?search=${encodeURIComponent(patient.mrn || patient.firstName)}`);
    }
  };

  return (
    <div className="frontdesk-workspace-root">
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

      <div className="frontdesk-quickbar-card compact">
        <div className="frontdesk-search-container">
          <PatientSearchSelect
            patients={patients}
            onSelectPatient={handlePatientSelect}
            placeholder="Search patient by name, MRN, phone, or policy number..."
          />
        </div>
      </div>

      <div className="frontdesk-main-grid compact">
        <article className="frontdesk-panel frontdesk-doctors-panel">
          <div className="frontdesk-panel-heading compact">
            <div>
              <h2>Doctors on Duty</h2>
              <p>{doctorCount} active doctor(s)</p>
            </div>
            <span className="live-count-chip">
              <span className="live-pulse-dot" />
              Live
            </span>
          </div>

          <div className="frontdesk-doctor-list">
            {availableDoctors.length === 0 ? (
              <div className="empty-panel-msg compact">
                <FaUserMd />
                <p>No active doctor accounts assigned right now.</p>
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
                    <small>{doctor.specialty || doctor.serviceArea || "General Practice"}</small>
                  </div>
                  <Link
                    to="/appointments"
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

        <article className="frontdesk-panel frontdesk-queue-panel">
          <div className="frontdesk-panel-heading queue-heading compact">
            <div>
              <h2>Today&apos;s Queue</h2>
              <p>{loadingData ? "Refreshing..." : `${filteredAppointments.length} shown`}</p>
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
                Waiting
              </button>
              <button
                type="button"
                className={`queue-tab-btn ${activeQueueTab === "consulting" ? "active" : ""}`}
                onClick={() => setActiveQueueTab("consulting")}
              >
                Doctor
              </button>
              <button
                type="button"
                className={`queue-tab-btn ${activeQueueTab === "completed" ? "active" : ""}`}
                onClick={() => setActiveQueueTab("completed")}
              >
                Done
              </button>
            </div>
          </div>

          <div className="queue-list-container">
            {filteredAppointments.length === 0 ? (
              <div className="empty-panel-msg compact">
                <FiClock />
                <p>No appointments in this queue right now.</p>
                <Link to="/appointments" className="empty-cta-link">
                  Create appointment
                </Link>
              </div>
            ) : (
              <div className="queue-cards-list">
                {filteredAppointments.slice(0, 8).map((appt: Appointment) => {
                  const patientName = appt.patient
                    ? `${appt.patient.firstName} ${appt.patient.lastName}`
                    : "Patient";
                  const doctorName = appt.doctor
                    ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`
                    : "Doctor";

                  return (
                    <div className="queue-patient-row" key={appt.id}>
                      <div className="queue-patient-avatar">
                        {patientName[0] || <FiUsers />}
                      </div>

                      <div className="queue-patient-details">
                        <div className="queue-patient-header">
                          <strong>{patientName}</strong>
                          {appt.patient?.mrn && <span className="mrn-badge">{appt.patient.mrn}</span>}
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
                        </div>
                      </div>

                      <div className="queue-patient-actions">
                        <Link to="/appointments" className="queue-action-btn" title="Manage appointment">
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
