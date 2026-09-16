import React from "react";
import mdsLogo from "../../assets/optimized/logo.png";
import type { PatientBill } from "../../types/billing";
import { useAuthStore } from "../../store/authStore";

export interface BillingReceiptPrintDocumentProps {
  bill: PatientBill;
}

const HOSPITAL_PRINT_INFO = {
  name: "MDS HOSPITAL",
  subtitle: "Revenue & Billing Services",
  address: "Kano State, Nigeria",
  phone: "+234 812 345 6789",
  email: "info@mdshospital.com",
};

function money(value?: number | string | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function BillingReceiptPrintDocument({
  bill,
}: BillingReceiptPrintDocumentProps) {
  const currentUser = useAuthStore((state) => state.user);

  const patientName = bill.patient
    ? `${bill.patient.firstName || ""} ${bill.patient.lastName || ""}`.trim() || "Walk-in Patient"
    : "Walk-in Patient";

  const mrn = bill.patient?.mrn || bill.patient?.physicalFileNumber || "OPD-GUEST";
  const insuranceName = bill.patient?.insuranceProvider?.name || "Self Pay";
  const cashierName = bill.recordedBy
    ? `${bill.recordedBy.firstName || ""} ${bill.recordedBy.lastName || ""}`.trim()
    : currentUser
    ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim()
    : "Authorized Cashier";

  const totalAmount = Number(bill.totalAmount || 0);
  const paidAmount = Number(bill.amountPaid || 0);
  const balance = Math.max(0, totalAmount - paidAmount);
  const isSettled = bill.paymentStatus === "paid" || balance === 0;

  return (
    <div className="billing-receipt-canvas" id="printable-billing-receipt">
      {/* 1. Official Receipt Header */}
      <header className="billing-receipt-header">
        <div className="receipt-brand-row">
          <img
            src={mdsLogo}
            alt="MDS Hospital"
            className="receipt-logo"
            style={{ width: 44, height: 44, objectFit: "contain", imageRendering: "-webkit-optimize-contrast" }}
          />
          <div className="receipt-brand-text">
            <h1>{HOSPITAL_PRINT_INFO.name}</h1>
            <p className="receipt-subtitle">{HOSPITAL_PRINT_INFO.subtitle}</p>
            <p className="receipt-contact-meta">
              {HOSPITAL_PRINT_INFO.address} • Tel: {HOSPITAL_PRINT_INFO.phone}
            </p>
          </div>
        </div>

        <div className="receipt-title-box">
          <h2>OFFICIAL RECEIPT / PAYMENT INVOICE</h2>
          <div className="receipt-number-badge">
            <span>INV NO:</span>
            <strong>{bill.invoiceNumber || `INV-${bill.id.slice(0, 8).toUpperCase()}`}</strong>
          </div>
        </div>
      </header>

      {/* 2. Patient & Transaction Details */}
      <section className="receipt-demographics-grid">
        <div className="receipt-demo-cell">
          <small>Billed Patient</small>
          <strong>{patientName}</strong>
        </div>
        <div className="receipt-demo-cell">
          <small>Folder No / MRN</small>
          <strong>{mrn}</strong>
        </div>
        <div className="receipt-demo-cell">
          <small>Billing Date & Time</small>
          <strong>{formatDate(bill.billedAt)}</strong>
        </div>
        <div className="receipt-demo-cell">
          <small>Coverage / HMO</small>
          <strong>{insuranceName}</strong>
        </div>
        <div className="receipt-demo-cell">
          <small>Payment Status</small>
          <strong
            className={`receipt-status-text ${isSettled ? "paid" : "partial"}`}
            style={{ textTransform: "uppercase" }}
          >
            {isSettled ? "✓ FULLY SETTLED" : "PARTIALLY PAID / PENDING"}
          </strong>
        </div>
      </section>

      {/* 3. Itemized Bill Breakdown */}
      <section className="receipt-items-section table-responsive">
        <table className="receipt-items-table">
          <thead>
            <tr>
              <th className="hide-mobile" style={{ width: "8%" }}>#</th>
              <th style={{ width: "48%" }}>Service / Charge Description</th>
              <th style={{ width: "12%", textAlign: "center" }}>Qty</th>
              <th className="hide-mobile" style={{ width: "16%", textAlign: "right" }}>Unit Price</th>
              <th style={{ width: "16%", textAlign: "right" }}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="hide-mobile">1</td>
              <td>
                <strong>{bill.service?.name || "Hospital Medical Service"}</strong>
              </td>
              <td style={{ textAlign: "center" }}>{bill.quantity || 1}</td>
              <td className="hide-mobile" style={{ textAlign: "right" }}>{money(bill.unitPrice)}</td>
              <td style={{ textAlign: "right" }}>
                <strong>{money(bill.totalAmount)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 4. Financial Summary Calculation Box */}
      <section className="receipt-financial-summary">
        <div className="receipt-notes-area">
          {bill.notes && (
            <div className="receipt-note-box">
              <small>Cashier Notes:</small>
              <p>{bill.notes}</p>
            </div>
          )}
          <div className="receipt-payment-stamp">
            <div className={`stamp-seal ${isSettled ? "paid" : "pending"}`}>
              <span>MDS HOSPITAL</span>
              <strong>{isSettled ? "PAID" : "PENDING"}</strong>
              <small>{formatDate(bill.billedAt).split(",")[0]}</small>
            </div>
          </div>
        </div>

        <div className="receipt-totals-table">
          <div className="totals-row">
            <span>Gross Subtotal:</span>
            <strong>{money(totalAmount)}</strong>
          </div>
          <div className="totals-row">
            <span>Discount / Waiver:</span>
            <span>₦0.00</span>
          </div>
          <div className="totals-row grand-total">
            <span>Total Payable:</span>
            <strong>{money(totalAmount)}</strong>
          </div>
          <div className="totals-row amount-paid">
            <span>Amount Paid:</span>
            <strong style={{ color: "#0d9488" }}>{money(paidAmount)}</strong>
          </div>
          {balance > 0 && (
            <div className="totals-row balance-due">
              <span>Outstanding Balance:</span>
              <strong style={{ color: "#dc2626" }}>{money(balance)}</strong>
            </div>
          )}
        </div>
      </section>

      {/* 5. Authorization & Verification Footer */}
      <footer className="billing-receipt-footer">
        <div className="receipt-signature-block">
          <div className="signature-line"></div>
          <p>
            <strong>{cashierName}</strong>
          </p>
          <small>Receiving Cashier / Revenue Officer</small>
        </div>

        <div className="receipt-disclaimer-block">
          <p className="receipt-gratitude">Thank you for choosing MDS Hospital.</p>
          <small className="receipt-legal-text">
            Official computer-generated receipt valid without physical alteration. Keep this
            receipt for pharmacy dispensations and consultation verifications.
          </small>
        </div>
      </footer>
    </div>
  );
}
