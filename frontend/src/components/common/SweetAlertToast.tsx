import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiX, FiExternalLink } from "react-icons/fi";
import { FaUserMd, FaUserNurse } from "react-icons/fa";
import { playSuccessChime } from "../../utils/soundAlerts";
import "../../styles/sweetalert.css";

export interface SweetAlertOptions {
  id?: string;
  title: string;
  message: string;
  type?: "success" | "info" | "nurse" | "doctor";
  patientName?: string | null;
  mrn?: string | null;
  doctorName?: string | null;
  doctorOnline?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  durationMs?: number;
  playSound?: boolean;
  isModal?: boolean;
}

const SWEETALERT_EVENT = "hms:sweetalert";
const LEGACY_SWEETALERT_EVENT = "cavendish:sweetalert";

/**
 * Programmatic helper to trigger a SweetAlert anywhere in the frontend.
 */
export function fireSweetAlert(options: SweetAlertOptions) {
  if (typeof window === "undefined") return;
  const event = new CustomEvent<SweetAlertOptions>(SWEETALERT_EVENT, { detail: options });
  window.dispatchEvent(event);
}

export const SweetAlertToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<(SweetAlertOptions & { id: string })[]>([]);
  const [modal, setModal] = useState<SweetAlertOptions | null>(null);

  useEffect(() => {
    const handleAlert = (event: Event) => {
      const customEvent = event as CustomEvent<SweetAlertOptions>;
      const options = customEvent.detail;
      if (!options) return;

      if (options.playSound !== false) {
        playSuccessChime();
      }

      if (options.isModal) {
        setModal(options);
      } else {
        const toastId = options.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setToasts((prev) => [...prev, { ...options, id: toastId }]);

        const duration = options.durationMs ?? 7000;
        if (duration > 0) {
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toastId));
          }, duration);
        }
      }
    };

    window.addEventListener(SWEETALERT_EVENT, handleAlert);
    window.addEventListener(LEGACY_SWEETALERT_EVENT, handleAlert);
    return () => {
      window.removeEventListener(SWEETALERT_EVENT, handleAlert);
      window.removeEventListener(LEGACY_SWEETALERT_EVENT, handleAlert);
    };
  }, []);

  const closeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {/* Non-blocking floating toast alerts */}
      {toasts.length > 0 && (
        <div className="sweetalert-toast-container" role="region" aria-live="polite">
          {toasts.map((toast) => {
            const duration = toast.durationMs ?? 7000;
            return (
              <div key={toast.id} className="sweetalert-toast" role="alert">
                <div
                  className={`sweetalert-toast-icon ${
                    toast.type === "nurse"
                      ? "nurse"
                      : toast.type === "doctor"
                      ? "doctor"
                      : "success"
                  }`}
                >
                  {toast.type === "nurse" ? (
                    <FaUserNurse />
                  ) : toast.type === "doctor" ? (
                    <FaUserMd />
                  ) : (
                    <FiCheck />
                  )}
                </div>

                <div className="sweetalert-toast-body">
                  <h4 className="sweetalert-toast-title">{toast.title}</h4>
                  <p className="sweetalert-toast-desc">{toast.message}</p>

                  {(toast.patientName || toast.doctorName) && (
                    <div
                      className="sweetalert-meta-card"
                      style={{ padding: "0.5rem 0.75rem", marginBottom: "0.5rem" }}
                    >
                      {toast.patientName && (
                        <div className="sweetalert-meta-row">
                          <span className="sweetalert-meta-label">Patient:</span>
                          <span className="sweetalert-meta-value">
                            {toast.patientName} {toast.mrn ? `(${toast.mrn})` : ""}
                          </span>
                        </div>
                      )}
                      {toast.doctorName && (
                        <div className="sweetalert-meta-row">
                          <span className="sweetalert-meta-label">Doctor:</span>
                          <span className="sweetalert-meta-value">
                            {toast.doctorName}{" "}
                            {toast.doctorOnline !== undefined && (
                              <span
                                className={`sweetalert-meta-badge ${
                                  toast.doctorOnline ? "online" : "offline"
                                }`}
                              >
                                {toast.doctorOnline ? "Online" : "Offline"}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="sweetalert-toast-actions">
                    {toast.actionUrl && (
                      <Link
                        to={toast.actionUrl}
                        className="sweetalert-action-btn primary"
                        onClick={() => closeToast(toast.id)}
                      >
                        <FiExternalLink />
                        <span>{toast.actionLabel || "View Details"}</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      className="sweetalert-action-btn secondary"
                      onClick={() => closeToast(toast.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="sweetalert-btn-close"
                  onClick={() => closeToast(toast.id)}
                  aria-label="Close alert"
                >
                  <FiX />
                </button>

                {duration > 0 && (
                  <div
                    className="sweetalert-progress-bar"
                    style={{ animationDuration: `${duration}ms` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SweetAlert Modal Dialog */}
      {modal && (
        <div
          className="sweetalert-backdrop"
          onClick={() => setModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="sweetalert-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sweetalert-btn-close"
              onClick={() => setModal(null)}
              aria-label="Close modal"
            >
              <FiX />
            </button>

            <div className={`sweetalert-icon-wrap ${modal.type || "success"}`}>
              <svg className="sweetalert-checkmark-svg" viewBox="0 0 52 52">
                <circle
                  cx="26"
                  cy="26"
                  r="23"
                  stroke="#0d9488"
                  strokeWidth="2.5"
                  fill="none"
                  opacity="0.2"
                />
                <path className="sweetalert-checkmark-path" d="M14 27l8 8 16-16" />
              </svg>
            </div>

            <h3 className="sweetalert-title">{modal.title}</h3>
            <p className="sweetalert-desc">{modal.message}</p>

            {(modal.patientName || modal.doctorName) && (
              <div className="sweetalert-meta-card">
                {modal.patientName && (
                  <div className="sweetalert-meta-row">
                    <span className="sweetalert-meta-label">Patient:</span>
                    <span className="sweetalert-meta-value">
                      {modal.patientName} {modal.mrn ? `(${modal.mrn})` : ""}
                    </span>
                  </div>
                )}
                {modal.doctorName && (
                  <div className="sweetalert-meta-row">
                    <span className="sweetalert-meta-label">Doctor:</span>
                    <span className="sweetalert-meta-value">{modal.doctorName}</span>
                  </div>
                )}
                {modal.doctorOnline !== undefined && (
                  <div className="sweetalert-meta-row">
                    <span className="sweetalert-meta-label">Doctor Status:</span>
                    <span
                      className={`sweetalert-meta-badge ${
                        modal.doctorOnline ? "online" : "offline"
                      }`}
                    >
                      {modal.doctorOnline ? "Online (Notified)" : "Offline (Not Notified)"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="sweetalert-buttons">
              {modal.actionUrl ? (
                <Link
                  to={modal.actionUrl}
                  className="sweetalert-btn-confirm"
                  onClick={() => setModal(null)}
                >
                  {modal.actionLabel || "View Record"}
                </Link>
              ) : (
                <button
                  type="button"
                  className="sweetalert-btn-confirm"
                  onClick={() => setModal(null)}
                >
                  Great, Got it!
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
