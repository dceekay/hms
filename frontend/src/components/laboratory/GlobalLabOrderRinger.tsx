import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaFlask, FaPhoneSlash } from "react-icons/fa";
import { FiCheck, FiExternalLink, FiVolume2, FiVolumeX } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import {
  fetchLaboratoryRequests,
  updateLaboratoryRequestStatus,
} from "../../services/laboratoryService";
import type { LaboratoryRequest } from "../../types/laboratory";
import {
  startContinuousPhoneRing,
  stopContinuousPhoneRing,
} from "../../utils/alertSound";
import {
  HMS_DATA_MUTATED_EVENT,
  HMS_SYNC_FLUSHED_EVENT,
} from "../../utils/appEvents";

export default function GlobalLabOrderRinger() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<LaboratoryRequest[]>([]);
  const [mutedRequestIds, setMutedRequestIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);

  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const isLabOrAdmin = useMemo(() => {
    const norm = roles.map((r) => r.toLowerCase());
    return (
      norm.includes("laboratory") ||
      norm.includes("super admin") ||
      norm.includes("administrator")
    );
  }, [roles]);

  // If already on the laboratory page, let the laboratory page handle local UI,
  // but keep background data fresh.
  const isAlreadyOnLabPage = location.pathname === "/laboratory";

  const fetchPending = async () => {
    if (!isLabOrAdmin) return;
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
    if (!isLabOrAdmin) return;
    void fetchPending();

    const interval = setInterval(fetchPending, 5000);
    const handleMutation = () => void fetchPending();

    window.addEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);

    return () => {
      clearInterval(interval);
      window.removeEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);
    };
  }, [isLabOrAdmin]);

  const activePending = useMemo(() => {
    return requests.filter(
      (r) => r.status === "pending" && !mutedRequestIds.has(r.id)
    );
  }, [requests, mutedRequestIds]);

  const shouldRingGlobal =
    isLabOrAdmin &&
    !isAlreadyOnLabPage &&
    soundEnabled &&
    activePending.length > 0;

  useEffect(() => {
    if (shouldRingGlobal) {
      startContinuousPhoneRing();
    } else if (!isAlreadyOnLabPage) {
      stopContinuousPhoneRing();
    }

    return () => {
      if (!isAlreadyOnLabPage) {
        stopContinuousPhoneRing();
      }
    };
  }, [shouldRingGlobal, isAlreadyOnLabPage]);

  if (!isLabOrAdmin || isAlreadyOnLabPage || activePending.length === 0) {
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

  const handleAccept = async () => {
    stopContinuousPhoneRing();
    setMutedRequestIds((prev) => new Set(prev).add(latest.id));
    await updateLaboratoryRequestStatus(latest.id, "sample_collected");
    navigate("/laboratory");
  };

  return (
    <div
      className="global-lab-order-alert-strip"
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "linear-gradient(135deg, #092a5e 0%, #0369a1 100%)",
        color: "#ffffff",
        padding: "10px 18px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        borderBottom: "2px solid #38bdf8",
        animation: "slideDown 0.3s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#f59e0b",
            color: "#ffffff",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            fontSize: "1.1rem",
            animation: "pulse 1.2s infinite",
          }}
        >
          <FaFlask />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "rgba(245, 158, 11, 0.25)",
                border: "1px solid #f59e0b",
                color: "#fef3c7",
                padding: "2px 7px",
                borderRadius: "999px",
              }}
            >
              Doctor Ordered Test • Immediate Attention
            </span>
            {activePending.length > 1 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "2px 7px",
                  borderRadius: "999px",
                }}
              >
                +{activePending.length - 1} more pending
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, marginTop: "2px" }}>
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

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleAccept}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#10b981",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "7px 14px",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          <FiCheck /> Accept / Collect Sample
        </button>

        <button
          type="button"
          onClick={() => {
            stopContinuousPhoneRing();
            navigate("/laboratory");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255, 255, 255, 0.15)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            padding: "7px 12px",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          <FiExternalLink /> Open Lab Station
        </button>

        <button
          type="button"
          onClick={handleMuteAll}
          title="Mute continuous ringing"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(239, 68, 68, 0.2)",
            color: "#fecaca",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "8px",
            padding: "7px 12px",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
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
          style={{
            background: "transparent",
            color: "#ffffff",
            border: "none",
            padding: "6px",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          {soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
        </button>
      </div>
    </div>
  );
}
