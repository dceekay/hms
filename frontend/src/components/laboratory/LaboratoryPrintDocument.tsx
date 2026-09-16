import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { MdsMark } from "../common/CavendishLogo";
import { getAppUrl } from "../../utils/appUrl";
import type { LaboratoryRequest } from "../../types/laboratory";
import type { LaboratoryVerificationData } from "../../services/laboratoryService";

import { HOSPITAL_OFFICIAL_DETAILS } from "../../constants/hospitalInfo";

interface LaboratoryPrintDocumentProps {
  request: LaboratoryRequest | LaboratoryVerificationData;
  documentType?: "result" | "request";
  customVerificationUrl?: string;
}

export const HOSPITAL_PRINT_INFO = {
  name: HOSPITAL_OFFICIAL_DETAILS.name,
  subtitle: "Specialist Diagnostic Centre & Clinical Pathology",
  address: HOSPITAL_OFFICIAL_DETAILS.fullAddress,
  phone: HOSPITAL_OFFICIAL_DETAILS.displayPhone,
  email: HOSPITAL_OFFICIAL_DETAILS.email,
  web: HOSPITAL_OFFICIAL_DETAILS.web,
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

    const lowerRef = referenceRange.toLowerCase();
    const lowerVal = strVal.toLowerCase();
    if (lowerRef.includes("negative") || lowerRef.includes("non-reactive") || lowerRef.includes("normal")) {
      if (lowerVal.includes("positive") || lowerVal.includes("reactive") || lowerVal.includes("3+") || lowerVal.includes("4+")) {
        return "ABNORMAL (A)";
      }
      if (lowerVal.includes("negative") || lowerVal.includes("non-reactive") || lowerVal.includes("normal")) {
        return "NORMAL";
      }
    }

    return null;
  };

  const technicianName =
    "technician" in request && request.technician
      ? request.technician.name
      : "completedBy" in request && request.completedBy
      ? `${request.completedBy.firstName} ${request.completedBy.lastName}`
      : "Medical Laboratory Scientist";

  return (
    <div className="lab-print-document-container lab-print-page">
      {/* 1. Official Hospital Header */}
      <header className="lab-print-header-banner">
        <div className="lab-print-brand-left">
          <MdsMark size={64} className="lab-print-hospital-logo" />
          <div>
            <h1 className="lab-print-hospital-name">{HOSPITAL_PRINT_INFO.name}</h1>
            <p className="lab-print-hospital-sub">{HOSPITAL_PRINT_INFO.subtitle}</p>
            <p className="lab-print-hospital-address">
              Address: {HOSPITAL_PRINT_INFO.address}
            </p>
            <p className="lab-print-hospital-contact">
              Tel: {HOSPITAL_PRINT_INFO.phone} | Email: {HOSPITAL_PRINT_INFO.email}
            </p>
          </div>
        </div>

        {/* Top-Right QR Code with Scan Instructions */}
        <div className="lab-print-qr-group">
          {qrCodeDataUrl ? (
            <img
              src={qrCodeDataUrl}
              alt="Lab Verification QR Code"
              className="lab-print-qr-img"
            />
          ) : (
            <div className="lab-print-qr-placeholder">QR CODE</div>
          )}
          <span className="lab-print-qr-label">
            Scan QR to track test & view verified results
          </span>
          <span className="lab-print-qr-id">TRACK: {request.requestNumber}</span>
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
              {request.template.fields.map((field, idx) => {
                const rawVal = request.resultValues?.[field.key];
                const displayVal =
                  rawVal !== undefined && rawVal !== null && rawVal !== ""
                    ? String(rawVal)
                    : "—";
                const flag = evaluateFlag(field.referenceRange, rawVal);

                return (
                  <tr key={idx}>
                    <td className="lab-print-param-cell">
                      <strong className="lab-print-param-name">{field.label}</strong>
                    </td>
                    <td className="lab-print-val-cell">
                      <span className="lab-print-val-text">{displayVal}</span>
                      {flag && flag !== "NORMAL" && (
                        <span className="lab-print-flag-inline"> {flag}</span>
                      )}
                    </td>
                    <td className="lab-print-unit-cell">{field.unit || "—"}</td>
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
            <span>{HOSPITAL_OFFICIAL_DETAILS.name}</span>
            <strong>OFFICIAL VALIDATED</strong>
            <small>DIAGNOSTIC SERVICE • KANO</small>
            <div style={{ marginTop: "6px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", color: "#092a5e" }}>
              [ OFFICIAL HOSPITAL STAMP ]
            </div>
          </div>
        </div>
      </footer>

      {/* Security Disclaimer */}
      <div className="lab-print-disclaimer">
        Validated clinical diagnostic document issued by {HOSPITAL_OFFICIAL_DETAILS.name}, Kano State. Live verification and tracking available by scanning the QR code above or visiting {HOSPITAL_OFFICIAL_DETAILS.web}. Enquiries: {HOSPITAL_OFFICIAL_DETAILS.email} | {HOSPITAL_OFFICIAL_DETAILS.displayPhone}.
      </div>
    </div>
  );
}
