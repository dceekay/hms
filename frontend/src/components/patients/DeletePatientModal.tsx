import { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiClock,
  FiLock,
  FiTrash2,
  FiUnlock,
  FiUser,
  FiX,
} from "react-icons/fi";
import type { Patient } from "../../types/patient";
import { deletePatientPermanently } from "../../services/patients/patientService";
import { playSuccessChime } from "../../utils/soundAlerts";
import { showSuccessWithSound } from "../../utils/sweetAlert";

interface DeletePatientModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (patientId: string) => void;
}

export default function DeletePatientModal({
  patient,
  isOpen,
  onClose,
  onDeleted,
}: DeletePatientModalProps) {
  const [countdown, setCountdown] = useState(10);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(10);
      setDeleting(false);
      setError(null);
      return;
    }

    setCountdown(10);
    setDeleting(false);
    setError(null);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isOpen, patient?.id]);

  if (!isOpen || !patient) return null;

  const handleDelete = async () => {
    if (countdown > 0 || deleting) return;

    setDeleting(true);
    setError(null);

    const result = await deletePatientPermanently(patient.id);

    setDeleting(false);

    if (!result || !result.success) {
      setError(
        result?.message ??
          "Unable to delete patient record. Please check permissions and try again."
      );
      return;
    }

    playSuccessChime();
    void showSuccessWithSound({
      title: "Patient Record Deleted",
      text: `${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn || "N/A"}) and all associated records have been permanently purged.`,
      timer: 2500,
    });

    onDeleted(patient.id);
    onClose();
  };

  const progressPercent = ((10 - countdown) / 10) * 100;

  return (
    <div
      className="patient-id-modal delete-patient-modal-wrapper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-patient-modal-title"
    >
      <div
        className="patient-id-modal-backdrop"
        onClick={deleting ? undefined : onClose}
        aria-hidden="true"
      />

      <section className="patient-id-modal-panel delete-patient-panel">
        <div className="delete-modal-header">
          <div className="delete-modal-title-wrap">
            <div className="delete-danger-icon-badge">
              <FiAlertTriangle />
            </div>
            <div>
              <div className="delete-super-admin-pill">SUPER ADMIN ACTION</div>
              <h2 id="delete-patient-modal-title">Delete Patient Permanently</h2>
            </div>
          </div>
          <button
            type="button"
            className="patient-id-close-btn modal-close-btn"
            onClick={onClose}
            disabled={deleting}
            aria-label="Close"
            title="Close"
          >
            <FiX size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="delete-warning-banner">
          <strong>IRREVERSIBLE DATA PURGE — SUPER ADMIN CLEARANCE REQUIRED</strong>
          <p>
            This action will permanently purge the entire patient&apos;s Electronic Health &amp; Medical Records (HMR)
            from the database, including all associated records:
          </p>
          <ul style={{ margin: "8px 0 0 18px", padding: 0, fontSize: "0.82rem", lineHeight: 1.5 }}>
            <li>Clinical consultations, doctor notes, diagnoses &amp; treatment histories</li>
            <li>Nursing progress notes, vital signs logs &amp; MAR medication administration schedules</li>
            <li>Pharmacy prescriptions, medicine dispenses &amp; invoice items</li>
            <li>Laboratory investigation orders, diagnostic results &amp; templates</li>
            <li>Patient bills, payment invoices, financial ledger &amp; receipt records</li>
            <li>Hospital admissions, ward bed assignments &amp; clinical referrals</li>
            <li>Appointments, scheduling history &amp; ambulance transfer links</li>
          </ul>
          <p style={{ margin: "8px 0 0", fontWeight: 700, color: "#ef4444" }}>
            ⚠️ This deletion cannot be undone. A mandatory 10-second safety countdown lock is active.
          </p>
        </div>

        <div className="delete-patient-card">
          <div className="delete-patient-avatar">
            <FiUser />
          </div>
          <div className="delete-patient-meta">
            <div className="delete-patient-name">
              {patient.firstName} {patient.lastName}
            </div>
            <div className="delete-patient-sub">
              <span>MRN: <strong>{patient.mrn || "Not Assigned"}</strong></span>
              <span>•</span>
              <span>Gender: <strong>{patient.gender ? patient.gender.toUpperCase() : "N/A"}</strong></span>
              <span>•</span>
              <span>Status: <strong>{patient.status ? patient.status.toUpperCase() : "ACTIVE"}</strong></span>
            </div>
          </div>
        </div>

        {error && (
          <div className="delete-modal-error">
            <FiAlertTriangle />
            <span>{error}</span>
          </div>
        )}

        <div className="delete-countdown-box">
          <div className="delete-countdown-header">
            <span className="delete-countdown-status">
              {countdown > 0 ? (
                <>
                  <FiLock className="lock-icon locked" />
                  <span>Safety lock active. Please wait <strong>{countdown}s</strong> before confirming.</span>
                </>
              ) : (
                <>
                  <FiUnlock className="lock-icon unlocked" />
                  <span className="unlocked-text">Safety lock released. Super Admin authorization unlocked.</span>
                </>
              )}
            </span>
            <span className="delete-countdown-number">
              <FiClock /> {countdown}s
            </span>
          </div>

          <div className="delete-progress-track">
            <div
              className={`delete-progress-fill ${countdown === 0 ? "ready" : ""}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="delete-modal-actions">
          <button
            type="button"
            className="delete-cancel-btn"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel & Keep Record
          </button>

          <button
            type="button"
            className={`delete-confirm-btn ${countdown === 0 ? "active" : "locked"}`}
            onClick={() => void handleDelete()}
            disabled={countdown > 0 || deleting}
          >
            <FiTrash2 />
            {deleting
              ? "Purging Records..."
              : countdown > 0
                ? `Wait (${countdown}s)`
                : "Delete Permanently"}
          </button>
        </div>
      </section>
    </div>
  );
}
