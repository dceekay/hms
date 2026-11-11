import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { MdsMark } from "../common/CavendishLogo";
import OfficialReceiptStamp from "../common/OfficialReceiptStamp";
import { getAppUrl } from "../../utils/appUrl";
import type { LaboratoryFieldType, LaboratoryRequest, LaboratoryTemplateField } from "../../types/laboratory";
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

  // 1. Safely normalize result values (handles JSON string or object)
  const normalizedResults = useMemo<Record<string, unknown>>(() => {
    const raw = request.resultValues;
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    }
    if (typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
    return {};
  }, [request.resultValues]);

  // 2. Safely normalize template fields (handles JSON string or array)
  const templateFields = useMemo<LaboratoryTemplateField[]>(() => {
    const raw = request.template?.fields;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [request.template?.fields]);

  // Check if any results or observations are present
  const hasResultData = useMemo(() => {
    const hasValues = Object.values(normalizedResults).some(
      (v) => v !== undefined && v !== null && String(v).trim() !== "" && String(v).trim() !== "—"
    );
    return (
      hasValues ||
      Boolean(request.interpretation?.trim()) ||
      Boolean(request.technicianNote?.trim()) ||
      request.status === "completed"
    );
  }, [normalizedResults, request.interpretation, request.technicianNote, request.status]);

  const isCompleted = request.status === "completed";
  // Default to "result" whenever result data is present, even if status is in_progress
  const actualDocType = documentType ?? (hasResultData || isCompleted ? "result" : "request");

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

  // 3. Compile full rows: defined template fields + any extra result values
  const resultRows = useMemo(() => {
    const rows: Array<{
      key: string;
      label: string;
      value: string;
      unit: string;
      referenceRange: string;
      flag: string | null;
    }> = [];

    const handledKeys = new Set<string>();

    // A. Defined template fields
    templateFields.forEach((field) => {
      handledKeys.add(field.key.toLowerCase());
      // Try exact key match, then lowercase key match
      let rawVal = normalizedResults[field.key];
      if (rawVal === undefined) {
        const found = Object.entries(normalizedResults).find(
          ([k]) => k.toLowerCase() === field.key.toLowerCase()
        );
        if (found) rawVal = found[1];
      }

      const displayVal =
        rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ""
          ? String(rawVal).trim()
          : "—";
      const flag = evaluateFlag(field.referenceRange, rawVal);

      rows.push({
        key: field.key,
        label: field.label || field.key,
        value: displayVal,
        unit: field.unit || "—",
        referenceRange: field.referenceRange || "Standard",
        flag,
      });
    });

    // B. Include any extra keys present in normalizedResults that weren't in templateFields
    Object.entries(normalizedResults).forEach(([key, val]) => {
      if (
        !handledKeys.has(key.toLowerCase()) &&
        val !== undefined &&
        val !== null &&
        String(val).trim() !== ""
      ) {
        rows.push({
          key,
          label: key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase()),
          value: String(val).trim(),
          unit: "—",
          referenceRange: "—",
          flag: null,
        });
      }
    });

    return rows;
  }, [templateFields, normalizedResults]);

  const templateName = request.template?.name || "Diagnostic Pathology Investigation";
  const templateCategory = request.template?.category || "Clinical Laboratory";
  const templateSpecimen = request.template?.specimen || "Standard Clinical Specimen";
  const reportTitle =
    request.template?.reportTitle ||
    `${templateName.toUpperCase()} - OFFICIAL DIAGNOSTIC REPORT`;

  const technicianName =
    "technician" in request && request.technician
      ? request.technician.name
      : "completedBy" in request && request.completedBy
      ? `${request.completedBy.firstName} ${request.completedBy.lastName}`
      : "Medical Laboratory Scientist";

  return (
    <div className="lab-print-document-container lab-print-page print-canvas printable-area">
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
            ? reportTitle
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
          <strong className="lab-demo-value">{templateName}</strong>
        </div>
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Diagnostic Category</span>
          <strong className="lab-demo-value">{templateCategory}</strong>
        </div>
        <div className="lab-print-demo-item">
          <span className="lab-demo-label">Required Specimen</span>
          <strong className="lab-demo-value">{templateSpecimen}</strong>
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
            <strong className="lab-demo-value">{formatDate(request.completedAt || request.createdAt)}</strong>
          </div>
        )}
      </section>

      {/* 4. MAIN CONTENT: Result Table (if completed or has result values) OR Requisition Instructions (if pending) */}
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
              {resultRows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
                    No specific parameter fields configured for this test.
                  </td>
                </tr>
              ) : (
                resultRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="lab-print-param-cell">
                      <strong className="lab-print-param-name">{row.label}</strong>
                    </td>
                    <td className="lab-print-val-cell">
                      <span className="lab-print-val-text">{row.value}</span>
                      {row.flag && row.flag !== "NORMAL" && (
                        <span className="lab-print-flag-inline"> {row.flag}</span>
                      )}
                    </td>
                    <td className="lab-print-unit-cell">{row.unit}</td>
                    <td className="lab-print-ref-cell">{row.referenceRange}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Clinical Interpretation & Notes */}
          <div className="lab-print-remarks-box">
            {request.clinicalNotes && (
              <div className="lab-print-remark-row">
                <strong>Clinical Notes / Indication: </strong>
                <span>{request.clinicalNotes}</span>
              </div>
            )}
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
            {request.template?.notes && (
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

        <div className="lab-print-security-stamp" style={{ display: "flex", justifyContent: "flex-end" }}>
          <OfficialReceiptStamp
            isSettled={true}
            date={formatDate(request.completedAt || request.createdAt)}
            department="LABORATORY & DIAGNOSTICS"
            size="md"
          />
        </div>
      </footer>

      {/* Security Disclaimer */}
      <div className="lab-print-disclaimer">
        Validated clinical diagnostic document issued by {HOSPITAL_OFFICIAL_DETAILS.name}, Kano State. Live verification and tracking available by scanning the QR code above or visiting {HOSPITAL_OFFICIAL_DETAILS.web}. Enquiries: {HOSPITAL_OFFICIAL_DETAILS.email} | {HOSPITAL_OFFICIAL_DETAILS.displayPhone}.
      </div>
    </div>
  );
}
