import { useState } from "react";
import { FiPrinter, FiX, FiFileText, FiCheckCircle } from "react-icons/fi";
import type { LaboratoryRequest } from "../../types/laboratory";
import type { LaboratoryVerificationData } from "../../services/laboratoryService";
import LaboratoryPrintDocument from "./LaboratoryPrintDocument";

interface LaboratoryPrintModalProps {
  request: LaboratoryRequest | LaboratoryVerificationData | null;
  onClose: () => void;
  initialDocumentType?: "result" | "request";
}

export default function LaboratoryPrintModal({
  request,
  onClose,
  initialDocumentType,
}: LaboratoryPrintModalProps) {
  const [docType, setDocType] = useState<"result" | "request">(() => {
    if (initialDocumentType) return initialDocumentType;
    return request && request.status === "completed" ? "result" : "request";
  });

  if (!request) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="lab-modal-overlay" onClick={onClose}>
      <div
        className="lab-modal-container"
        style={{ maxWidth: "900px", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Toolbar (hidden during physical print) */}
        <div className="lab-modal-header no-print">
          <div>
            <h2>
              <FiPrinter style={{ color: "var(--accent)" }} /> Print Document Preview
            </h2>
            <p style={{ margin: "0.2rem 0 0", color: "var(--muted)", fontSize: "0.86rem" }}>
              {request.requestNumber} — {request.template?.name}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Format toggle if result is available */}
            {request.status === "completed" && (
              <div className="lab-view-mode-toggle">
                <button
                  type="button"
                  className={`lab-view-mode-btn ${docType === "result" ? "active" : ""}`}
                  onClick={() => setDocType("result")}
                >
                  <FiCheckCircle style={{ marginRight: "4px" }} /> Result Report
                </button>
                <button
                  type="button"
                  className={`lab-view-mode-btn ${docType === "request" ? "active" : ""}`}
                  onClick={() => setDocType("request")}
                >
                  <FiFileText style={{ marginRight: "4px" }} /> Requisition Slip
                </button>
              </div>
            )}

            <button
              type="button"
              className="lab-btn-primary print-allow"
              onClick={handlePrint}
            >
              <FiPrinter /> Print Document
            </button>

            <button type="button" className="lab-icon-btn" onClick={onClose}>
              <FiX />
            </button>
          </div>
        </div>

        {/* Printable Canvas */}
        <div className="lab-modal-body" style={{ background: "#e2e8f0", padding: "1.5rem" }}>
          <LaboratoryPrintDocument request={request} documentType={docType} />
        </div>
      </div>
    </div>
  );
}
