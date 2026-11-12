import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheckCircle, FiRefreshCw, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import { FaBell } from "react-icons/fa6";
import {
  fetchNotifications,
  fetchPushPublicKey,
  markAllNotificationsRead,
  markNotificationRead,
  openNotificationStream,
  subscribeToPush,
} from "../../services/notificationService";
import type { AppNotification } from "../../types/notification";
import {
  HMS_DATA_MUTATED_EVENT,
  HMS_SYNC_FLUSHED_EVENT,
  notifyDataMutated,
} from "../../utils/appEvents";
import { playClinicalAlertSound } from "../../utils/alertSound";
import type { ClinicalAlertLevel } from "../../utils/alertSound";
import { useAuthStore } from "../../store/authStore";

function formatTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function permissionLabel(permission: NotificationPermission | "unsupported") {
  if (typeof Notification === "undefined") return "Unavailable";
  if (permission === "granted") return "On";
  if (permission === "denied") return "Blocked";
  return "Enable";
}

function getStoredSoundPreference() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("hms_notification_sound") === "on";
}

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

function notificationAlertLevel(items: AppNotification[]): ClinicalAlertLevel {
  if (items.some((item) => item.priority === "critical")) return "critical";
  if (items.some((item) => item.priority === "warning")) return "urgent";
  return "standard";
}

