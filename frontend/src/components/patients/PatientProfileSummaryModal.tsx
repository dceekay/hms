import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPrinter,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
import { FaHeartbeat, FaHospitalUser, FaIdCard, FaQrcode } from "react-icons/fa";
import type { Patient, PatientQr } from "../../types/patient";
import { fetchPatientQr } from "../../services/patients/patientService";
import { getAppUrl } from "../../utils/appUrl";
import mdsLogo from "../../assets/optimized/logo.png";

interface PatientProfileSummaryModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
}

function getQrValue(patientQr: PatientQr) {
  if (/^https?:\/\//i.test(patientQr.lookupPath)) {
    return patientQr.lookupPath;
  }
  return getAppUrl(patientQr.lookupPath);
}

export default function PatientProfileSummaryModal({
  patient,
  isOpen,
  onClose,
}: PatientProfileSummaryModalProps) {
  const [qrSvg, setQrSvg] = useState<string>("");
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    if (!isOpen || !patient) {
      setQrSvg("");
      return;
    }

    setLoadingQr(true);
    void fetchPatientQr(patient.id).then(async (qr) => {
      setLoadingQr(false);
      if (qr) {
        try {
          const svg = await QRCode.toString(getQrValue(qr), {
            type: "svg",
            errorCorrectionLevel: "M",
            margin: 1,
            width: 100,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          });
          setQrSvg(svg);
        } catch {
          setQrSvg("");
        }
      }
    });
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return "N/A";
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "N/A";
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} yrs`;
  };

  const formatDate = (val?: string) => {
    if (!val) return "Not provided";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const todayStr = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      className="patient-id-modal patient-profile-summary-modal-wrapper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-summary-title"
    >
      <div className="patient-id-modal-backdrop no-print" onClick={onClose} aria-hidden="true" />

      <section className="patient-id-modal-panel patient-profile-summary-panel">
        {/* Modal Top Actions (Screen only) */}
        <div className="modal-header no-print">
          <div>
            <p className="eyebrow">Medical Records Dossier</p>
            <h2 id="profile-summary-title">
              {patient.firstName} {patient.lastName}
            </h2>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="icon-text-btn primary"
              onClick={handlePrint}
              title="Print Patient Profile Summary Dossier"
            >
              <FiPrinter />
              Print Summary
            </button>

            <button
              type="button"
              className="icon-only-btn modal-close-btn"
              onClick={onClose}
              aria-label="Close profile summary"
              title="Close"
            >
              <FiX size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Printable Profile Dossier Document */}
        <div className="patient-profile-dossier printable-area">
          {/* Official Letterhead */}
          <div className="dossier-letterhead">
            <img src={mdsLogo} alt="MDS Hospital" className="dossier-logo" />
            <div className="dossier-hospital-details">
              <h1>MDS HOSPITAL KANO</h1>
              <p>Eastern Bypass, Giginyu, Kano State, Nigeria</p>
              <p className="dossier-contact-line">
                Emergency Hotline: +234 803 000 0000 · records@mdshospital.com.ng
              </p>
              <span className="dossier-doc-badge">OFFICIAL PATIENT PROFILE SUMMARY</span>
            </div>
            <div className="dossier-qr-box">
              {qrSvg ? (
                <div
                  className="dossier-qr-svg-wrap"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="dossier-qr-placeholder">
                  <FaQrcode />
                  <small>{patient.mrn || "MDS-QR"}</small>
                </div>
              )}
            </div>
          </div>

          <div className="dossier-rule" />

          {/* Primary ID & Status Strip */}
          <div className="dossier-patient-strip">
            <div className="dossier-avatar-wrap">
              {patient.photoDataUrl ? (
                <img src={patient.photoDataUrl} alt={patient.firstName} className="dossier-photo" />
              ) : (
                <div className="dossier-avatar-placeholder">
                  <span>{patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}</span>
                </div>
              )}
            </div>

            <div className="dossier-patient-main">
              <h2>{patient.firstName} {patient.lastName}</h2>
              <div className="dossier-key-pills">
                <span className="dossier-pill mrn">MRN: {patient.mrn || "Pending"}</span>
                {patient.physicalFileNumber && (
                  <span className="dossier-pill pfile">P-File: {patient.physicalFileNumber}</span>
                )}
                <span className="dossier-pill status">Status: {patient.status ?? "Active"}</span>
                <span className="dossier-pill category">
                  Category: {patient.patientCategory?.replace("_", " ") || "New Patient"}
                </span>
              </div>
            </div>
          </div>

          {/* Core Demographic & Clinical Info Grid */}
          <div className="dossier-section">
            <div className="dossier-section-title">
              <FaHospitalUser />
              <span>Demographic &amp; Vitals Baseline</span>
            </div>
            <div className="dossier-grid">
              <div className="dossier-item">
                <span className="dossier-label">Date of Birth / Age</span>
                <strong className="dossier-value">
                  {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)})
                </strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Gender</span>
                <strong className="dossier-value">{patient.gender || "Not specified"}</strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Blood Group</span>
                <strong className="dossier-value highlight">{patient.bloodGroup || "Pending Test"}</strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Genotype</span>
                <strong className="dossier-value highlight">{patient.genotype || "Pending Test"}</strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Allergies</span>
                <strong className="dossier-value">{patient.allergies || "None reported"}</strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">City / Town</span>
                <strong className="dossier-value">{patient.city || "Kano"}</strong>
              </div>
            </div>
          </div>

          {/* Contact & Residential Details */}
          <div className="dossier-section">
            <div className="dossier-section-title">
              <FiMapPin />
              <span>Contact &amp; Residence</span>
            </div>
            <div className="dossier-grid">
              <div className="dossier-item">
                <span className="dossier-label">Primary Phone</span>
                <strong className="dossier-value">{patient.phone || "None provided"}</strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Email Address</span>
                <strong className="dossier-value">{patient.email || "None provided"}</strong>
              </div>
              <div className="dossier-item span-2">
                <span className="dossier-label">Residential Address</span>
                <strong className="dossier-value">{patient.address || "Giginyu / Kano"}</strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">State / Region</span>
                <strong className="dossier-value">{patient.state || "Kano State"}</strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Country</span>
                <strong className="dossier-value">{patient.country || "Nigeria"}</strong>
              </div>
            </div>
          </div>

          {/* Next of Kin / Emergency Contact */}
          <div className="dossier-section">
            <div className="dossier-section-title">
              <FiUser />
              <span>Emergency Contact &amp; Next of Kin</span>
            </div>
            <div className="dossier-grid">
              <div className="dossier-item">
                <span className="dossier-label">Next of Kin Full Name</span>
                <strong className="dossier-value">{patient.emergencyContactName || "None on file"}</strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Relationship</span>
                <strong className="dossier-value">
                  {patient.emergencyContactRelationship || "Not specified"}
                </strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Emergency Phone</span>
                <strong className="dossier-value">{patient.emergencyContactPhone || "None on file"}</strong>
              </div>
            </div>
          </div>

          {/* Health Insurance Coverage */}
          <div className="dossier-section">
            <div className="dossier-section-title">
              <FiShield />
              <span>Payment &amp; Health Insurance (HMO) Coverage</span>
            </div>
            <div className="dossier-grid">
              <div className="dossier-item">
                <span className="dossier-label">Coverage Type</span>
                <strong className="dossier-value">
                  {patient.insuranceProvider ? "Health Insurance Plan" : "Self Pay (Out of Pocket)"}
                </strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Insurance Provider / HMO</span>
                <strong className="dossier-value">
                  {patient.insuranceProvider?.name
                    ? `${patient.insuranceProvider.name} ${patient.insuranceProvider.code ? `(${patient.insuranceProvider.code})` : ""}`
                    : "No insurance registered"}
                </strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Policy / Enrollee Number</span>
                <strong className="dossier-value">
                  {patient.insurancePolicyNumber || patient.insuranceMemberNumber || "N/A"}
                </strong>
              </div>
              <div className="dossier-item">
                <span className="dossier-label">Principal Enrollee</span>
                <strong className="dossier-value">{patient.insurancePrincipalName || "Self / N/A"}</strong>
              </div>
            </div>
          </div>

          {/* Record Metadata & Official Sign-off */}
          <div className="dossier-footer">
            <div className="dossier-footer-meta">
              <p>Registered Date: {formatDate(patient.createdAt)}</p>
              <p>Printed on: {todayStr}</p>
              <p className="dossier-security-note">
                This document contains confidential patient health information under MDS Hospital privacy guidelines.
              </p>
            </div>

            <div className="dossier-signoff-boxes">
              <div className="signoff-box">
                <div className="signoff-line" />
                <span>Health Records Officer</span>
              </div>
              <div className="signoff-box">
                <div className="signoff-line" />
                <span>Medical Director Stamp &amp; Signature</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
