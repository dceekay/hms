import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import mdsLogo from "../../assets/optimized/logo.png";
import type { PatientBill } from "../../types/billing";
import { useAuthStore } from "../../store/authStore";

export interface BillingReceiptPrintDocumentProps {
  bill: PatientBill;
}

const HOSPITAL_PRINT_INFO = {
  name: "MDS SPECIALIST HOSPITAL",
  subtitle: "Revenue & Billing Services · Kano State",
  address: "Eastern Bypass, Giginyu, Kano State, Nigeria",
  phone: "+234 812 345 6789",
  email: "billing@mdshospital.com.ng",
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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

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
  const invoiceNum = bill.invoiceNumber || `INV-${bill.id.slice(0, 8).toUpperCase()}`;

  useEffect(() => {
    let active = true;
    const qrData = JSON.stringify({
      hospital: "MDS Specialist Hospital Kano",
      invoice: invoiceNum,
      patient: patientName,
      mrn: mrn,
      amount: money(totalAmount),
      paid: money(paidAmount),
      status: isSettled ? "PAID" : bill.paymentStatus.toUpperCase(),
      date: formatDate(bill.billedAt),
      verify: `https://mds01.vercel.app/verify/billing/${encodeURIComponent(invoiceNum)}`,
    });

    QRCode.toDataURL(qrData, {
      margin: 1,
      width: 160,
      color: { dark: "#092a5e", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (active) setQrCodeDataUrl(dataUrl);
      })
      .catch((err) => console.error("Billing receipt QR error:", err));

    return () => {
      active = false;
    };
  }, [invoiceNum, patientName, mrn, totalAmount, paidAmount, isSettled, bill.paymentStatus, bill.billedAt]);

  return (
    <div className="billing-receipt-canvas" id="printable-billing-receipt">
      {/* 1. Official Receipt Header */}
      <header className="billing-receipt-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" }}>
        <div className="receipt-brand-row" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={mdsLogo}
            alt="MDS Specialist Hospital Kano Logo"
            className="receipt-logo"
            style={{ width: 56, height: 56, objectFit: "contain", imageRendering: "-webkit-optimize-contrast" }}
          />
          <div className="receipt-brand-text">
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#092a5e", letterSpacing: "0.02em" }}>
              {HOSPITAL_PRINT_INFO.name}
            </h1>
            <p className="receipt-subtitle" style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#0284c7", fontWeight: 600 }}>
              {HOSPITAL_PRINT_INFO.subtitle}
            </p>
            <p className="receipt-contact-meta" style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              {HOSPITAL_PRINT_INFO.address} • Tel: {HOSPITAL_PRINT_INFO.phone}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="receipt-title-box" style={{ textAlign: "right" }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
              OFFICIAL RECEIPT / PAYMENT INVOICE
            </h2>
            <div className="receipt-number-badge" style={{ marginTop: "4px" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", marginRight: "4px" }}>INV NO:</span>
              <strong style={{ fontSize: "0.9rem", color: "#0284c7", fontFamily: "monospace" }}>{invoiceNum}</strong>
            </div>
          </div>

          <div className="receipt-qr-block" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flexShrink: 0 }}>
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Scan QR to verify payment"
                style={{ width: 62, height: 62, borderRadius: 6, border: "1px solid #cbd5e1", padding: 2, background: "#fff" }}
              />
            ) : (
              <div style={{ width: 62, height: 62, background: "#f1f5f9", borderRadius: 6 }} />
            )}
            <span style={{ fontSize: "0.6rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>
              Scan to Verify
            </span>
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
