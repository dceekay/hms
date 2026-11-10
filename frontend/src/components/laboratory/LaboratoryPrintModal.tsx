import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiPrinter, FiX, FiFileText, FiCheckCircle, FiShare2 } from "react-icons/fi";
import type { LaboratoryRequest } from "../../types/laboratory";
import type { LaboratoryVerificationData } from "../../services/laboratoryService";
import LaboratoryPrintDocument from "./LaboratoryPrintDocument";
import ShareLabResultModal from "./ShareLabResultModal";

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
  const hasResults =
    (request?.resultValues && Object.keys(request.resultValues).length > 0) ||
    Boolean(request?.interpretation) ||
    Boolean(request?.technicianNote);

  const [docType, setDocType] = useState<"result" | "request">(() => {
    if (initialDocumentType) return initialDocumentType;
    return hasResults || (request && request.status === "completed") ? "result" : "request";
  });
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    document.body.classList.add("has-print-modal", "lab-print-modal-active");
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("has-print-modal", "lab-print-modal-active");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!request) return null;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="lab-modal-overlay lab-print-modal-overlay print-canvas printable-area" onClick={onClose}>
      <div
        className="lab-modal-container lab-print-modal-container"
        style={{ maxWidth: "900px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Toolbar (hidden during physical print) */}
        <div className="lab-modal-header lab-print-modal-header no-print">
          <div>
            <h2>
              <FiPrinter style={{ color: "var(--accent)" }} /> Print Document Preview
            </h2>
            <p style={{ margin: "0.2rem 0 0", color: "var(--muted)", fontSize: "0.86rem" }}>
              {request.requestNumber} — {request.template?.name}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Format toggle if result is available */}
            {(request.status === "completed" || hasResults) && (
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
              className="lab-action-btn share"
              onClick={() => setShowShareModal(true)}
              style={{ padding: "0.45rem 0.95rem", borderRadius: "8px" }}
            >
              <FiShare2 /> Share Result
            </button>

            <button
              type="button"
              className="lab-btn-primary print-allow"
              onClick={handlePrint}
            >
              <FiPrinter /> Print Document
            </button>

            <button
              type="button"
              className="lab-icon-btn modal-close-btn"
              onClick={onClose}
              aria-label="Close report print preview"
              title="Close"
            >
              <FiX size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Printable Canvas */}
        <div className="lab-modal-body lab-print-modal-body">
          <LaboratoryPrintDocument request={request} documentType={docType} />
        </div>
      </div>

      {showShareModal && (
        <div className="no-print" onClick={(e) => e.stopPropagation()}>
          <ShareLabResultModal
            request={request}
            onClose={() => setShowShareModal(false)}
          />
        </div>
      )}
    </div>,
    document.body
  );
}
