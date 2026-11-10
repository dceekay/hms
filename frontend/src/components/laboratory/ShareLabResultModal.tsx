import React, { useState } from "react";
import {
  FiCheck,
  FiCopy,
  FiExternalLink,
  FiMail,
  FiMessageSquare,
  FiPhone,
  FiShare2,
  FiShield,
  FiX,
} from "react-icons/fi";
import { FaTelegramPlane, FaWhatsapp } from "react-icons/fa";
import type { LaboratoryRequest } from "../../types/laboratory";
import type { LaboratoryVerificationData } from "../../services/laboratoryService";
import { getAppUrl } from "../../utils/appUrl";
import { HOSPITAL_OFFICIAL_DETAILS } from "../../constants/hospitalInfo";

export interface ShareLabResultModalProps {
  request: LaboratoryRequest | LaboratoryVerificationData;
  onClose: () => void;
}

function getPatientDisplayName(request: LaboratoryRequest | LaboratoryVerificationData): string {
  const pat = request.patient as any;
  if (!pat) return "Hospital Patient";
  if (typeof pat.fullName === "string" && pat.fullName.trim()) {
    return pat.fullName.trim();
  }
  const full = `${pat.firstName || ""} ${pat.lastName || ""}`.trim();
  return full || "Hospital Patient";
}

function getPatientPhone(request: LaboratoryRequest | LaboratoryVerificationData): string {
  const pat = request.patient as any;
  return typeof pat?.phone === "string" ? pat.phone.trim() : "";
}

function getPatientEmail(request: LaboratoryRequest | LaboratoryVerificationData): string {
  const pat = request.patient as any;
  return typeof pat?.email === "string" ? pat.email.trim() : "";
}

function getTestDisplayName(request: LaboratoryRequest | LaboratoryVerificationData): string {
  const customName =
    typeof request.resultValues?.test_name === "string"
      ? request.resultValues.test_name.trim()
      : "";
  return customName || request.template?.name || "Laboratory Investigation";
}

function normalizeWhatsAppPhone(input: string): string {
  const digits = input.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0") && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }
  return digits;
}

