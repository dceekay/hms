import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiSlash,
  FiPrinter,
  FiArrowLeft,
  FiActivity,
  FiRefreshCw,
  FiShield,
  FiFileText,
  FiCheck,
  FiShare2,
} from "react-icons/fi";
import MdsLogo from "../components/common/MdsLogo";
import {
  verifyLaboratoryRequestPublic,
  type LaboratoryVerificationData,
} from "../services/laboratoryService";
import LaboratoryPrintModal from "../components/laboratory/LaboratoryPrintModal";
import ShareLabResultModal from "../components/laboratory/ShareLabResultModal";
import { HOSPITAL_OFFICIAL_DETAILS } from "../constants/hospitalInfo";
import "../styles/verification.css";
import "../styles/laboratory-studio.css";

/**
 * Format scientific units to guarantee standard unicode superscripts and greek symbols
 */
function formatScientificUnit(unit?: string | null): string {
  if (!unit) return "—";
  return unit
    .replace(/\^9/g, "⁹")
    .replace(/\^12/g, "¹²")
    .replace(/\^6/g, "⁶")
    .replace(/\^3/g, "³")
    .replace(/uL/g, "µL")
    .replace(/umol/g, "µmol")
    .replace(/ug/g, "µg");
}

/**
 * Safely format result display value so nulls, undefined, and empty objects show cleanly
 */
function formatDisplayValue(val: unknown): string {
  if (val === undefined || val === null || val === "") return "—";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return "—";
    }
  }
  return String(val).trim();
}

