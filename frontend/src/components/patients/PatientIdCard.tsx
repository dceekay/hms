import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { FiCreditCard, FiRefreshCw, FiShield } from "react-icons/fi";
import { Patient, PatientQr } from "../../types/patient";

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
  return (
    <div className="patient-id-card">
      <div>
        <p>CeekayX HMS</p>
        <strong>
          {patient.firstName} {patient.lastName}
        </strong>
        <span>{patient.gender}</span>
      </div>

      <div className="id-mrn">
        <span>Searchable MRN</span>
        <strong>{patient.mrn}</strong>
      </div>

      {patientQr ? (
        <>
          <PatientQrImage patientQr={patientQr} />
          <code>{patientQr.qrCode}</code>
          <small>{patientQr.lookupPath}</small>
        </>
      ) : (
        <div className="id-empty-qr">
          <FiRefreshCw />
          <span>{emptyMessage}</span>
        </div>
      )}
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
