import { useState } from "react";
import {
  CheckCircle2 as FiCheckCircle,
  AlertTriangle as FiAlertTriangle,
  Printer as FiPrinter,
  Activity as FiActivity,
  FileText as FiFileText,
  RefreshCw as FiRefreshCw,
} from "lucide-react";
import { MdsMark } from "../common/CavendishLogo";
import { HOSPITAL_OFFICIAL_DETAILS } from "../../constants/hospitalInfo";
import type { LaboratoryTemplateField, LaboratoryTemplateFormValues } from "../../types/laboratory";

interface LaboratoryReportPreviewProps {
  formValues: LaboratoryTemplateFormValues;
  onPrint?: () => void;
  isInteractive?: boolean;
}

export default function LaboratoryReportPreview({
  formValues,
  onPrint,
  isInteractive = true,
}: LaboratoryReportPreviewProps) {
  const [simulatedValues, setSimulatedValues] = useState<Record<string, string>>({});
  const [interactiveMode, setInteractiveMode] = useState(isInteractive);

  const handleSimValueChange = (key: string, value: string) => {
    setSimulatedValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetSimulation = () => {
    setSimulatedValues({});
  };

  // Helper to evaluate value against reference range
  const getFlagStatus = (field: LaboratoryTemplateField, value?: string) => {
    if (!value || !value.trim()) return null;
    const rawVal = value.trim();

    if (field.type === "number") {
      const num = parseFloat(rawVal);
      if (isNaN(num)) return null;

      // Extract low/high bounds from range string e.g. "4.0 - 11.0" or "< 200" or "> 40"
      const range = field.referenceRange ?? "";
      if (range.includes("-")) {
        const parts = range.split("-").map((p) => parseFloat(p.replace(/[^0-9.]/g, "")));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          if (num < parts[0]) return { status: "low", label: "LOW" };
          if (num > parts[1]) return { status: "high", label: "HIGH" };
          return { status: "normal", label: "NORMAL" };
        }
      } else if (range.includes("<")) {
        const limit = parseFloat(range.replace(/[^0-9.]/g, ""));
        if (!isNaN(limit)) {
          return num < limit
            ? { status: "normal", label: "NORMAL" }
            : { status: "high", label: "HIGH" };
        }
      } else if (range.includes(">")) {
        const limit = parseFloat(range.replace(/[^0-9.]/g, ""));
        if (!isNaN(limit)) {
          return num > limit
            ? { status: "normal", label: "NORMAL" }
            : { status: "low", label: "LOW" };
        }
      }
    }

    if (field.type === "select" || field.type === "text") {
      const ref = (field.referenceRange ?? "").toLowerCase();
      const val = rawVal.toLowerCase();
      if (ref.includes("negative") || ref.includes("non-reactive") || ref.includes("normal") || ref.includes("nil")) {
        if (val.includes("positive") || val.includes("reactive") || val.includes("high") || val.includes("abnormal") || val.includes("3+") || val.includes("4+")) {
          return { status: "abnormal", label: "ABNORMAL" };
        }
        if (val.includes("negative") || val.includes("non-reactive") || val.includes("normal") || val.includes("nil") || val.includes("clear")) {
          return { status: "normal", label: "NORMAL" };
        }
      }
    }

    return null;
  };

  return (
    <div className="lab-simulator-box">
      <div className="lab-simulator-header-bar">
        <strong>
          <FiActivity /> Live Diagnostic Report Simulator
        </strong>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <label className="lab-simulator-interactive-toggle">
            <input
              type="checkbox"
              checked={interactiveMode}
              onChange={(e) => setInteractiveMode(e.target.checked)}
            />
            Test Input Mode
          </label>
          {interactiveMode && (
            <button
              type="button"
              className="lab-icon-btn"
              onClick={resetSimulation}
              title="Clear simulated values"
            >
              <FiRefreshCw />
            </button>
          )}
          {onPrint && (
            <button
              type="button"
              className="lab-icon-btn"
              onClick={onPrint}
              title="Print preview"
            >
              <FiPrinter />
            </button>
          )}
        </div>
      </div>

      <div className="lab-report-sheet lab-print-page">
        {/* Hospital Official Branding Header */}
        <div className="lab-report-branding" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <MdsMark size={48} />
          <div className="lab-report-logo-text" style={{ flex: 1 }}>
            <h2>{HOSPITAL_OFFICIAL_DETAILS.name}</h2>
            <p>Department of Laboratory Medicine & Diagnostic Pathology</p>
            <p style={{ fontSize: "0.7rem", color: "#64748b" }}>
              {HOSPITAL_OFFICIAL_DETAILS.shortAddress} • {HOSPITAL_OFFICIAL_DETAILS.laboratoryAccreditation}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.72rem", color: "#64748b" }}>
            <span style={{ fontWeight: 700, color: "#092a5e" }}>CONFIDENTIAL MEDICAL REPORT</span>
            <br />
            Report ID: <span style={{ fontFamily: "monospace" }}>LAB-SIM-2026</span>
          </div>
        </div>

        {/* Report Header Title Banner */}
        <div className="lab-report-header-title">
          {formValues.reportTitle || formValues.name || "LABORATORY INVESTIGATION REPORT"}
        </div>

        {/* Patient / Test Specimen Metadata Bar */}
        <div className="lab-report-meta-grid">
          <div className="lab-report-meta-item">
            <strong>Patient Name (Simulated)</strong>
            <span>DOE, Jane (F / 34 Yrs)</span>
          </div>
          <div className="lab-report-meta-item">
            <strong>Specimen Matrix</strong>
            <span>{formValues.specimen || "Standard Specimen"}</span>
          </div>
          <div className="lab-report-meta-item">
            <strong>Test Code & Category</strong>
            <span>
              {formValues.code || "LAB-AUTO"} ({formValues.category || "General"})
            </span>
          </div>
        </div>

        {/* Results Data Table */}
        <table className="lab-report-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>Investigation Parameter</th>
              <th style={{ width: interactiveMode ? "30%" : "25%" }}>Result Value</th>
              <th style={{ width: "15%" }}>Unit</th>
              <th style={{ width: "20%" }}>Reference Interval</th>
            </tr>
          </thead>
          <tbody>
            {formValues.fields.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
                  <FiFileText style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }} />
                  <br />
                  No result fields added yet. Add fields on the left canvas to populate this report.
                </td>
              </tr>
            ) : (
              formValues.fields.map((field, idx) => {
                const currentVal = simulatedValues[field.key] ?? "";
                const flag = getFlagStatus(field, currentVal);

                return (
                  <tr key={idx}>
                    <td className="lab-report-param-cell">
                      <strong className="lab-report-param-name">{field.label || `Field ${idx + 1}`}</strong>
                      {field.required && (
                        <span style={{ color: "#ef4444", marginLeft: "4px", fontSize: "0.75rem" }}>
                          *
                        </span>
                      )}
                    </td>
                    <td className="lab-report-val-cell">
                      {interactiveMode ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {field.type === "select" && field.options && field.options.length > 0 ? (
                            <select
                              className="lab-report-sim-input"
                              value={currentVal}
                              onChange={(e) => handleSimValueChange(field.key, e.target.value)}
                            >
                              <option value="">-- Select --</option>
                              {field.options.map((opt, optIdx) => (
                                <option key={optIdx} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === "textarea" ? (
                            <input
                              className="lab-report-sim-input"
                              value={currentVal}
                              onChange={(e) => handleSimValueChange(field.key, e.target.value)}
                              placeholder="Clinical findings..."
                            />
                          ) : (
                            <input
                              className="lab-report-sim-input"
                              type={field.type === "number" ? "number" : "text"}
                              value={currentVal}
                              onChange={(e) => handleSimValueChange(field.key, e.target.value)}
                              placeholder={field.type === "number" ? "0.00" : "Result"}
                            />
                          )}
                          {flag && (
                            <span className={`lab-report-flag-badge ${flag.status}`}>
                              {flag.label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="lab-report-val-text">{currentVal || "—"}</span>
                      )}
                    </td>
                    <td className="lab-report-unit-cell">
                      <span style={{ color: "#64748b", fontWeight: 500 }}>
                        {field.unit || "—"}
                      </span>
                    </td>
                    <td className="lab-report-ref-cell">
                      <span style={{ fontSize: "0.78rem", color: "#475569" }}>
                        {field.referenceRange || "Standard"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Processing Notes / Clinical Instructions */}
        {formValues.notes && (
          <div
            style={{
              padding: "0.65rem 0.85rem",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "6px",
              fontSize: "0.78rem",
              color: "#334155",
            }}
          >
            <strong style={{ color: "#092a5e" }}>Clinical Notes / Instructions: </strong>
            {formValues.notes}
          </div>
        )}

        {/* Medical Sign-off Footer */}
        <div className="lab-report-footer-sign">
          <div>
            <div className="lab-report-sign-line"></div>
            <strong>Medical Laboratory Scientist</strong>
            <br />
            <span>Lic: MLS-CAV-2026</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="lab-report-sign-line" style={{ marginLeft: "auto" }}></div>
            <strong>Pathologist In-Charge</strong>
            <br />
            <span>{HOSPITAL_OFFICIAL_DETAILS.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
