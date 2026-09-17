import { useEffect, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiFileText,
  FiPrinter,
  FiUser,
  FiX,
  FiActivity,
  FiClipboard,
  FiPlus,
  FiCheckCircle,
} from "react-icons/fi";
import { FaNotesMedical, FaUserMd, FaHospitalUser, FaPrescriptionBottleAlt } from "react-icons/fa";
import type { Patient } from "../../types/patient";
import type { ClinicalEncounter } from "../../types/clinical";
import type { Appointment } from "../../types/appointment";
import { fetchClinicalEncounters } from "../../services/clinicalService";
import { fetchAppointments } from "../../services/appointmentService";
import QRCode from "qrcode";
import mdsLogo from "../../assets/optimized/logo.png";

interface PatientVisitsModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignDoctor?: (patient: Patient) => void;
}

export default function PatientVisitsModal({
  patient,
  isOpen,
  onClose,
  onAssignDoctor,
}: PatientVisitsModalProps) {
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitsQrDataUrl, setVisitsQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !patient) {
      setVisitsQrDataUrl("");
      return;
    }
    let active = true;
    const qrData = JSON.stringify({
      hospital: "MDS Specialist Hospital Kano",
      document: "Clinical Encounter History & Consultation Dossier",
      patient: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
      mrn: patient.mrn || "Pending",
      gender: patient.gender || "N/A",
      verify: `https://mds01.vercel.app/patients/${patient.id}`,
    });

    QRCode.toDataURL(qrData, {
      margin: 1,
      width: 140,
      color: { dark: "#092a5e", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (active) setVisitsQrDataUrl(dataUrl);
      })
      .catch((err) => console.error("Visits QR error:", err));

    return () => {
      active = false;
    };
  }, [isOpen, patient]);

  useEffect(() => {
    if (!isOpen || !patient) return;

    setLoading(true);
    setError(null);

    Promise.all([
      fetchClinicalEncounters({ patientId: patient.id }),
      fetchAppointments({ patientId: patient.id }),
    ])
      .then(([encResult, apptResult]) => {
        setLoading(false);
        if (encResult.result?.items) {
          setEncounters(encResult.result.items);
        }
        if (apptResult.result?.items) {
          setAppointments(apptResult.result.items);
        }
        if (encResult.error && apptResult.error) {
          setError(encResult.error);
        }
      })
      .catch((err) => {
        setLoading(false);
        setError("Failed to load patient visits.");
        console.error(err);
      });
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="patient-id-modal patient-visits-modal-wrapper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visits-modal-title"
    >
      <div className="patient-id-modal-backdrop no-print" onClick={onClose} aria-hidden="true" />

      <section className="patient-id-modal-panel patient-visits-panel">
        <div className="modal-header no-print">
          <div>
            <p className="eyebrow">Clinical Encounters &amp; Consultations</p>
            <h2 id="visits-modal-title">
              <FaNotesMedical className="visits-header-icon" aria-hidden="true" />
              Doctor Visits &amp; Notes: {patient.firstName} {patient.lastName}
            </h2>
          </div>

          <div className="modal-actions">
            {encounters.length > 0 && (
              <button
                type="button"
                className="icon-text-btn"
                onClick={handlePrint}
                title="Print Clinical Visits and Notes"
              >
                <FiPrinter />
                Print Notes
              </button>
            )}

            {onAssignDoctor && (
              <button
                type="button"
                className="icon-text-btn primary"
                onClick={() => {
                  onClose();
                  onAssignDoctor(patient);
                }}
                title="Queue patient for new doctor consultation"
              >
                <FaUserMd />
                New Consultation
              </button>
            )}

            <button
              type="button"
              className="icon-only-btn modal-close-btn"
              onClick={onClose}
              aria-label="Close visits modal"
              title="Close"
            >
              <FiX size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Printable History Header */}
        <div className="visits-print-header printable-only" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px", borderBottom: "2px solid #0284c7", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={mdsLogo} alt="MDS Specialist Hospital Logo" className="dossier-logo" style={{ width: 56, height: 56, objectFit: "contain" }} />
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#092a5e" }}>MDS SPECIALIST HOSPITAL KANO</h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "#0284c7", fontWeight: 700 }}>CLINICAL CONSULTATION NOTES &amp; ENCOUNTER HISTORY</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#475569" }}>
                Patient: <strong>{patient.firstName} {patient.lastName}</strong> · MRN:{" "}
                <strong>{patient.mrn || "Pending"}</strong> · Gender: {patient.gender || "N/A"}
              </p>
            </div>
          </div>
          {visitsQrDataUrl && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <img
                src={visitsQrDataUrl}
                alt="Scan to verify clinical dossier"
                style={{ width: 58, height: 58, borderRadius: 6, border: "1px solid #cbd5e1", padding: 2, background: "#fff" }}
              />
              <span style={{ fontSize: "0.58rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Scan to Verify</span>
            </div>
          )}
        </div>

        {/* Patient Summary Quick Bar */}
        <div className="visits-patient-summary-bar no-print">
          <div className="vps-item">
            <span className="vps-label">Patient</span>
            <strong>{patient.firstName} {patient.lastName}</strong>
          </div>
          <div className="vps-item">
            <span className="vps-label">MRN</span>
            <strong>{patient.mrn || "Pending"}</strong>
          </div>
          <div className="vps-item">
            <span className="vps-label">File No.</span>
            <strong>{patient.physicalFileNumber || "None"}</strong>
          </div>
          <div className="vps-item">
            <span className="vps-label">Recorded Encounters</span>
            <strong>{encounters.length}</strong>
          </div>
          <div className="vps-item">
            <span className="vps-label">Appointments</span>
            <strong>{appointments.length}</strong>
          </div>
        </div>

        {loading && (
          <div className="visits-loading-state">
            <FiActivity className="visits-spin-icon" />
            <p>Loading clinical consultation records...</p>
          </div>
        )}

        {error && (
          <div className="visits-error-state" role="alert">
            <p>{error}</p>
          </div>
        )}

        {!loading && encounters.length === 0 && (
          <div className="visits-empty-state">
            <FaNotesMedical className="visits-empty-icon" />
            <h3>No Previous Doctor Visits Recorded</h3>
            <p>
              This patient has not had any documented clinical encounters or doctor notes in MDS Hospital yet.
            </p>
            {onAssignDoctor && (
              <button
                type="button"
                className="icon-text-btn primary"
                onClick={() => {
                  onClose();
                  onAssignDoctor(patient);
                }}
              >
                <FaUserMd />
                Assign Patient to Doctor Now
              </button>
            )}
          </div>
        )}

        {!loading && encounters.length > 0 && (
          <div className="visits-timeline">
            {encounters.map((enc, idx) => {
              const docName = enc.doctor
                ? `Dr. ${enc.doctor.firstName} ${enc.doctor.lastName}`
                : "Attending Doctor";

              return (
                <article key={enc.id || idx} className="visit-card">
                  <div className="visit-card-header">
                    <div className="visit-doctor-info">
                      <div className="visit-doctor-avatar">
                        <FaUserMd />
                      </div>
                      <div>
                        <h4>{docName}</h4>
                        <span className="visit-encounter-num">
                          Encounter #{enc.encounterNumber || `E-${idx + 1}`} · {enc.visitType || "Consultation"}
                        </span>
                      </div>
                    </div>

                    <div className="visit-card-meta">
                      <div className="visit-time-pill">
                        <FiClock />
                        <span>{formatDate(enc.startedAt || enc.createdAt)}</span>
                      </div>
                      <span className={`visit-status-badge ${enc.status || "completed"}`}>
                        {enc.status ? enc.status.replace("_", " ") : "Completed"}
                      </span>
                    </div>
                  </div>

                  <div className="visit-card-body">
                    {enc.chiefComplaint && (
                      <div className="visit-field">
                        <span className="visit-field-label">Chief Complaint / Presentation</span>
                        <p className="visit-field-value">{enc.chiefComplaint}</p>
                      </div>
                    )}

                    {enc.history && (
                      <div className="visit-field">
                        <span className="visit-field-label">History of Presenting Illness (HPI)</span>
                        <p className="visit-field-value">{enc.history}</p>
                      </div>
                    )}

                    {enc.examination && (
                      <div className="visit-field">
                        <span className="visit-field-label">Examination Findings &amp; Vitals</span>
                        <p className="visit-field-value">{enc.examination}</p>
                      </div>
                    )}

                    {enc.diagnosis && (
                      <div className="visit-field diagnosis-field">
                        <span className="visit-field-label">Working / Clinical Diagnosis</span>
                        <p className="visit-field-value diagnosis-text">{enc.diagnosis}</p>
                      </div>
                    )}

                    {enc.remarks && (
                      <div className="visit-field notes-field">
                        <span className="visit-field-label">Doctor's Clinical Notes &amp; Observations</span>
                        <p className="visit-field-value">{enc.remarks}</p>
                      </div>
                    )}

                    {enc.plan && (
                      <div className="visit-field plan-field">
                        <span className="visit-field-label">Treatment Plan &amp; Management</span>
                        <p className="visit-field-value">{enc.plan}</p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
