import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaFlask } from "react-icons/fa";
import { FiCheck, FiExternalLink, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import {
  fetchLaboratoryRequests,
  updateLaboratoryRequestStatus,
} from "../../services/laboratoryService";
import type { LaboratoryRequest } from "../../types/laboratory";
import {
  startIntermittentPhoneAlert,
  stopContinuousPhoneRing,
} from "../../utils/alertSound";
import {
  HMS_DATA_MUTATED_EVENT,
  HMS_SYNC_FLUSHED_EVENT,
} from "../../utils/appEvents";
import "../../styles/lab-ringer.css";

export default function GlobalLabOrderRinger() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();

  const userId = user?.id || "global";
  const userMuteKey = `mds_lab_ringer_muted_${userId}`;
  const userDismissedKey = `mds_lab_ringer_dismissed_${userId}`;
  const userMutedOrdersKey = `mds_muted_orders_${userId}`;

  const [requests, setRequests] = useState<LaboratoryRequest[]>([]);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`mds_lab_ringer_muted_${user?.id || "global"}`) === "true";
  });
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(`mds_lab_ringer_dismissed_${user?.id || "global"}`) === "true";
  });
  const [mutedOrderIds, setMutedOrderIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(`mds_muted_orders_${user?.id || "global"}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  // Alert is ONLY sent to Laboratory staff and Administrators managing lab operations.
  // Doctors, Nurses, Cashiers, Billing, Security, etc. do NOT receive this.
  const isRecipient = useMemo(() => {
    if (!token || !user) return false;
    const norm = roles.map((r) => r.toLowerCase());
    return (
      norm.includes("laboratory") ||
      norm.includes("super admin") ||
      norm.includes("administrator")
    );
  }, [token, user, roles]);

  // Sync mute state if user ID changes (e.g. switch account)
  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
      setIsMuted(localStorage.getItem(userMuteKey) === "true");
      setIsDismissed(sessionStorage.getItem(userDismissedKey) === "true");
    }
  }, [user?.id, userMuteKey, userDismissedKey]);

  const fetchPending = async () => {
    if (!isRecipient) return;
    try {
      const res = await fetchLaboratoryRequests({ status: "pending" });
      if (res.result?.items) {
        setRequests(res.result.items);
      }
    } catch {
      // Background poll - fail silently
    }
  };

  useEffect(() => {
    if (!isRecipient) {
      stopContinuousPhoneRing();
      return;
    }

    void fetchPending();

    const interval = setInterval(fetchPending, 12000);
    const handleMutation = () => void fetchPending();

    window.addEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);

    return () => {
      clearInterval(interval);
      window.removeEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);
      stopContinuousPhoneRing();
    };
  }, [isRecipient]);

  const activePending = useMemo(() => {
    return requests.filter(
      (r) => r.status === "pending" && !mutedOrderIds.has(r.id)
    );
  }, [requests, mutedOrderIds]);

  // Repetitive alert for recipients when not muted and not dismissed
  const shouldAlert =
    isRecipient &&
    !isMuted &&
    !isDismissed &&
    activePending.length > 0;

  useEffect(() => {
    if (shouldAlert) {
      // Gentle intermittent alert spaced out by 50 seconds for lab recipients
      startIntermittentPhoneAlert(50000, 0.35);
    } else {
      stopContinuousPhoneRing();
    }

    return () => {
      stopContinuousPhoneRing();
    };
  }, [shouldAlert]);

  // If not a recipient, dismissed, or no pending requests, do not render
  if (!isRecipient || isDismissed || activePending.length === 0) {
    return null;
  }

  const latest = activePending[0];
  const patientDisplayName = latest.patient
    ? `${latest.patient.firstName || ""} ${latest.patient.lastName || ""}`.trim() ||
      "Walk-in Patient"
    : "Walk-in Patient";

  const handleToggleMute = () => {
    stopContinuousPhoneRing();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      localStorage.setItem(userMuteKey, "true");
    } else {
      localStorage.removeItem(userMuteKey);
    }
  };

  const handleDismiss = () => {
    stopContinuousPhoneRing();
    setIsDismissed(true);
    sessionStorage.setItem(userDismissedKey, "true");
  };

  const handleAccept = async () => {
    stopContinuousPhoneRing();
    const updatedMuted = new Set(mutedOrderIds).add(latest.id);
    setMutedOrderIds(updatedMuted);
    try {
      localStorage.setItem(userMutedOrdersKey, JSON.stringify(Array.from(updatedMuted)));
    } catch {}

    await updateLaboratoryRequestStatus(latest.id, "sample_collected");
    if (location.pathname !== "/laboratory") {
      navigate("/laboratory");
    }
  };

  const handleOpenLab = () => {
    stopContinuousPhoneRing();
    if (location.pathname !== "/laboratory") {
      navigate("/laboratory");
    }
  };

  return (
    <aside className="global-lab-order-toast" role="alert" aria-live="polite">
      <div className="lab-toast-header">
        <div className="lab-toast-title-row">
          <div className="lab-toast-pulse-icon">
            <FaFlask />
          </div>
          <div className="lab-toast-title-text">
            <strong>New Lab Order</strong>
            <span className="lab-toast-sub">Sample Collection Needed</span>
          </div>
        </div>

        <div className="lab-toast-header-actions">
          {activePending.length > 1 && (
            <span className="lab-toast-badge-more">
              +{activePending.length - 1} more
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? "Sound is muted for you (click to unmute)" : "Mute alert sound for your session"}
            className={`lab-toast-icon-btn ${isMuted ? "muted" : ""}`}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <FiVolumeX /> : <FiVolume2 />}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss alert card"
            className="lab-toast-icon-btn close"
            aria-label="Dismiss alert"
          >
            <FiX />
          </button>
        </div>
      </div>

      <div className="lab-toast-body">
        <div className="lab-toast-patient-row">
          <span className="lab-toast-patient-name">{patientDisplayName}</span>
          {latest.patient?.mrn && (
            <span className="lab-toast-mrn">MRN: {latest.patient.mrn}</span>
          )}
        </div>

        <div className="lab-toast-test-chip">
          {latest.template?.name || "Laboratory Investigation"}
        </div>
      </div>

      <div className="lab-toast-footer">
        <button
          type="button"
          onClick={handleAccept}
          className="lab-toast-btn-primary"
        >
          <FiCheck /> Collect Sample
        </button>

        <button
          type="button"
          onClick={handleOpenLab}
          className="lab-toast-btn-secondary"
        >
          <FiExternalLink /> Open Lab
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
