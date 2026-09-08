import { useEffect, useState } from "react";
import QRCode from "qrcode";
import mdsLogo from "../../assets/optimized/logo.png";
import { getAppUrl } from "../../utils/appUrl";
import type { LaboratoryRequest } from "../../types/laboratory";
import type { LaboratoryVerificationData } from "../../services/laboratoryService";

interface LaboratoryPrintDocumentProps {
  request: LaboratoryRequest | LaboratoryVerificationData;
  documentType?: "result" | "request";
  customVerificationUrl?: string;
}

export const HOSPITAL_PRINT_INFO = {
  name: "MDS HOSPITAL",
  subtitle: "Specialist Diagnostic Centre & Clinical Pathology",
  address: "Kano State, Nigeria",
  phone: "+234 812 345 6789",
  email: "info@mdshospital.com",
};

function formatDate(val?: string | null): string {
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
}

export default function LaboratoryPrintDocument({
  request,
  documentType,
  customVerificationUrl,
}: LaboratoryPrintDocumentProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const isCompleted = request.status === "completed";
  const actualDocType = documentType ?? (isCompleted ? "result" : "request");

  const labIdentifier = request.id || request.requestNumber;
  const verificationUrl =
    customVerificationUrl ||
    getAppUrl(`/verify/lab/${encodeURIComponent(labIdentifier)}`);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(verificationUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: "#092a5e",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) setQrCodeDataUrl(url);
      })
      .catch((err) => console.error("QR Code generation error:", err));

    return () => {
      active = false;
    };
  }, [verificationUrl]);

  const patientName =
    "patient" in request && request.patient
      ? "fullName" in request.patient
        ? request.patient.fullName
        : `${request.patient.firstName ?? ""} ${request.patient.lastName ?? ""}`.trim()
      : "Patient";

  const mrn = request.patient?.mrn || "N/A";
  const gender = request.patient?.gender || "Not specified";

  // Evaluate normal / abnormal flag for numeric or select fields
  const evaluateFlag = (referenceRange?: string | null, value?: unknown) => {
    if (value === undefined || value === null || value === "") return null;
    const strVal = String(value).trim();
    if (!referenceRange) return null;

    const num = parseFloat(strVal);
    if (!isNaN(num) && referenceRange.includes("-")) {
      const parts = referenceRange.split("-").map((p) => parseFloat(p.replace(/[^0-9.]/g, "")));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        if (num < parts[0]) return "LOW (L)";
        if (num > parts[1]) return "HIGH (H)";
        return "NORMAL";
      }
    }
    return null;
  };

  const technicianName =
    request.completedBy
      ? `${request.completedBy.firstName || ""} ${request.completedBy.lastName || ""}`.trim()
      : "Staff Laboratory Scientist";

  return (
    <div className="lab-print-document-root" id="printable-lab-receipt">
      {/* 1. Header with Logo, Hospital Info, and Verification QR */}
      <header className="lab-print-header-grid">
        <div className="lab-print-brand-col">
          <img src={mdsLogo} alt="MDS Hospital" className="lab-print-logo-mark" style={{ width: 48, height: 48, objectFit: "contain" }} />
          <div>
            <h1 className="lab-print-hospital-name">{HOSPITAL_PRINT_INFO.name}</h1>
            <p className="lab-print-hospital-sub">{HOSPITAL_PRINT_INFO.subtitle}</p>
            <p className="lab-print-hospital-meta">
              {HOSPITAL_PRINT_INFO.address} • Tel: {HOSPITAL_PRINT_INFO.phone}
            </p>
          </div>
        </div>

        <div className="lab-print-qr-col">
          {qrCodeDataUrl ? (
            <img
              src={qrCodeDataUrl}
              alt="Verification QR Code"
              className="lab-print-qr-image"
            />
          ) : (
            <div className="lab-print-qr-placeholder">QR CODE</div>
          )}
          <span className="lab-print-qr-caption">Scan to Verify Result</span>
          <span className="lab-print-request-number">{request.requestNumber}</span>
        </div>
      </header>

      {/* 2. Document Title Banner */}
      <div className="lab-print-doc-title-bar">
        <h2>
          {actualDocType === "result"
            ? request.template.reportTitle || `${request.template.name.toUpperCase()} - DIAGNOSTIC REPORT`
            : `LABORATORY TEST REQUISITION & TRACKING SLIP`}
        </h2>
        <span className={`lab-print-status-tag ${request.status}`}>
          {request.status.replace(/_/g, " ").toUpperCase()}
        </span>
      </div>

      {/* 3. Patient & Specimen Demographics Grid */}
      <section className="lab-print-demographics-grid">
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Patient Name</span>
          <strong className="lab-demo-value">{patientName}</strong>
        </div>
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Hospital MRN</span>
          <strong className="lab-demo-value">{mrn}</strong>
        </div>
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Gender</span>
          <strong className="lab-demo-value">{gender.toUpperCase()}</strong>
        </div>
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Test Ordered</span>
          <strong className="lab-demo-value">{request.template.name}</strong>
        </div>
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Diagnostic Category</span>
          <strong className="lab-demo-value">{request.template.category || "General"}</strong>
        </div>
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Required Specimen</span>
          <strong className="lab-demo-value">{request.template.specimen || "Standard Specimen"}</strong>
        </div>
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Requested On</span>
          <strong className="lab-demo-value">{formatDate(request.createdAt)}</strong>
        </div>
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Sample Collected</span>
          <strong className="lab-demo-value">
            {request.sampleCollectedAt ? formatDate(request.sampleCollectedAt) : "Pending Collection"}
          </strong>
        </div>
        {actualDocType === "result" && (
          <div className="lab-print-demo-item">
            <span className="lab-demo-label">Report Authorized</span>
            <strong className="lab-demo-value">{formatDate(request.completedAt)}</strong>
          </div>
        )}
      </section>

      {/* 4. MAIN CONTENT: Result Table (if completed) OR Requisition Instructions (if pending) */}
      {actualDocType === "result" ? (
        <section className="lab-print-results-section">
          <table className="lab-print-results-table">
            <thead>
              <tr>
                <th style={{ width: "38%" }}>Investigation Parameter</th>
                <th style={{ width: "22%" }}>Observed Value</th>
                <th style={{ width: "15%" }}>Unit</th>
                <th style={{ width: "25%" }}>Reference Interval</th>
              </tr>
            </thead>
            <tbody>
              {request.template.fields.map((field: any, idx: number) => {
                const rawVal = request.resultValues?.[field.key];
                const displayVal =
                  rawVal !== undefined && rawVal !== null && rawVal !== ""
                    ? String(rawVal)
                    : "—";
                const flag = evaluateFlag(field.referenceRange, rawVal);

                return (
                  <tr key={idx}>
                    <td>
                      <strong>{field.label}</strong>
                    </td>
                    <td>
                      <span className="lab-print-val-text">{displayVal}</span>
                      {flag && flag !== "NORMAL" && (
                        <span className="lab-print-flag-inline"> {flag}</span>
                      )}
                    </td>
                    <td>{field.unit || "—"}</td>
                    <td className="lab-print-ref-cell">{field.referenceRange || "Standard"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Clinical Interpretation & Notes */}
          <div className="lab-print-remarks-box">
            {request.interpretation && (
              <div className="lab-print-remark-row">
                <strong>Clinical Interpretation: </strong>
                <span>{request.interpretation}</span>
              </div>
            )}
            {request.technicianNote && (
              <div className="lab-print-remark-row">
                <strong>Technician / Microscopy Remarks: </strong>
                <span>{request.technicianNote}</span>
              </div>
            )}
            {request.template.notes && (
              <div className="lab-print-remark-row" style={{ color: "#64748b" }}>
                <strong>Methodology / Specimen Note: </strong>
                <span>{request.template.notes}</span>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* PENDING REQUEST & COLLECTION SLIP VIEW */
        <section className="lab-print-requisition-section">
          <div className="lab-print-pending-notice">
            <h3>SAMPLE COLLECTION & RESULT TRACKING SLIP</h3>
            <p>
              This investigation is currently scheduled or undergoing laboratory processing.
              Please present this slip at the Phlebotomy / Sample Collection Desk.
            </p>
          </div>

          <div className="lab-print-collection-checklist">
            <h4>Sample Collection Verification & Laboratory Receiving</h4>
            <div className="lab-print-checklist-grid">
              <div className="lab-print-check-box">
                <span>[  ] Specimen Verified & Labeled</span>
              </div>
              <div className="lab-print-check-box">
                <span>[  ] Appropriate Tube / Container Used</span>
              </div>
              <div className="lab-print-check-box">
                <span>[  ] Adequate Volume Collected</span>
              </div>
              <div className="lab-print-check-box">
                <span>[  ] Received in Lab by: ____________________</span>
              </div>
            </div>
          </div>

          <div className="lab-print-qr-tracking-callout">
            <div style={{ flex: 1 }}>
              <h4>Live Result Tracking</h4>
              <p>
                Scan the QR code located at the top-right of this slip with your mobile camera
                to check your test result as soon as it is verified and authorized by laboratory staff.
              </p>
              <p style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#092a5e", marginTop: "0.4rem" }}>
                Tracking Link: {verificationUrl}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 5. Laboratory Scientist Signature Block */}
      <footer className="lab-print-footer-block">
        <div className="lab-print-sign-container">
          <div className="lab-print-sign-line"></div>
          <p className="lab-print-sign-role">
            <strong>{technicianName}</strong>
          </p>
          <p className="lab-print-sign-title">Medical Laboratory Scientist</p>
          <p className="lab-print-sign-meta">
            Authorized: {formatDate(request.completedAt || request.createdAt)}
          </p>
        </div>

        <div className="lab-print-security-stamp">
          <div className="lab-print-stamp-border">
            <span>MDS HOSPITAL</span>
            <strong>OFFICIAL VALIDATED</strong>
            <small>DIAGNOSTIC SERVICE</small>
          </div>
        </div>
      </footer>

      {/* Security Disclaimer */}
      <div className="lab-print-disclaimer">
        Validated clinical diagnostic document issued by MDS Hospital. Questions? Contact info@mdshospital.com.
      </div>
    </div>
  );
}
