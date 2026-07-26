import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { FiCreditCard, FiRefreshCw, FiShield } from "react-icons/fi";
import { Patient, PatientQr } from "../../types/patient";
import mdsLogo from "../../assets/logo.png";

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

function getQrValue(patientQr: PatientQr) {
  if (/^https?:\/\//i.test(patientQr.lookupPath)) {
    return patientQr.lookupPath;
  }

  const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1";
  const origin =
    /^https?:\/\//i.test(apiBaseUrl)
      ? new URL(apiBaseUrl).origin
      : typeof window !== "undefined"
        ? window.location.origin
        : "";

  return `${origin}${patientQr.lookupPath.startsWith("/") ? patientQr.lookupPath : `/${patientQr.lookupPath}`}`;
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
      width: 180,
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
  emptyMessage = "ID card not generated yet.",
}: {
  patient: Patient;
  patientQr: PatientQr | null;
  emptyMessage?: string;
}) {
  const photoSource = getPhotoSource(patient);

  return (
    <div className="patient-id-print-area">
      <article className="patient-id-card">
        <div className="patient-id-brand">
          <img src={mdsLogo} alt="MDS Hospital" />
          <div>
            <strong>MDS Hospital</strong>
            <span>Patient Identification Card</span>
          </div>
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
            </div>
          </div>

          <div className="patient-id-qr-block">
            {patientQr ? (
              <>
                <PatientQrImage patientQr={patientQr} />
                <small>Scan to verify</small>
              </>
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
            <small>Policy Number</small>
            <strong>{patient.insurancePolicyNumber || "Not provided"}</strong>
          </div>
          <div>
            <small>Coverage</small>
            <strong>{formatCoverage(patient.insuranceCoverageStatus)}</strong>
          </div>
        </div>

        <div className="patient-id-footer">
          <span>{patientQr?.qrCode || patient.qrCode || "QR pending"}</span>
          <small>{patient.phone || patient.email || "No contact on file"}</small>
        </div>
      </article>
    </div>
  );
}

export function PatientIdPanel({
  patient,
  patientQr,
}: {
  patient: Patient | null;
  patientQr: PatientQr | null;
}) {
  return (
    <>
      <div className="id-panel-header">
        <FiCreditCard />
        <div>
          <h2>Patient ID</h2>
          <p>Generated after successful registration.</p>
        </div>
      </div>

      {!patient && (
        <div className="id-empty-state">
          <FiShield />
          <p>Register a patient to generate a searchable MRN and QR lookup card.</p>
        </div>
      )}

      {patient && <PatientIdCard patient={patient} patientQr={patientQr} />}
    </>
  );
}
