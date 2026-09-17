import { useEffect, useState } from "react";
import { FiBell, FiCheckCircle, FiVolume2, FiX } from "react-icons/fi";
import {
  fetchPushPublicKey,
  subscribeToPush,
} from "../../services/notificationService";
import { playClinicalAlertSound } from "../../utils/alertSound";
import { useAuthStore } from "../../store/authStore";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

export default function PushAlertPrompt() {
  const user = useAuthStore((state) => state.user);
  const [showPrompt, setShowPrompt] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return;
    }

    const dismissed = sessionStorage.getItem("mds_push_prompt_dismissed");
    if (dismissed) {
      return;
    }

    // Only prompt if permission is currently default (not yet granted or blocked)
    if (Notification.permission === "default") {
      // Delay slightly for a polite, non-intrusive appearance
      const timer = window.setTimeout(() => {
        setShowPrompt(true);
      }, 1500);

      return () => window.clearTimeout(timer);
    }
  }, []);

  if (!showPrompt || !user) {
    return null;
  }

  const handleEnableAlerts = async () => {
    if (typeof Notification === "undefined") return;

    setEnabling(true);
    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        // Enable sound preference
        localStorage.setItem("hms_notification_sound", "on");
        playClinicalAlertSound("urgent");

        // Attempt push registration if available
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const setup = await fetchPushPublicKey();
          if (setup.result?.enabled && setup.result.publicKey) {
            const registration =
              (await navigator.serviceWorker.getRegistration()) ??
              (await navigator.serviceWorker.register("/sw.js"));

            const existingSubscription =
              await registration.pushManager.getSubscription();

            const subscription =
              existingSubscription ??
              (await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(setup.result.publicKey),
              }));

            await subscribeToPush(subscription);
          }
        }

        setSuccess(true);
        window.setTimeout(() => {
          setShowPrompt(false);
        }, 2200);
      } else {
        setShowPrompt(false);
        sessionStorage.setItem("mds_push_prompt_dismissed", "true");
      }
    } catch (error) {
      console.error("Error enabling notifications", error);
      setShowPrompt(false);
    } finally {
      setEnabling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("mds_push_prompt_dismissed", "true");
  };

  return (
    <div className="push-alert-card" role="region" aria-label="Audio and push alert prompt">
      <div className="push-alert-icon-box">
        {success ? <FiCheckCircle className="push-success-icon" /> : <FiBell />}
      </div>

      <div className="push-alert-body">
        <strong>
          {success ? "Instant Clinical Alerts Enabled!" : "Enable Push & Audio Alerts"}
        </strong>
        <p>
          {success
            ? "You will now receive sound and push notifications for urgent arrivals, vitals, and queue updates."
            : "Get immediate sound chimes and notifications for emergency gate entries, patient triage, and medication schedules."}
        </p>
      </div>

      {!success && (
        <div className="push-alert-actions">
          <button
            type="button"
            className="push-enable-btn"
            onClick={handleEnableAlerts}
            disabled={enabling}
          >
            <FiVolume2 />
            {enabling ? "Enabling..." : "Turn On Alerts"}
          </button>
          <button
            type="button"
            className="push-dismiss-btn modal-close-btn"
            onClick={handleDismiss}
            aria-label="Dismiss notification prompt"
            title="Dismiss"
          >
            <FiX size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