async function registerPushDevice() {
  if (
    typeof window === "undefined" ||
    typeof Notification === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const setup = await fetchPushPublicKey();

  if (!setup.result?.enabled || !setup.result.publicKey) {
    return false;
  }

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

  const result = await subscribeToPush(subscription);
  return Boolean(result.result?.subscribed);
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [pushStatus, setPushStatus] = useState<
    "idle" | "saving" | "subscribed" | "unavailable"
  >("idle");
  const [soundEnabled, setSoundEnabled] = useState(getStoredSoundPreference);
  const [streamConnected, setStreamConnected] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);
  const loadingRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);
  const streamConnectedRef = useRef(false);
  const pollStartedAtRef = useRef(0);

  const unreadItems = useMemo(
    () => items.filter((item) => !item.readAt),
    [items]
  );

  const loadNotifications = async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    const result = await fetchNotifications();
    loadingRef.current = false;
    setLoading(false);

    if (!result.result) return;

    const nextItems = result.result.items;
    const newUnread = nextItems.filter(
      (item) => !item.readAt && !seenIdsRef.current.has(item.id)
    );

    setItems(nextItems);
    setUnreadCount(result.result.unreadCount);

    nextItems.forEach((item) => seenIdsRef.current.add(item.id));

    if (!firstLoadRef.current && newUnread.length > 0 && soundEnabledRef.current) {
      playClinicalAlertSound(notificationAlertLevel(newUnread));
    }

    if (
      !firstLoadRef.current &&
      newUnread.length > 0 &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      document.visibilityState !== "visible"
    ) {
      const latest = newUnread[0];
      navigator.serviceWorker?.ready
        .then((registration) =>
          registration.showNotification(latest.title, {
            body: latest.message,
            tag: latest.id,
            data: { url: latest.linkUrl || "/" },
            icon: "/android-chrome-192x192.png",
            badge: "/favicon-32x32.png",
          })
        )
        .catch(() => {
          new Notification(latest.title, {
            body: latest.message,
            tag: latest.id,
          });
        });
    }

    firstLoadRef.current = false;
  };

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      const pollEveryMs = streamConnectedRef.current ? 60000 : 10000;

      if (Date.now() - pollStartedAtRef.current >= pollEveryMs) {
        pollStartedAtRef.current = Date.now();
        void loadNotifications();
      }
    }, 5000);

    const handleFocus = () => void loadNotifications();
    const handleAppUpdate = () => void loadNotifications();
    window.addEventListener("focus", handleFocus);
    window.addEventListener(HMS_DATA_MUTATED_EVENT, handleAppUpdate);
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, handleAppUpdate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(HMS_DATA_MUTATED_EVENT, handleAppUpdate);
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, handleAppUpdate);
    };
  }, []);

  useEffect(() => {
    if (!token || typeof EventSource === "undefined") {
      setStreamConnected(false);
      streamConnectedRef.current = false;
      return;
    }

    const stream = openNotificationStream(token);

    const markConnected = () => {
      streamConnectedRef.current = true;
      setStreamConnected(true);
    };

    const markDisconnected = () => {
      streamConnectedRef.current = false;
      setStreamConnected(false);
    };

    const handleNotification = () => {
      void loadNotifications();
      notifyDataMutated({ source: "notification" });
    };

    stream.addEventListener("open", markConnected);
    stream.addEventListener("ready", markConnected);
    stream.addEventListener("notification", handleNotification);
    stream.onerror = markDisconnected;

    return () => {
      stream.removeEventListener("open", markConnected);
      stream.removeEventListener("ready", markConnected);
      stream.removeEventListener("notification", handleNotification);
      stream.close();
      markDisconnected();
    };
  }, [token]);

  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      void registerPushDevice().then((subscribed) => {
        setPushStatus(subscribed ? "subscribed" : "unavailable");
      });
    }
  }, []);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    setPushStatus("saving");
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);

    if (nextPermission === "granted") {
      const subscribed = await registerPushDevice();
      setPushStatus(subscribed ? "subscribed" : "unavailable");
      return;
    }

    setPushStatus("unavailable");
  };

  const toggleSound = () => {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    localStorage.setItem("hms_notification_sound", nextValue ? "on" : "off");

    if (nextValue) {
      playClinicalAlertSound("urgent");
    }
  };

  const handleItemClick = async (item: AppNotification) => {
    await markNotificationRead(item.id);
    await loadNotifications();
    setOpen(false);

    if (item.linkUrl) {
      navigate(item.linkUrl);
    }
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    await loadNotifications();
  };

  return (
    <div className="notification-center">
      <button
        className={`icon-btn notification-action ${unreadCount > 0 ? "has-unread" : ""}`}
        type="button"
        aria-label="Notifications"
        title="Notifications"
        onClick={() => setOpen((current) => !current)}
      >
        <FaBell size={28} />
        {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <section className="notification-panel" aria-label="Notification center">
          <div className="notification-panel-header">
            <div>
              <strong>Notifications</strong>
              <small>{unreadCount} unread</small>
            </div>
            <button
              type="button"
              className="notification-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              title="Close notifications"
            >
              <FiX size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="notification-tools">
            <span className={`notification-live-status ${streamConnected ? "online" : "polling"}`}>
              {streamConnected ? "Live" : "Polling"}
            </span>
            <button type="button" className="notification-tool-btn" onClick={requestPermission}>
              <FiBell size={14} />
              {pushStatus === "saving"
                ? "Saving"
                : pushStatus === "subscribed"
                  ? "Subscribed"
                  : permissionLabel(permission)}
            </button>
            <button type="button" className="notification-tool-btn" onClick={toggleSound}>
              {soundEnabled ? <FiVolume2 size={14} /> : <FiVolumeX size={14} />}
              {soundEnabled ? "Sound on" : "Sound off"}
            </button>
            <button type="button" className="notification-tool-btn" onClick={loadNotifications}>
              <FiRefreshCw size={14} />
              Refresh
            </button>
            <button type="button" className="notification-tool-btn" onClick={handleReadAll} disabled={unreadItems.length === 0}>
              <FiCheckCircle size={14} />
              Read all
            </button>
          </div>

          <div className="notification-list">
            {loading && <p className="notification-empty">Loading...</p>}
            {!loading && items.length === 0 && (
              <p className="notification-empty">No notifications yet.</p>
            )}
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`notification-card ${item.priority} ${item.readAt ? "read" : "unread"}`}
                onClick={() => void handleItemClick(item)}
              >
                <span className="notification-dot" />
                <span className="notification-body">
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                  <em>{formatTime(item.createdAt)}</em>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
