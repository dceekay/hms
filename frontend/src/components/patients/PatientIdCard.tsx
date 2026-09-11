import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { FiCheck, FiCopy, FiCreditCard, FiPrinter, FiRefreshCw, FiShield, FiUserPlus } from "react-icons/fi";
import { Patient, PatientQr } from "../../types/patient";
import mdsLogo from "../../assets/optimized/logo.png";
import { getAppUrl } from "../../utils/appUrl";

function getInitials(patient: Patient) {
  const first = patient.firstName?.trim().charAt(0) ?? "";
  const last = patient.lastName?.trim().charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "PT";
}

function formatGender(value?: string) {
  if (!value) return "Not set";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCoverage(value?: string | null) {
  if (!value) return "Not provided";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getPhotoSource(patient: Patient) {
  return patient.photoDataUrl || patient.photoUrl || "";
}

function getInsuranceName(patient: Patient) {
  if (!patient.insuranceProvider) return "Self pay";
  return patient.insuranceProvider.name;
}

function getInsuranceNumber(patient: Patient) {
  return (
    patient.insuranceMemberNumber ||
    patient.insurancePolicyNumber ||
    "Not provided"
  );
}

function getQrValue(patientQr: PatientQr) {
  if (/^https?:\/\//i.test(patientQr.lookupPath)) {
    return patientQr.lookupPath;
  }

  return getAppUrl(patientQr.lookupPath);
}

function PatientQrImage({ patientQr }: { patientQr: PatientQr }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let active = true;

    setSvg("");

    QRCode.toString(getQrValue(patientQr), {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: {
        dark: "#020617",
        light: "#ffffff",
      },
    })
      .then((qrSvg) => {
        if (active) {
          setSvg(qrSvg);
        }
      })
      .catch(() => {
        if (active) {
          setSvg("");
        }
      });

    return () => {
      active = false;
    };
  }, [patientQr]);

  if (!svg) {
    return (
      <div className="patient-qr-loading">
        <FiRefreshCw />
        <span>Preparing QR...</span>
      </div>
    );
  }

  return (
    <div
      className="patient-qr-image"
      aria-label={`Scannable QR lookup code ${patientQr.qrCode}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function PatientIdCard({
  patient,
  patientQr,
  emptyMessage = "Generating QR code...",
  showActions = true,
}: {
  patient: Patient;
  patientQr: PatientQr | null;
  emptyMessage?: string;
  showActions?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const photoSource = getPhotoSource(patient);

  // Auto-generate QR data immediately from patient object if patientQr is still fetching
  const activeQr: PatientQr | null =
    patientQr ||
    (patient.qrCode || patient.mrn || patient.id
      ? {
          patientId: String(patient.id || ""),
          mrn: patient.mrn || "",
          qrCode: patient.qrCode || patient.mrn || `MDS-${patient.id}`,
          lookupPath: `/verify/patient/${encodeURIComponent(patient.qrCode || patient.mrn || String(patient.id))}`,
        }
      : null);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    const code = activeQr?.qrCode || patient.qrCode || patient.mrn || "";
    if (code) {
      void navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="patient-id-print-area">
      {showActions && (
        <div className="patient-id-card-actions no-print">
          <button
            type="button"
            className="id-action-btn primary"
            onClick={handlePrint}
            title="Print Patient ID Card (CR80 standard badge format)"
          >
            <FiPrinter />
            <span>Print ID Card</span>
          </button>
          <button
            type="button"
            className="id-action-btn secondary"
            onClick={handleCopyCode}
            title="Copy MRN / QR Code"
          >
            {copied ? <FiCheck /> : <FiCopy />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>
      )}

      <article className="patient-id-card">
        <div className="patient-id-brand">
          <img src={mdsLogo} alt="MDS Hospital" />
          <div>
            <strong>MDS Hospital</strong>
            <span>Patient Identification Card</span>
          </div>
          <em>Patient</em>
        </div>

        <div className="patient-id-body">
          <div className="patient-id-photo">
            {photoSource ? (
              <img src={photoSource} alt={`${patient.firstName} ${patient.lastName}`} />
            ) : (
              <span>{getInitials(patient)}</span>
            )}
          </div>

          <div className="patient-id-info">
            <p>Patient name</p>
            <h3>
              {patient.firstName} {patient.lastName}
            </h3>

            <div className="patient-id-grid">
              <span>
                <small>MRN</small>
                <strong>{patient.mrn || "Pending"}</strong>
              </span>
              <span>
                <small>Gender</small>
                <strong>{formatGender(patient.gender)}</strong>
              </span>
              <span>
                <small>Phone</small>
                <strong>{patient.phone || "Not provided"}</strong>
              </span>
            </div>
          </div>

          <div className="patient-id-qr-block">
            {activeQr ? (
              <div className="patient-qr-box">
                <PatientQrImage patientQr={activeQr} />
                <span className="qr-scan-label">SCAN TO VERIFY</span>
              </div>
            ) : (
              <div className="id-empty-qr">
                <FiRefreshCw />
                <span>{emptyMessage}</span>
              </div>
            )}
          </div>
        </div>

        <div className="patient-id-insurance">
          <div>
            <small>Insurance</small>
            <strong>{getInsuranceName(patient)}</strong>
          </div>
          <div>
            <small>Principal Owner</small>
            <strong>{patient.insurancePrincipalName || "Not provided"}</strong>
          </div>
          <div>
            <small>Member Number</small>
            <strong>{getInsuranceNumber(patient)}</strong>
          </div>
          <div>
            <small>Coverage</small>
            <strong>{formatCoverage(patient.insuranceCoverageStatus)}</strong>
          </div>
        </div>

        <div className="patient-id-footer">
          <span>{activeQr?.qrCode || patient.qrCode || patient.mrn || "MDS Verified"}</span>
          <small>Powered by CeekayX</small>
        </div>
      </article>
    </div>
  );
}

export function PatientIdPanel({
  patient,
  patientQr,
  onReset,
}: {
  patient: Patient | null;
  patientQr: PatientQr | null;
  onReset?: () => void;
}) {
  return (
    <>
      <div className="id-panel-header">
        <FiCreditCard />
        <div>
          <h2>Patient ID</h2>
          <p>Generated instantly upon registration with scannable QR.</p>
        </div>
      </div>

      {!patient && (
        <div className="id-empty-state">
          <FiShield />
          <p>Register a patient to generate a searchable MRN and QR lookup card.</p>
        </div>
      )}

      {patient && (
        <>
          <PatientIdCard patient={patient} patientQr={patientQr} />
          {onReset && (
            <button
              type="button"
              className="id-action-btn secondary full-width"
              onClick={onReset}
              style={{ marginTop: "12px" }}
            >
              <FiUserPlus />
              <span>Register Another Patient</span>
            </button>
          )}
        </>
      )}
    </>
  );
}
