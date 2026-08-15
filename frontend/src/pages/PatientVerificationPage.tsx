import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiCheckCircle, FiCreditCard, FiLoader, FiSlash } from "react-icons/fi";
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
        <div className="verification-brand">
          <img src={mdsLogo} alt="MDS Hospital" />
          <div>
            <strong>MDS Hospital</strong>
            <span>Patient ID Verification</span>
          </div>
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
