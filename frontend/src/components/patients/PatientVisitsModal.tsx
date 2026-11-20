import { useEffect, useMemo, useState } from "react";
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
import type { ClinicalEncounter, Prescription } from "../../types/clinical";
import type { Appointment } from "../../types/appointment";
import type { LaboratoryRequest } from "../../types/laboratory";
import { fetchClinicalEncounters, fetchPrescriptions } from "../../services/clinicalService";
import { fetchAppointments } from "../../services/appointmentService";
import { fetchLaboratoryRequests } from "../../services/laboratoryService";
import QRCode from "qrcode";
import mdsLogo from "../../assets/optimized/logo.png";
import { printFullHospitalReport } from "../../utils/manualVisitPrint";
import NotePhotoGallery from "../clinical/NotePhotoGallery";
import { extractNotePhotos } from "../../utils/clinicalNoteParser";

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
  const [labRequests, setLabRequests] = useState<LaboratoryRequest[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [viewMode, setViewMode] = useState<"timeline" | "visits">("timeline");
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
      fetchLaboratoryRequests({ patientId: patient.id }),
      fetchPrescriptions({ patientId: patient.id }),
    ])
      .then(([encResult, apptResult, labResult, rxResult]) => {
        setLoading(false);
        if (encResult.result?.items) {
          setEncounters(encResult.result.items);
        }
        if (apptResult.result?.items) {
          setAppointments(apptResult.result.items);
        }
        if (labResult.result?.items) {
          setLabRequests(labResult.result.items);
        }
        if (rxResult.result?.items) {
          setPrescriptions(rxResult.result.items);
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

  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string;
      date: string;
      kind: "Consultation" | "Appointment" | "Lab Test" | "Prescription";
      color: string;
      title: string;
      subtitle: string;
      detail: string;
      status?: string;
    }> = [];

    for (const enc of encounters) {
      const docName = enc.doctor ? `Dr. ${enc.doctor.firstName} ${enc.doctor.lastName}` : "Doctor";
      events.push({
        id: `enc-${enc.id}`,
        date: enc.startedAt || enc.createdAt,
        kind: "Consultation",
        color: "#2563eb",
        title: enc.diagnosis ? `Diagnosis: ${enc.diagnosis}` : `Clinical Visit (${enc.visitType || "OPD"})`,
        subtitle: `${docName} · ${enc.encounterNumber || "Encounter"}`,
        detail: [enc.chiefComplaint, enc.plan].filter(Boolean).join(" — ") || "Consultation recorded",
        status: enc.status,
      });
    }

    for (const appt of appointments) {
      const docName = appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : "Doctor";
      events.push({
        id: `appt-${appt.id}`,
        date: appt.startedAt || appt.createdAt,
        kind: "Appointment",
        color: "#0f766e",
        title: `Visit Booked (${docName})`,
        subtitle: appt.appointmentNumber || "Appointment",
        detail: appt.reason || "Scheduled consultation",
        status: appt.status,
      });
    }

    for (const lab of labRequests) {
      events.push({
        id: `lab-${lab.id}`,
        date: lab.createdAt,
        kind: "Lab Test",
        color: "#7c3aed",
        title: lab.template?.name || "Laboratory Test",
        subtitle: lab.requestNumber,
        detail: lab.clinicalNotes || (lab.status === "completed" ? "Result verified" : "Pending laboratory processing"),
        status: lab.status,
      });
    }

    for (const rx of prescriptions) {
      const medsSummary = rx.items.map((i) => `${i.medicationName} (${i.dose})`).join(", ");
      events.push({
        id: `rx-${rx.id}`,
        date: rx.createdAt,
        kind: "Prescription",
        color: "#d97706",
        title: `Prescription (${rx.items.length} item${rx.items.length === 1 ? "" : "s"})`,
        subtitle: rx.prescriptionNumber,
        detail: medsSummary || "Medication order",
        status: rx.status,
      });
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [encounters, appointments, labRequests, prescriptions]);

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
            <button
              type="button"
              className="icon-text-btn"
              onClick={() =>
                void printFullHospitalReport({
                  patient,
                  encounters,
                  appointments,
                })
              }
              title="Print Full Hospital Report with Logo, Stamp & QR Code"
            >
              <FiFileText />
              Full Hospital Report
            </button>

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
          <div className="vps-item">
            <span className="vps-label">Lab / Rx</span>
            <strong>{labRequests.length} / {prescriptions.length}</strong>
          </div>
        </div>

        <div className="no-print" style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`icon-text-btn ${viewMode === "timeline" ? "primary" : ""}`}
            onClick={() => setViewMode("timeline")}
          >
            <FiClock /> 360° Timeline ({timelineEvents.length})
          </button>
          <button
            type="button"
            className={`icon-text-btn ${viewMode === "visits" ? "primary" : ""}`}
            onClick={() => setViewMode("visits")}
          >
            <FaNotesMedical /> Detailed Doctor Notes ({encounters.length})
          </button>
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

        {!loading && viewMode === "timeline" && timelineEvents.length > 0 && (
          <div className="visits-timeline no-print">
            {timelineEvents.map((ev) => (
              <article
                key={ev.id}
                className="visit-card"
                style={{ borderLeft: `4px solid ${ev.color}` }}
              >
                <div className="visit-card-header">
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: ev.color,
                        marginBottom: "4px",
                      }}
                    >
                      {ev.kind} · {ev.subtitle}
                    </span>
                    <h4 style={{ margin: 0 }}>{ev.title}</h4>
                  </div>
                  <div className="visit-card-meta">
                    <div className="visit-time-pill">
                      <FiClock />
                      <span>{formatDate(ev.date)}</span>
                    </div>
                    {ev.status && (
                      <span className={`visit-status-badge ${ev.status}`}>
                        {ev.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "0.88rem", color: "var(--readable-text)" }}>
                  {ev.detail}
                </p>
              </article>
            ))}
          </div>
        )}

        {!loading && (viewMode === "visits" || timelineEvents.length === 0) && encounters.length === 0 && (
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

        {!loading && viewMode === "visits" && encounters.length > 0 && (
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
                        <span className="visit-field-label">Doctor&apos;s Clinical Notes &amp; Observations</span>
                        {extractNotePhotos(enc.remarks).cleanText && (
                          <p className="visit-field-value">{extractNotePhotos(enc.remarks).cleanText}</p>
                        )}
                        <NotePhotoGallery text={enc.remarks} />
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
