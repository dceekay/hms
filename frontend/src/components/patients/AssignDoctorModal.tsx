import { useEffect, useState } from "react";
import { FiCalendar, FiClock, FiUser, FiX, FiCheck, FiAlertCircle } from "react-icons/fi";
import { FaUserMd, FaHospitalUser } from "react-icons/fa";
import Swal from "sweetalert2";
import type { Patient } from "../../types/patient";
import type { AppUser } from "../../types/rbac";
import { createAppointment, fetchAppointmentDoctors } from "../../services/appointmentService";
import { notifyDataMutated } from "../../utils/appEvents";

interface AssignDoctorModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: () => void;
}

export default function AssignDoctorModal({
  patient,
  isOpen,
  onClose,
  onAssigned,
}: AssignDoctorModalProps) {
  const [doctors, setDoctors] = useState<AppUser[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [consultationType, setConsultationType] = useState("Routine Consultation");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSelectedDoctorId("");
    setConsultationType("Routine Consultation");
    setReason("");
    setNotes("");

    setLoadingDoctors(true);
    void fetchAppointmentDoctors().then(({ doctors: docList, error: docError }) => {
      setLoadingDoctors(false);
      if (docList && docList.length > 0) {
        setDoctors(docList);
        setSelectedDoctorId(docList[0].id);
      } else if (docError) {
        setError(docError);
      }
    });
  }, [isOpen]);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setError("Please select a doctor to assign the patient to.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const fullReason = reason.trim()
      ? `[${consultationType}] ${reason.trim()}`
      : `[${consultationType}] General Doctor Consultation`;

    const { appointment, error: apiError } = await createAppointment({
      patientId: patient.id,
      doctorId: selectedDoctorId,
      scheduledFor: new Date().toISOString(),
      reason: fullReason,
      notes: notes.trim(),
    });

    setSubmitting(false);

    if (!appointment || apiError) {
      setError(apiError ?? "Unable to assign patient to doctor. Please try again.");
      return;
    }

    const assignedDoc = doctors.find((d) => d.id === selectedDoctorId);
    const doctorName = assignedDoc ? `Dr. ${assignedDoc.firstName} ${assignedDoc.lastName}` : "the doctor";

    notifyDataMutated({ source: "assign-doctor" });

    await Swal.fire({
      icon: "success",
      title: "Patient Queued for Consultation",
      html: `<strong>${patient.firstName} ${patient.lastName}</strong> has been assigned to <strong>${doctorName}</strong> and placed in the active consultation queue.`,
      confirmButtonColor: "#087ebd",
    });

    if (onAssigned) {
      onAssigned();
    }
    onClose();
  };

  return (
    <div className="patient-id-modal" role="dialog" aria-modal="true" aria-labelledby="assign-doctor-title">
      <div className="patient-id-modal-backdrop" onClick={onClose} aria-hidden="true" />

      <section className="patient-id-modal-panel assign-doctor-panel">
        <div className="modal-header">
          <div className="assign-modal-header-text">
            <p className="eyebrow">Consultation Routing</p>
            <h2 id="assign-doctor-title">
              <FaUserMd className="assign-modal-icon" aria-hidden="true" />
              Assign Patient to Doctor
            </h2>
          </div>

          <button
            type="button"
            className="icon-only-btn"
            onClick={onClose}
            aria-label="Close assign doctor modal"
          >
            <FiX />
          </button>
        </div>

        <div className="assign-patient-banner">
          <div className="assign-patient-avatar">
            <FaHospitalUser aria-hidden="true" />
          </div>
          <div className="assign-patient-info">
            <strong>
              {patient.firstName} {patient.lastName}
            </strong>
            <div className="assign-patient-meta">
              <span>MRN: {patient.mrn || "Pending"}</span>
              {patient.gender && <span>· Gender: {patient.gender}</span>}
              {patient.phone && <span>· Tel: {patient.phone}</span>}
              {patient.insuranceProvider?.name && (
                <span className="assign-hmo-pill">{patient.insuranceProvider.name}</span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="assign-doctor-error" role="alert">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        <form className="assign-doctor-form" onSubmit={handleSubmit}>
          <label>
            <span>Attending Doctor <strong className="required-star">*</strong></span>
            {loadingDoctors ? (
              <p className="assign-loading-text">Loading available doctors...</p>
            ) : doctors.length === 0 ? (
              <p className="assign-empty-doctors">No active doctors found in system.</p>
            ) : (
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                required
                className="assign-doctor-select"
              >
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.firstName} {doc.lastName} ({doc.username})
                  </option>
                ))}
              </select>
            )}
          </label>

          <div className="form-grid">
            <label>
              <span>Consultation Type</span>
              <select
                value={consultationType}
                onChange={(e) => setConsultationType(e.target.value)}
              >
                <option value="Routine Consultation">Routine Consultation</option>
                <option value="Emergency / Urgent">Emergency / Urgent</option>
                <option value="Follow-up Review">Follow-up Review</option>
                <option value="Specialist Clinic">Specialist Clinic</option>
                <option value="Investigation Review">Investigation Review</option>
              </select>
            </label>

            <label>
              <span>Queue Timing</span>
              <div className="assign-time-pill">
                <FiClock aria-hidden="true" />
                <span>Immediate (Now in waiting queue)</span>
              </div>
            </label>
          </div>

          <label>
            <span>Chief Complaint / Reason for Visit</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. High fever, headache, routine check-up, BP check"
              maxLength={200}
            />
          </label>

          <label>
            <span>Clinical / Reception Notes <small className="optional-field">optional</small></span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific note for the doctor (e.g. vitals recorded, patient waiting in Lobby B)..."
            />
          </label>

          <div className="assign-doctor-footer">
            <button type="button" className="icon-text-btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>

            <button
              type="submit"
              className="icon-text-btn primary"
              disabled={submitting || loadingDoctors || doctors.length === 0}
            >
              {submitting ? (
                <>Queueing...</>
              ) : (
                <>
                  <FiCheck />
                  Assign &amp; Send to Doctor
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