export default function LaboratoryVerificationPage() {
  const { identifier, id } = useParams<{ identifier?: string; id?: string }>();
  const lookupId = (identifier || id || "").trim();
  const [data, setData] = useState<LaboratoryVerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const fetchVerification = async (isInitial = false) => {
    if (!lookupId) {
      setLoading(false);
      setError("No laboratory reference identifier provided.");
      return;
    }

    if (isInitial) setLoading(true);

    const result = await verifyLaboratoryRequestPublic(lookupId);

    if (isInitial) setLoading(false);
    setLastChecked(new Date());

    if (result.data) {
      setData(result.data);
      setError(null);
    } else {
      setError(result.error ?? "Laboratory test record could not be verified.");
    }
  };

  useEffect(() => {
    void fetchVerification(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupId]);

  // Live auto-polling if test is still in progress / pending
  useEffect(() => {
    if (!data || data.status === "completed" || data.status === "cancelled") {
      return;
    }

    const intervalId = setInterval(() => {
      void fetchVerification(false);
    }, 8000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status, lookupId]);

  const isCompleted = data?.status === "completed";

  // Evaluate abnormal/normal flag
  const evaluateFlag = (referenceRange?: string | null, value?: unknown) => {
    if (value === undefined || value === null || value === "") return null;
    const strVal = String(value).trim();
    if (!referenceRange) return null;

    const num = parseFloat(strVal);
    if (!isNaN(num) && referenceRange.includes("-")) {
      const parts = referenceRange.split("-").map((p) => parseFloat(p.replace(/[^0-9.]/g, "")));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        if (num < parts[0]) return { status: "low", label: "LOW" };
        if (num > parts[1]) return { status: "high", label: "HIGH" };
        return { status: "normal", label: "NORMAL" };
      }
    }

    const lowerRef = referenceRange.toLowerCase();
    const lowerVal = strVal.toLowerCase();
    if (lowerRef.includes("negative") || lowerRef.includes("non-reactive") || lowerRef.includes("normal")) {
      if (lowerVal.includes("positive") || lowerVal.includes("reactive") || lowerVal.includes("3+") || lowerVal.includes("4+")) {
        return { status: "abnormal", label: "ABNORMAL" };
      }
      if (lowerVal.includes("negative") || lowerVal.includes("non-reactive") || lowerVal.includes("normal")) {
        return { status: "normal", label: "NORMAL" };
      }
    }

    return null;
  };

  const formatDate = (val?: string | null) => {
    if (!val) return "—";
    try {
      const d = new Date(val);
      return isNaN(d.getTime())
        ? val
        : d.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
    } catch {
      return val;
    }
  };

  return (
    <main className="verification-page" style={{ minHeight: "100vh", padding: "2.5rem 1rem" }}>
      <div className="lab-verify-wrapper">
        {/* Top Return Link */}
        <div style={{ marginBottom: "1.25rem" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              color: "var(--muted, #64748b)",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            <FiArrowLeft /> Return to {HOSPITAL_OFFICIAL_DETAILS.name} Home
          </Link>
        </div>

        {/* Verification Card */}
        <section className="lab-verify-card">
          {/* Brand Header */}
          <header className="lab-verify-header-brand">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <MdsLogo size={48} />
              <div className="lab-verify-brand-info">
                <h1>{HOSPITAL_OFFICIAL_DETAILS.name}</h1>
                <p>Diagnostic Pathology & Clinical Laboratory Verification</p>
              </div>
            </div>

            {data && (
              <div className="lab-verify-security-badge">
                <FiShield />
                <span>OFFICIAL VERIFICATION PORTAL</span>
              </div>
            )}
          </header>

          {/* Loading State */}
          {loading && (
            <div className="verification-state" style={{ padding: "4rem 1rem", textAlign: "center" }}>
              <FiLoader className="spin" style={{ fontSize: "2.5rem", color: "#087ebd", marginBottom: "1rem" }} />
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem" }}>Verifying Laboratory Record</h2>
              <p style={{ margin: 0, color: "#64748b" }}>
                Authenticating specimen reference with {HOSPITAL_OFFICIAL_DETAILS.name} clinical pathology database...
              </p>
            </div>
          )}

          {/* Error / Not Found State */}
          {!loading && error && (
            <div className="verification-state failed" style={{ padding: "3rem 1rem", textAlign: "center" }}>
              <FiSlash style={{ fontSize: "2.5rem", color: "#ef4444", marginBottom: "1rem" }} />
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem" }}>Test Record Not Found</h2>
              <p style={{ color: "#64748b" }}>{error}</p>
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "1.5rem" }}>
                If you believe this is an error, please contact {HOSPITAL_OFFICIAL_DETAILS.name} Diagnostic Services at{" "}
                <strong style={{ color: "#087ebd" }}>{HOSPITAL_OFFICIAL_DETAILS.primaryPhone}</strong> or email{" "}
                <strong style={{ color: "#087ebd" }}>{HOSPITAL_OFFICIAL_DETAILS.email}</strong>.
              </p>
            </div>
          )}

          {/* Verified Content */}
          {!loading && data && (
            <>
              {/* Status Header Strip */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.85rem",
                  padding: "1rem 1.35rem",
                  borderRadius: "14px",
                  background: isCompleted ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                  border: `1.5px solid ${isCompleted ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {isCompleted ? (
                    <FiCheckCircle style={{ color: "#10b981", fontSize: "1.6rem", flexShrink: 0 }} />
                  ) : (
                    <FiClock className="spin" style={{ color: "#f59e0b", fontSize: "1.6rem", flexShrink: 0 }} />
                  )}
                  <div>
                    <strong style={{ color: isCompleted ? "#047857" : "#b45309", fontSize: "1rem", display: "block" }}>
                      {isCompleted ? "OFFICIAL AUTHENTICATED RESULT" : "SAMPLE COLLECTED / ANALYSIS IN PROGRESS"}
                    </strong>
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      Laboratory Accession:{" "}
                      <strong style={{ fontFamily: "monospace", color: "#0284c7" }}>{data.requestNumber}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  {isCompleted && (
                    <>
                      <button
                        type="button"
                        className="lab-action-btn share"
                        onClick={() => setIsShareModalOpen(true)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.55rem 1.15rem",
                          fontSize: "0.86rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                        }}
                      >
                        <FiShare2 /> Share Result
                      </button>
                      <button
                        type="button"
                        className="lab-btn-primary"
                        onClick={() => setIsPrintModalOpen(true)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.55rem 1.15rem",
                          fontSize: "0.86rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                        }}
                      >
                        <FiPrinter /> Print Official Copy
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="lab-btn-secondary"
                    onClick={() => fetchVerification(false)}
                    title="Refresh status"
                    style={{ padding: "0.55rem 0.85rem", borderRadius: "8px" }}
                  >
                    <FiRefreshCw />
                  </button>
                </div>
              </div>

              {/* Live Tracking Banner for in-progress tests */}
              {!isCompleted && (
                <div
                  style={{
                    padding: "1.2rem",
                    background: "rgba(8, 126, 189, 0.08)",
                    border: "1px dashed rgba(8, 126, 189, 0.4)",
                    borderRadius: "12px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 0.35rem",
                      fontSize: "1rem",
                      color: "#0284c7",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FiActivity /> Live Status Tracking Active
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", lineHeight: 1.5 }}>
                    Your specimen is undergoing active clinical analysis in the {HOSPITAL_OFFICIAL_DETAILS.name} laboratory. This page
                    automatically syncs the moment results are verified and signed off by the pathologist.
                  </p>
                  <small style={{ display: "block", marginTop: "0.5rem", color: "#64748b" }}>
                    Last checked: {lastChecked.toLocaleTimeString()} (Polling every 8 seconds)
                  </small>
                </div>
              )}

              {/* Patient & Test Information Grid */}
              <div className="lab-verify-meta-grid">
                <div className="lab-verify-meta-cell">
                  <span>Patient Full Name</span>
                  <strong>{data.patient.fullName}</strong>
                </div>

                <div className="lab-verify-meta-cell">
                  <span>Hospital MRN</span>
                  <strong className="ref-id">{data.patient.mrn || "Pending"}</strong>
                </div>

                <div className="lab-verify-meta-cell">
                  <span>Investigation / Panel</span>
                  <strong style={{ color: "#0284c7" }}>{data.template.name}</strong>
                </div>

                <div className="lab-verify-meta-cell">
                  <span>Specimen Matrix</span>
                  <strong>{data.template.specimen || "Clinical Specimen"}</strong>
                </div>

                <div className="lab-verify-meta-cell">
                  <span>Sample Collected</span>
                  <strong>
                    {formatDate(
                      data.sampleCollectedAt ||
                        (isCompleted || data.status === "sample_collected" || data.status === "in_progress"
                          ? data.completedAt || data.createdAt
                          : null)
                    )}
                  </strong>
                </div>

                {isCompleted && (
                  <div className="lab-verify-meta-cell">
                    <span>Authorized Date</span>
                    <strong>{formatDate(data.completedAt)}</strong>
                  </div>
                )}
              </div>

              {/* High-Contrast Analyte Results Table */}
              {isCompleted ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "inherit",
                      }}
                    >
                      <FiFileText style={{ color: "#087ebd" }} /> Observed Analyte Parameters
                    </h3>
                    <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                      {data.template.fields?.length ?? 0} Parameters Tested
                    </span>
                  </div>

                  <div className="lab-verify-table-container">
                    <table className="lab-verify-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Observed Result</th>
                          <th>Unit</th>
                          <th>Standard Reference</th>
                          <th>Clinical Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.template.fields?.map((field, idx) => {
                          const rawVal = data.resultValues?.[field.key];
                          const displayVal = formatDisplayValue(rawVal);
                          const flag = evaluateFlag(field.referenceRange, rawVal);

                          return (
                            <tr key={idx}>
                              <td className="cell-param">
                                <strong className="lab-verify-param-name">{field.label}</strong>
                              </td>
                              <td className="cell-value">
                                <strong>{displayVal}</strong>
                              </td>
                              <td className="cell-unit">{formatScientificUnit(field.unit)}</td>
                              <td className="cell-range">{field.referenceRange || "Standard"}</td>
                              <td>
                                {flag ? (
                                  <span className={`lab-verify-flag ${flag.status}`}>{flag.label}</span>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "0.8rem", paddingLeft: "0.5rem" }}>
                                    <FiCheck style={{ color: "#10b981", verticalAlign: "middle" }} />
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Clinical Interpretation & Notes */}
                  {(data.interpretation || data.technicianNote) && (
                    <div
                      style={{
                        padding: "1.15rem",
                        background: "rgba(8, 126, 189, 0.06)",
                        border: "1px solid rgba(8, 126, 189, 0.2)",
                        borderRadius: "12px",
                        fontSize: "0.88rem",
                        lineHeight: 1.6,
                      }}
                    >
                      {data.interpretation && (
                        <p style={{ margin: "0 0 0.5rem" }}>
                          <strong style={{ color: "#0284c7" }}>Clinical Interpretation: </strong>
                          {data.interpretation}
                        </p>
                      )}
                      {data.technicianNote && (
                        <p style={{ margin: 0 }}>
                          <strong style={{ color: "#64748b" }}>Technician Notes: </strong>
                          {data.technicianNote}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Authorized Pathologist / Laboratory Scientist Sign-off */}
                  <div className="lab-verify-signoff">
                    <div className="lab-verify-signoff-info">
                      <small>Authorized Clinical Sign-off</small>
                      <strong>{data.technician?.name || "Medical Laboratory Scientist"}</strong>
                      <span>{HOSPITAL_OFFICIAL_DETAILS.name} Diagnostic Pathology Registry • Kano</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#10b981" }}>
                      <FiShield style={{ fontSize: "1.8rem" }} />
                      <div>
                        <strong style={{ display: "block", fontSize: "0.85rem", letterSpacing: "0.03em" }}>
                          DIGITALLY AUTHENTICATED
                        </strong>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          Tamper-proof medical diagnostic record
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* In-Progress Pipeline */
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem" }}>Diagnostic Workflow Milestones</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                    <div
                      style={{
                        padding: "1rem",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        borderRadius: "10px",
                      }}
                    >
                      <span style={{ fontSize: "0.74rem", color: "#059669", fontWeight: 800 }}>
                        1. REQUEST RECORDED
                      </span>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.84rem", fontWeight: 700 }}>
                        {formatDate(data.createdAt)}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "1rem",
                        background: data.sampleCollectedAt ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                        border: `1px solid ${data.sampleCollectedAt ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                        borderRadius: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.74rem",
                          color: data.sampleCollectedAt ? "#059669" : "#d97706",
                          fontWeight: 800,
                        }}
                      >
                        2. SAMPLE RECEIPT
                      </span>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.84rem", fontWeight: 700 }}>
                        {data.sampleCollectedAt ? formatDate(data.sampleCollectedAt) : "In Progress"}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "1rem",
                        background: "rgba(100, 116, 139, 0.08)",
                        border: "1px solid rgba(100, 116, 139, 0.2)",
                        borderRadius: "10px",
                      }}
                    >
                      <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 800 }}>
                        3. SCIENTIST VALIDATION
                      </span>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.84rem", color: "#64748b" }}>
                        Awaiting Analyte Release
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Standardized Hospital Contact Footer */}
              <footer className="lab-verify-footer-address">
                <strong>{HOSPITAL_OFFICIAL_DETAILS.name}</strong> • {HOSPITAL_OFFICIAL_DETAILS.fullAddress}
                <br />
                Emergency & Enquiries: {HOSPITAL_OFFICIAL_DETAILS.displayPhone} • Email: {HOSPITAL_OFFICIAL_DETAILS.email}
                <br />
                {HOSPITAL_OFFICIAL_DETAILS.accreditation}
              </footer>
            </>
          )}
        </section>
      </div>

      {/* Print Document Modal */}
      {data && isPrintModalOpen && (
        <LaboratoryPrintModal
          request={data}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* Share Result Modal */}
      {data && isShareModalOpen && (
        <ShareLabResultModal
          request={data}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </main>
  );
}
