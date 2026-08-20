import { useEffect, useState } from "react";
import {
  FiActivity,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiExternalLink,
  FiPlus,
  FiSearch,
  FiUserCheck,
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

  // Filter appointments for the live queue feed
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
      {/* Quick Search & Mobile Command Bar */}
      <div className="frontdesk-quickbar-card">
        <div className="frontdesk-quickbar-header">
          <div className="quickbar-title-wrap">
            <FiSearch className="quickbar-icon" />
            <div>
              <h3>Fast Patient Lookup</h3>
              <p>Instant search by Name, MRN or Phone for fast check-in.</p>
            </div>
          </div>
          <Link to="/register-patient" className="quickbar-reg-btn">
            <FiUserPlus />
            <span>+ New Patient</span>
          </Link>
        </div>

        <div className="frontdesk-search-container">
          <PatientSearchSelect
            patients={patients}
            onSelectPatient={handlePatientSelect}
            placeholder="Type patient name, MRN (e.g. MRN-001), or phone..."
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="frontdesk-main-grid">
        {/* Doctors Live On-Duty Panel */}
        <article className="frontdesk-panel frontdesk-doctors-panel">
          <div className="frontdesk-panel-heading">
            <div>
              <h2>Doctors on Duty</h2>
              <p>Live physician roster & clinic availability.</p>
            </div>
            <span className="live-count-chip">
              <span className="live-pulse-dot" />
              {availableDoctors.length} Active
            </span>
          </div>

          <div className="frontdesk-doctor-list">
            {availableDoctors.length === 0 ? (
              <div className="empty-panel-msg">
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

        {/* Quick Desk Action Launchpad */}
        <article className="frontdesk-panel frontdesk-launchpad-panel">
          <div className="frontdesk-panel-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>One-tap front desk & reception workflows.</p>
            </div>
            <FiCheckCircle />
          </div>

          <div className="frontdesk-launchpad-grid">
            <Link className="launchpad-card highlight-teal" to="/register-patient">
              <div className="launchpad-icon">
                <FiUserPlus />
              </div>
              <div className="launchpad-text">
                <strong>Register Patient</strong>
                <small>Create profile & photo ID card</small>
              </div>
              <FiArrowRight className="launchpad-arrow" />
            </Link>

            <Link className="launchpad-card highlight-blue" to="/appointments">
              <div className="launchpad-icon">
                <FiCalendar />
              </div>
              <div className="launchpad-text">
                <strong>Schedule / Queue</strong>
                <small>Book consultation with doctor</small>
              </div>
              <FiArrowRight className="launchpad-arrow" />
            </Link>

            <Link className="launchpad-card highlight-purple" to="/patients">
              <div className="launchpad-icon">
                <FiUsers />
              </div>
              <div className="launchpad-text">
                <strong>Patient Registry</strong>
                <small>Search directory & view records</small>
              </div>
              <FiArrowRight className="launchpad-arrow" />
            </Link>

            {permissions.includes("billing.read") && (
              <Link className="launchpad-card highlight-rose" to="/billing">
                <div className="launchpad-icon">
                  <FiCreditCard />
                </div>
                <div className="launchpad-text">
                  <strong>Cashier & Billing</strong>
                  <small>Receive invoice & print receipt</small>
                </div>
                <FiArrowRight className="launchpad-arrow" />
              </Link>
            )}
          </div>
        </article>
      </div>

      {/* Live Today's Waiting Room & Triage Queue */}
      <article className="frontdesk-panel frontdesk-queue-panel">
        <div className="frontdesk-panel-heading queue-heading">
          <div>
            <h2>Today's Patient Queue & Handoffs</h2>
            <p>Track patient movement from check-in to consultation and billing.</p>
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
              With Doctor
            </button>
            <button
              type="button"
              className={`queue-tab-btn ${activeQueueTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveQueueTab("completed")}
            >
              Completed
            </button>
          </div>
        </div>

        <div className="queue-list-container">
          {filteredAppointments.length === 0 ? (
            <div className="empty-panel-msg">
              <FiClock />
              <p>No appointments in this queue right now.</p>
              <Link to="/appointments" className="empty-cta-link">
                + Create Appointment
              </Link>
            </div>
          ) : (
            <div className="queue-cards-list">
              {filteredAppointments.map((appt: Appointment) => {
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
                        {appt.patient?.mrn && (
                          <span className="mrn-badge">{appt.patient.mrn}</span>
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
                            <FiClock /> {new Date(appt.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="queue-patient-actions">
                      <Link
                        to="/appointments"
                        className="queue-action-btn"
                        title="Manage appointment"
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
  );
}
