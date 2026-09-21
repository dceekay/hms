import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiCheckCircle, FiCreditCard, FiLoader, FiSlash } from "react-icons/fi";
import QRCode from "qrcode";
import mdsLogo from "../assets/optimized/logo.png";
import {
  PatientVerification,
  verifyPatientPublic,
} from "../services/patients/patientService";
import "../styles/verification.css";

function formatLabel(value?: string | null) {
  if (!value) return "Not provided";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PatientVerificationPage() {
  const { qrCode } = useParams();
  const [patient, setPatient] = useState<PatientVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientQrDataUrl, setPatientQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!qrCode) return;
    let active = true;
    QRCode.toDataURL(window.location.href, {
      margin: 1,
      width: 140,
      color: { dark: "#092a5e", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setPatientQrDataUrl(url);
      })
      .catch((err) => console.error("Patient QR error:", err));

    return () => {
      active = false;
    };
  }, [qrCode]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!qrCode) {
        setLoading(false);
        return;
      }

      const result = await verifyPatientPublic(qrCode);
      if (active) {
        setPatient(result);
        setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [qrCode]);

  return (
    <main className="verification-page">
      <section className="verification-card">
        <div className="verification-brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img src={mdsLogo} alt="MDS Hospital" style={{ width: 54, height: 54, objectFit: "contain" }} />
            <div>
              <strong style={{ fontSize: "1.15rem", color: "#092a5e" }}>MDS Specialist Hospital Kano</strong>
              <span style={{ fontSize: "0.82rem", color: "#0284c7", fontWeight: 600 }}>Patient Identity &amp; Digital Health Record Verification</span>
            </div>
          </div>

          {patientQrDataUrl && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <img
                src={patientQrDataUrl}
                alt="Scan to verify patient identity"
                style={{ width: 56, height: 56, borderRadius: 6, border: "1px solid #cbd5e1", padding: 2, background: "#fff" }}
              />
              <small style={{ fontSize: "0.58rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Scan to Verify</small>
            </div>
          )}
        </div>

        {loading && (
          <div className="verification-state">
            <FiLoader />
            <h1>Checking Patient ID</h1>
            <p>Please wait while we verify this patient record.</p>
          </div>
        )}

        {!loading && !patient && (
          <div className="verification-state failed">
            <FiSlash />
            <h1>Patient ID Not Found</h1>
            <p>This patient QR code could not be verified by MDS Hospital.</p>
          </div>
        )}

        {!loading && patient && (
          <>
            <div className="verification-status verified">
              <FiCheckCircle />
              <span>Official patient ID</span>
            </div>

            <div className="verification-profile">
              <div className="verification-photo">
                <FiCreditCard />
              </div>
              <div>
                <p>{patient.mrn || qrCode}</p>
                <h1>{patient.fullName}</h1>
                <span>{formatLabel(patient.patientCategory)}</span>
              </div>
            </div>

            <div className="verification-grid">
              <span>
                <small>Status</small>
                <strong>{formatLabel(patient.status)}</strong>
              </span>
              <span>
                <small>Gender</small>
                <strong>{formatLabel(patient.gender)}</strong>
              </span>
              <span>
                <small>Insurance</small>
                <strong>{patient.insuranceProvider || "Self pay"}</strong>
              </span>
              <span>
                <small>Member Number</small>
                <strong>{patient.insuranceMemberNumber || "Not provided"}</strong>
              </span>
              <span>
                <small>Policy Number</small>
                <strong>{patient.insurancePolicyNumber || "Not provided"}</strong>
              </span>
              <span>
                <small>Coverage</small>
                <strong>{formatLabel(patient.insuranceCoverageStatus)}</strong>
              </span>
              <span>
                <small>Principal Owner</small>
                <strong>{patient.insurancePrincipalName || "Not provided"}</strong>
              </span>
              <span>
                <small>Phone</small>
                <strong>{patient.phone || "Not provided"}</strong>
              </span>
            </div>
          </>
        )}

        <Link className="verification-link" to="/landing">
          Open hospital page
        </Link>
      </section>
    </main>
  );
}
