import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaFlask, FaPhoneSlash } from "react-icons/fa";
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

const LAB_RINGER_DISMISSED_KEY = "mds_lab_order_ringer_dismissed";

export default function GlobalLabOrderRinger() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<LaboratoryRequest[]>([]);
  const [mutedRequestIds, setMutedRequestIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(LAB_RINGER_DISMISSED_KEY) === "true";
  });

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const isLabOrAdmin = useMemo(() => {
    const norm = roles.map((r) => r.toLowerCase());
    return (
      norm.includes("laboratory") ||
      norm.includes("super admin") ||
      norm.includes("administrator")
    );
  }, [roles]);

  // Only show on laboratory workspace or dashboard. Do NOT follow onto unrelated pages
  // (e.g. Doctor desk, Nurse ward, Billing, Patients, Settings)
  const isRelevantPage = useMemo(() => {
    const p = location.pathname;
    return p === "/laboratory" || p.startsWith("/laboratory/") || p === "/dashboard";
  }, [location.pathname]);

  const isAlreadyOnLabPage = location.pathname === "/laboratory";

  const fetchPending = async () => {
    if (!isLabOrAdmin || !isRelevantPage) return;
    try {
      const res = await fetchLaboratoryRequests({ status: "pending" });
      if (res.result?.items) {
        setRequests(res.result.items);
      }
    } catch {
      // Quiet fail in background
    }
  };

  useEffect(() => {
    if (!isLabOrAdmin || !isRelevantPage) {
      stopContinuousPhoneRing();
      return;
    }

    void fetchPending();

    const interval = setInterval(fetchPending, 10000);
    const handleMutation = () => void fetchPending();

    window.addEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);

    return () => {
      clearInterval(interval);
      window.removeEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);
      stopContinuousPhoneRing();
    };
  }, [isLabOrAdmin, isRelevantPage]);

  const activePending = useMemo(() => {
    return requests.filter(
      (r) => r.status === "pending" && !mutedRequestIds.has(r.id)
    );
  }, [requests, mutedRequestIds]);

  // Intermittent alert only on relevant pages when not dismissed
  const shouldAlertIntermittent =
    isLabOrAdmin &&
    isRelevantPage &&
    !dismissed &&
    soundEnabled &&
    activePending.length > 0;

  useEffect(() => {
    if (shouldAlertIntermittent) {
      // Intermittent alert spaced out by 90 seconds (never annoying non-stop ringing)
      startIntermittentPhoneAlert(90000, 0.35);
    } else {
      stopContinuousPhoneRing();
    }

    return () => {
      stopContinuousPhoneRing();
    };
  }, [shouldAlertIntermittent]);

  if (!isLabOrAdmin || !isRelevantPage || dismissed || activePending.length === 0) {
    return null;
  }

  const latest = activePending[0];
  const patientDisplayName = latest.patient
    ? `${latest.patient.firstName || ""} ${latest.patient.lastName || ""}`.trim() ||
      "Walk-in Patient"
    : "Walk-in Patient";

  const handleMuteAll = () => {
    stopContinuousPhoneRing();
    setMutedRequestIds((prev) => {
      const next = new Set(prev);
      activePending.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const handleDismiss = () => {
    stopContinuousPhoneRing();
    setDismissed(true);
    sessionStorage.setItem(LAB_RINGER_DISMISSED_KEY, "true");
  };

  const handleAccept = async () => {
    stopContinuousPhoneRing();
    setMutedRequestIds((prev) => new Set(prev).add(latest.id));
    await updateLaboratoryRequestStatus(latest.id, "sample_collected");
    navigate("/laboratory");
  };

  return (
    <div className="global-lab-order-alert-strip" role="alert">
      <div className="lab-ringer-left">
        <div className="lab-ringer-icon-box">
          <FaFlask />
        </div>
        <div className="lab-ringer-content">
          <div className="lab-ringer-meta-row">
            <span className="lab-ringer-badge">
              Doctor Ordered Test • Immediate Attention
            </span>
            {activePending.length > 1 && (
              <span className="lab-ringer-more-badge">
                +{activePending.length - 1} more pending
              </span>
            )}
          </div>
          <div className="lab-ringer-patient-line">
            {patientDisplayName} —{" "}
            <span style={{ color: "#7dd3fc" }}>{latest.template?.name}</span>
            {latest.patient?.mrn && (
              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)", marginLeft: "6px" }}>
                (MRN: {latest.patient.mrn})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="lab-ringer-actions">
        <button
          type="button"
          onClick={handleAccept}
          className="lab-ringer-btn lab-ringer-btn-accept"
        >
          <FiCheck /> Accept / Collect Sample
        </button>

        <button
          type="button"
          onClick={() => {
            stopContinuousPhoneRing();
            navigate("/laboratory");
          }}
          className="lab-ringer-btn lab-ringer-btn-station"
        >
          <FiExternalLink /> Open Lab Station
        </button>

        <button
          type="button"
          onClick={handleMuteAll}
          title="Mute pending order alert"
          className="lab-ringer-btn lab-ringer-btn-mute"
        >
          <FaPhoneSlash /> Mute
        </button>

        <button
          type="button"
          onClick={() => {
            if (soundEnabled) stopContinuousPhoneRing();
            setSoundEnabled(!soundEnabled);
          }}
          title={soundEnabled ? "Disable sound" : "Enable sound"}
          className="lab-ringer-btn-icon"
        >
          {soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          title="Dismiss banner for this session"
          className="lab-ringer-btn-icon lab-ringer-btn-dismiss"
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
}