export default function ShareLabResultModal({
  request,
  onClose,
}: ShareLabResultModalProps) {
  const patientName = getPatientDisplayName(request);
  const testName = getTestDisplayName(request);
  const mrn = request.patient?.mrn || "Walk-in";
  const identifier = request.requestNumber || request.id;
  const shareUrl = getAppUrl(`/verify/lab/${encodeURIComponent(identifier)}`);

  const [recipientPhone, setRecipientPhone] = useState<string>(() => getPatientPhone(request));
  const [recipientEmail, setRecipientEmail] = useState<string>(() => getPatientEmail(request));
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const shareSubject = `Official Lab Result: ${testName} - ${patientName} (${HOSPITAL_OFFICIAL_DETAILS.name})`;

  const fullShareMessage = [
    `*${HOSPITAL_OFFICIAL_DETAILS.name} — Official Laboratory Report*`,
    `Patient: ${patientName} (MRN: ${mrn})`,
    `Investigation: ${testName}`,
    `Accession No: ${request.requestNumber}`,
    `Status: Completed & Verified`,
    ``,
    `View, verify, and print your official result online:`,
    shareUrl,
    ``,
    `Enquiries: ${HOSPITAL_OFFICIAL_DETAILS.displayPhone} | ${HOSPITAL_OFFICIAL_DETAILS.email}`,
  ].join("\n");

  const smsShareMessage = `${HOSPITAL_OFFICIAL_DETAILS.name}: Lab result for ${patientName} (${testName} - ${request.requestNumber}) is ready. View & print result: ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      await navigator.clipboard.writeText(fullShareMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = normalizeWhatsAppPhone(recipientPhone);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullShareMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(fullShareMessage)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareEmail = () => {
    const emailTarget = recipientEmail.trim();
    const mailtoUrl = `mailto:${encodeURIComponent(emailTarget)}?subject=${encodeURIComponent(
      shareSubject
    )}&body=${encodeURIComponent(fullShareMessage.replace(/\*/g, ""))}`;
    window.location.href = mailtoUrl;
  };

  const handleShareSms = () => {
    const cleanPhone = recipientPhone.trim().replace(/[^0-9+]/g, "");
    const smsUrl = cleanPhone
      ? `sms:${cleanPhone}?body=${encodeURIComponent(smsShareMessage)}`
      : `sms:?body=${encodeURIComponent(smsShareMessage)}`;
    window.location.href = smsUrl;
  };

  const handleShareTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(
      shareUrl
    )}&text=${encodeURIComponent(
      `${HOSPITAL_OFFICIAL_DETAILS.name} Lab Result: ${testName} for ${patientName} (${request.requestNumber})`
    )}`;
    window.open(tgUrl, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareSubject,
          text: smsShareMessage,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed; fall back to copy link
      }
    }
    await handleCopyLink();
  };

  return (
    <div className="lab-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="share-lab-modal-title">
      <div className="lab-modal-content share-lab-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="lab-modal-header">
          <div className="lab-modal-header-title">
            <div className="lab-modal-icon-badge share">
              <FiShare2 />
            </div>
            <div>
              <h3 id="share-lab-modal-title">Share Laboratory Result</h3>
              <p>Send the authenticated test report link via WhatsApp, Email, SMS, or direct link.</p>
            </div>
          </div>
          <button
            type="button"
            className="lab-modal-close-btn"
            onClick={onClose}
            title="Close share modal"
          >
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className="lab-share-modal-body">
          {/* Test Summary Card */}
          <div className="lab-skip-test-summary lab-share-summary">
            <div>
              <label>Patient Name</label>
              <strong>{patientName}</strong>
            </div>
            <div>
              <label>Investigation</label>
              <strong>{testName}</strong>
            </div>
            <div>
              <label>Order / Accession #</label>
              <span>{request.requestNumber}</span>
            </div>
            <div>
              <label>Hospital MRN</label>
              <span>{mrn}</span>
            </div>
          </div>

          {/* Optional Direct Recipient Inputs */}
          <div className="lab-share-recipient-grid">
            <div className="lab-share-input-group">
              <label>
                <FiPhone /> Recipient Phone (Optional for WhatsApp / SMS)
              </label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="e.g. 0803 123 4567 (leave blank to pick contact)"
                className="lab-share-input"
              />
            </div>

            <div className="lab-share-input-group">
              <label>
                <FiMail /> Recipient Email (Optional for Email)
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. patient@example.com"
                className="lab-share-input"
              />
            </div>
          </div>

          {/* Platform Selection Grid */}
          <div className="lab-share-platforms-section">
            <span className="lab-share-section-label">Choose Platform to Share Test Link</span>
            <div className="lab-share-platforms-grid">
              <button
                type="button"
                className="lab-share-platform-btn whatsapp"
                onClick={handleShareWhatsApp}
              >
                <div className="platform-icon">
                  <FaWhatsapp />
                </div>
                <div className="platform-info">
                  <strong>WhatsApp</strong>
                  <small>{recipientPhone.trim() ? `Send to ${recipientPhone.trim()}` : "Share to WhatsApp chat"}</small>
                </div>
              </button>

              <button
                type="button"
                className="lab-share-platform-btn email"
                onClick={handleShareEmail}
              >
                <div className="platform-icon">
                  <FiMail />
                </div>
                <div className="platform-info">
                  <strong>Email</strong>
                  <small>{recipientEmail.trim() ? `Send to ${recipientEmail.trim()}` : "Send via Email client"}</small>
                </div>
              </button>

              <button
                type="button"
                className="lab-share-platform-btn sms"
                onClick={handleShareSms}
              >
                <div className="platform-icon">
                  <FiMessageSquare />
                </div>
                <div className="platform-info">
                  <strong>Text / SMS</strong>
                  <small>{recipientPhone.trim() ? `Text to ${recipientPhone.trim()}` : "Send via Text Message"}</small>
                </div>
              </button>

              <button
                type="button"
                className="lab-share-platform-btn telegram"
                onClick={handleShareTelegram}
              >
                <div className="platform-icon">
                  <FaTelegramPlane />
                </div>
                <div className="platform-info">
                  <strong>Telegram</strong>
                  <small>Share via Telegram</small>
                </div>
              </button>

              <button
                type="button"
                className="lab-share-platform-btn copy-msg"
                onClick={handleCopyFullMessage}
              >
                <div className="platform-icon">
                  {copiedMessage ? <FiCheck /> : <FiCopy />}
                </div>
                <div className="platform-info">
                  <strong>{copiedMessage ? "Summary Copied!" : "Copy Full Summary"}</strong>
                  <small>Copy formatted message + link</small>
                </div>
              </button>

              <button
                type="button"
                className="lab-share-platform-btn native"
                onClick={handleNativeShare}
              >
                <div className="platform-icon">
                  <FiShare2 />
                </div>
                <div className="platform-info">
                  <strong>More Apps</strong>
                  <small>System share sheet</small>
                </div>
              </button>
            </div>
          </div>

          {/* Direct Result Link Box */}
          <div className="lab-share-link-box">
            <div className="lab-share-link-label">
              <FiShield />
              <span>Authenticated Test Verification & Result Link</span>
            </div>
            <div className="lab-share-link-row">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="lab-share-link-input"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                className={`lab-share-copy-btn ${copiedLink ? "copied" : ""}`}
                onClick={handleCopyLink}
              >
                {copiedLink ? <FiCheck /> : <FiCopy />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="lab-share-open-btn"
                title="Open result link in new tab"
              >
                <FiExternalLink />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="lab-modal-footer">
          <button type="button" className="lab-modal-btn cancel" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

