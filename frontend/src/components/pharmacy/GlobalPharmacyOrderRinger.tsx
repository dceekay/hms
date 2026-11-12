import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaCapsules } from "react-icons/fa";
import { FiCheck, FiExternalLink, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { fetchPrescriptions } from "../../services/clinicalService";
import type { Prescription } from "../../types/clinical";
import { playClinicalAlertSound } from "../../utils/alertSound";
import {
  HMS_DATA_MUTATED_EVENT,
  HMS_SYNC_FLUSHED_EVENT,
} from "../../utils/appEvents";
import "../../styles/lab-ringer.css";

export default function GlobalPharmacyOrderRinger() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();

  const userId = user?.id || "global";
  const userMuteKey = `mds_rx_ringer_muted_${userId}`;
  const userDismissedIdsKey = `mds_rx_dismissed_ids_${userId}`;

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`mds_rx_ringer_muted_${user?.id || "global"}`) === "true";
  });
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = sessionStorage.getItem(`mds_rx_dismissed_ids_${user?.id || "global"}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const knownPendingIdsRef = useRef<Set<string>>(new Set());
  const firstFetchRef = useRef(true);

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  const isRecipient = useMemo(() => {
    if (!token || !user) return false;
    const norm = roles.map((r) => r.toLowerCase());
    return (
      norm.includes("pharmacist") ||
      norm.includes("pharmacy") ||
      norm.includes("super admin") ||
      norm.includes("administrator")
    );
  }, [token, user, roles]);

  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
      setIsMuted(localStorage.getItem(userMuteKey) === "true");
      try {
        const raw = sessionStorage.getItem(userDismissedIdsKey);
        setDismissedIds(raw ? new Set(JSON.parse(raw)) : new Set());
      } catch {
        setDismissedIds(new Set());
      }
      knownPendingIdsRef.current = new Set();
      firstFetchRef.current = true;
    }
  }, [user?.id, userMuteKey, userDismissedIdsKey]);

  const loadPending = async () => {
    if (!isRecipient) return;
    try {
      const res = await fetchPrescriptions({ status: "sent_to_pharmacy" });
      if (!res.result?.items) return;

      const items = res.result.items;
      const hasNewArrival = items.some(
        (rx) => !knownPendingIdsRef.current.has(rx.id)
      );

      setPrescriptions(items);

      if (!firstFetchRef.current && hasNewArrival && !isMuted) {
        playClinicalAlertSound("urgent");
      }

      items.forEach((rx) => knownPendingIdsRef.current.add(rx.id));
      firstFetchRef.current = false;
    } catch {
      // Background poll - fail silently
    }
  };

  useEffect(() => {
    if (!isRecipient) return;

    void loadPending();

    const pollInterval = window.setInterval(() => {
      void loadPending();
    }, 10000);

    const handleMutation = () => void loadPending();
    window.addEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);
    };
  }, [isRecipient, isMuted]);

  const activePending = useMemo(
    () =>
      prescriptions.filter(
        (rx) => rx.status === "sent_to_pharmacy" && !dismissedIds.has(rx.id)
      ),
    [prescriptions, dismissedIds]
  );

  // Subtle chime reminder every 55 seconds while unacknowledged prescriptions wait (unless muted or already on pharmacy prescriptions tab)
  const onPharmacyPrescriptions =
    location.pathname === "/pharmacy" && location.search.includes("prescriptions");

  useEffect(() => {
    if (!isRecipient || isMuted || activePending.length === 0 || onPharmacyPrescriptions) {
      return;
    }

    const chimeTimer = window.setInterval(() => {
      playClinicalAlertSound("standard");
    }, 55000);

    return () => window.clearInterval(chimeTimer);
  }, [isRecipient, isMuted, activePending.length, onPharmacyPrescriptions]);

  if (!isRecipient || activePending.length === 0 || onPharmacyPrescriptions) {
    return null;
  }

  const latest = activePending[0];
  const patientFullName = latest.patient
    ? `${latest.patient.firstName || ""} ${latest.patient.lastName || ""}`.trim() ||
      "Patient"
    : "Patient";
  const folderNumber = latest.patient?.physicalFileNumber || latest.patient?.mrn;
  const doctorName = latest.doctor
    ? `Dr. ${latest.doctor.firstName || ""} ${latest.doctor.lastName || ""}`.trim()
    : "Doctor";
  const drugsPreview =
    latest.items
      .slice(0, 2)
      .map((item) => item.medicationName)
      .join(", ") +
    (latest.items.length > 2 ? ` +${latest.items.length - 2} more` : "");

  const persistDismissed = (nextSet: Set<string>) => {
    setDismissedIds(nextSet);
    try {
      sessionStorage.setItem(userDismissedIdsKey, JSON.stringify(Array.from(nextSet)));
    } catch {
      // ignore storage errors
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      localStorage.setItem(userMuteKey, "true");
    } else {
      localStorage.removeItem(userMuteKey);
      playClinicalAlertSound("standard");
    }
  };

  const handleDismiss = () => {
    const next = new Set(dismissedIds);
    activePending.forEach((rx) => next.add(rx.id));
    persistDismissed(next);
  };

  const handleOpenPharmacy = () => {
    const next = new Set(dismissedIds);
    next.add(latest.id);
    persistDismissed(next);
    navigate("/pharmacy?tab=prescriptions");
  };

  return (
    <aside
      className="global-lab-order-toast pharmacy-rx-toast"
      role="alert"
      aria-live="polite"
    >
      <div className="lab-toast-header">
        <div className="lab-toast-title-row">
          <div className="lab-toast-pulse-icon pharmacy">
            <FaCapsules />
          </div>
          <div className="lab-toast-title-text">
            <strong>New Prescription Request</strong>
            <span className="lab-toast-sub pharmacy">
              From {doctorName} · Ready to Dispense
            </span>
          </div>
        </div>

        <div className="lab-toast-header-actions">
          {activePending.length > 1 && (
            <span className="lab-toast-badge-more">
              +{activePending.length - 1} waiting
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? "Unmute prescription alerts" : "Mute prescription alerts"}
            className={`lab-toast-icon-btn ${isMuted ? "muted" : ""}`}
            aria-label={isMuted ? "Unmute alerts" : "Mute alerts"}
          >
            {isMuted ? <FiVolumeX /> : <FiVolume2 />}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss alert"
            className="lab-toast-icon-btn close modal-close-btn"
            aria-label="Dismiss alert"
          >
            <FiX size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="lab-toast-body">
        <div className="lab-toast-patient-row">
          <span className="lab-toast-patient-name">{patientFullName}</span>
          {folderNumber && (
            <span className="lab-toast-mrn">Folder: {folderNumber}</span>
          )}
        </div>

        <div className="lab-toast-test-chip pharmacy">
          {drugsPreview || `${latest.items.length} prescribed drug(s)`}
        </div>
      </div>

      <div className="lab-toast-footer">
        <button
          type="button"
          onClick={handleOpenPharmacy}
          className="lab-toast-btn-primary pharmacy"
        >
          <FiCheck /> Open Prescriptions
        </button>

        <button
          type="button"
          onClick={handleOpenPharmacy}
          className="lab-toast-btn-secondary"
        >
          <FiExternalLink /> Pharmacy
        </button>

        <button
          type="button"
          onClick={handleToggleMute}
          className={`lab-toast-btn-mute ${isMuted ? "active" : ""}`}
        >
          {isMuted ? <FiVolumeX /> : <FiVolume2 />}
          <span>{isMuted ? "Muted" : "Mute"}</span>
        </button>
      </div>
    </aside>
  );
}

