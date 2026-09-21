import React, { useRef } from "react";
import { FiPrinter, FiX, FiCheckCircle, FiFileText } from "react-icons/fi";
import BillingReceiptPrintDocument from "./BillingReceiptPrintDocument";
import type { PatientBill } from "../../types/billing";

interface BillingReceiptModalProps {
  bill: PatientBill;
  onClose: () => void;
}

export default function BillingReceiptModal({
  bill,
  onClose,
}: BillingReceiptModalProps) {
  const printContainerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isPaid = bill.paymentStatus === "paid";

  return (
    <div className="lab-print-modal-overlay" onClick={onClose}>
      <div
        className="lab-print-modal-container"
        style={{ maxWidth: "900px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Bar */}
        <div className="lab-print-modal-header no-print">
          <div className="lab-print-modal-title">
            {isPaid ? (
              <FiCheckCircle style={{ color: "var(--success, #059669)", fontSize: "1.4rem" }} />
            ) : (
              <FiFileText style={{ color: "var(--accent, #087ebd)", fontSize: "1.4rem" }} />
            )}
            <div>
              <h3>{isPaid ? "Hospital Payment Receipt" : "Hospital Billing Invoice"}</h3>
              <p>
                Invoice <strong style={{ color: "var(--accent, #087ebd)" }}>{bill.invoiceNumber}</strong> •{" "}
                {bill.patient?.firstName} {bill.patient?.lastName}
              </p>
            </div>
          </div>

          <div className="lab-print-modal-actions">
            <button
              type="button"
              className="lab-btn-primary"
              onClick={handlePrint}
              autoFocus
            >
              <FiPrinter /> {isPaid ? "Print Receipt" : "Print Invoice"}
            </button>
            <button
              type="button"
              className="icon-only-btn modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
              title="Close modal"
            >
              <FiX size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview Body */}
        <div className="lab-print-modal-body" ref={printContainerRef}>
          <BillingReceiptPrintDocument bill={bill} />
        </div>
      </div>
    </div>
  );
}
