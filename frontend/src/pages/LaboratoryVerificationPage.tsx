import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiHome,
  FiLoader,
  FiPrinter,
  FiShield,
  FiSlash,
  FiUser,
} from "react-icons/fi";
import { FaFlask } from "react-icons/fa";
import mdsLogo from "../assets/optimized/logo.png";
import {
  type LaboratoryVerificationData,
  verifyLaboratoryRequestPublic,
} from "../services/laboratoryService";
import LaboratoryPrintDocument from "../components/laboratory/LaboratoryPrintDocument";
import "../styles/verification.css";

function formatDate(value?: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").toUpperCase();
}

export default function LaboratoryVerificationPage() {
  const { identifier } = useParams();
  const [data, setData] = useState<LaboratoryVerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!identifier?.trim()) {
        setLoading(false);
        setErrorMessage("No verification code provided.");
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      const result = await verifyLaboratoryRequestPublic(identifier.trim());

      if (active) {
        if (result.data) {
          setData(result.data);
        } else {
          setErrorMessage(result.error ?? "This laboratory record could not be verified.");
        }
        setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [identifier]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="verification-page lab-verification-page">
      <section className="verification-card lab-verification-card">
        {/* Brand Header */}
        <div className="verification-brand">
          <img src={mdsLogo} alt="MDS Hospital" />
          <div>
            <strong>MDS Hospital</strong>
            <span>Diagnostic Pathology & Laboratory Services</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="verification-state">
            <FiLoader className="spin" style={{ fontSize: "2.4rem", color: "#0f766e" }} />
            <h1>Verifying Diagnostic Record</h1>
            <p>Please wait while we authenticate this laboratory test with our secure registry...</p>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && (errorMessage || !data) && (
          <div className="verification-state failed">
            <FiSlash style={{ fontSize: "2.6rem", color: "#ef4444" }} />
            <h1>Record Verification Failed</h1>
            <p>{errorMessage || "The requested laboratory test or requisition slip could not be verified."}</p>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "8px" }}>
              Code checked: <code>{identifier}</code>
            </p>
            <div style={{ marginTop: "18px", display: "flex", gap: "10px" }}>
              <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none", padding: "8px 16px", borderRadius: "8px", background: "#0f766e", color: "#fff", fontWeight: 700, fontSize: "0.88rem" }}>
                <FiHome /> Hospital Home
              </Link>
            </div>
          </div>
        )}

        {/* Success / Verified State */}
        {!loading && data && (
          <>
            {/* Authenticity Banner */}
            <div className={`verification-status verified ${data.status === "completed" ? "completed" : "pending"}`}>
              <FiShield style={{ fontSize: "1.25rem" }} />
              <span>
                <strong>Official Verified Record</strong> • {data.requestNumber}
              </span>
            </div>

            {/* Profile / Test Header */}
            <div className="verification-profile" style={{ alignItems: "flex-start" }}>
              <div className="verification-photo" style={{ background: "linear-gradient(135deg, #0f766e, #0369a1)", color: "#ffffff" }}>
                <FaFlask style={{ fontSize: "1.6rem" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                  <span className={`status-pill ${data.status}`}>
                    {formatStatus(data.status)}
                  </span>
                  {data.template.category && (
                    <span className="category-pill">{data.template.category}</span>
                  )}
                </div>
                <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "2px 0 4px" }}>
                  {data.template.reportTitle || data.template.name}
                </h1>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
                  Patient: <strong>{data.patient.fullName}</strong> {data.patient.mrn ? `(${data.patient.mrn})` : ""}
                </p>
              </div>
            </div>

            {/* Verification Metadata Grid */}
            <div className="verification-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", margin: "16px 0" }}>
              <span>
                <small>Patient Name</small>
                <strong>{data.patient.fullName}</strong>
              </span>
              <span>
                <small>Hospital MRN</small>
                <strong>{data.patient.mrn || "N/A"}</strong>
              </span>
              <span>
                <small>Gender</small>
                <strong>{data.patient.gender || "Not specified"}</strong>
              </span>
              <span>
                <small>Specimen</small>
                <strong>{data.template.specimen || "Standard Specimen"}</strong>
              </span>
              <span>
                <small>Requested On</small>
                <strong>{formatDate(data.createdAt)}</strong>
              </span>
              <span>
                <small>Sample Status</small>
                <strong>
                  {data.sampleCollectedAt
                    ? `Collected: ${formatDate(data.sampleCollectedAt)}`
                    : "Awaiting Collection"}
                </strong>
              </span>
              {data.completedAt && (
                <span>
                  <small>Authorized Date</small>
                  <strong>{formatDate(data.completedAt)}</strong>
                </span>
              )}
              {data.technician && (
                <span>
                  <small>Authorized By</small>
                  <strong>{data.technician.name}</strong>
                </span>
              )}
            </div>

            {/* Results Section (If Completed) */}
            {data.status === "completed" && data.template.fields && (
              <div className="verification-results-panel" style={{ marginTop: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ background: "#f8fafc", padding: "10px 14px", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>
                  Investigation Parameters & Observations
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px", color: "#475569" }}>Parameter</th>
                      <th style={{ padding: "8px 12px", color: "#475569" }}>Observed Value</th>
                      <th style={{ padding: "8px 12px", color: "#475569" }}>Unit</th>
                      <th style={{ padding: "8px 12px", color: "#475569" }}>Reference Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.template.fields.map((field) => {
                      const val = data.resultValues?.[field.key];
                      const displayVal = val !== undefined && val !== null && val !== "" ? String(val) : "—";
                      return (
                        <tr key={field.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{field.label}</td>
                          <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f766e" }}>{displayVal}</td>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>{field.unit || "—"}</td>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>{field.referenceRange || "Standard"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Remarks / Notes */}
            {(data.interpretation || data.clinicalNotes) && (
              <div style={{ marginTop: "14px", padding: "12px 14px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "0.84rem" }}>
                {data.interpretation && (
                  <p style={{ margin: "0 0 6px" }}>
                    <strong style={{ color: "#0f172a" }}>Clinical Interpretation: </strong>
                    <span style={{ color: "#334155" }}>{data.interpretation}</span>
                  </p>
                )}
                {data.clinicalNotes && (
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "#0f172a" }}>Clinical Notes: </strong>
                    <span style={{ color: "#64748b" }}>{data.clinicalNotes}</span>
                  </p>
                )}
              </div>
            )}

            {/* Requisition Status Notice (If Pending / In Progress) */}
            {data.status !== "completed" && (
              <div style={{ marginTop: "14px", padding: "14px", borderRadius: "10px", background: "rgba(15, 118, 110, 0.08)", border: "1px solid rgba(15, 118, 110, 0.2)", display: "flex", gap: "10px", alignItems: "center" }}>
                <FiClock style={{ fontSize: "1.4rem", color: "#0f766e", flexShrink: 0 }} />
                <div style={{ fontSize: "0.85rem" }}>
                  <strong style={{ color: "#0f766e", display: "block" }}>
                    Investigation In Progress / Sample Collection
                  </strong>
                  <span style={{ color: "#334155" }}>
                    This test requisition is registered in MDS Hospital records. Present this slip at the Phlebotomy or Laboratory Receiving Desk.
                  </span>
                </div>
              </div>
            )}

            {/* Print & Action Buttons */}
            <div className="verification-actions" style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="btn-print-slip"
                onClick={handlePrint}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#0f766e",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <FiPrinter /> {data.status === "completed" ? "Print Diagnostic Report" : "Print Requisition Slip"}
              </button>

              <Link
                to="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#64748b",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                <FiHome /> Back to Hospital
              </Link>
            </div>

            {/* Printable Document for physical printing */}
            <div className="verification-print-container" style={{ display: "none" }}>
              <LaboratoryPrintDocument request={data} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
