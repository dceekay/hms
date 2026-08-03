import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheckCircle, FiRefreshCw, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService";
import type { AppNotification } from "../../types/notification";

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

function playNotificationSound() {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const gain = audioContext.createGain();

  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.42);
  gain.connect(audioContext.destination);

  [660, 880].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const start = audioContext.currentTime + index * 0.13;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.connect(gain);
    oscillator.start(start);
    oscillator.stop(start + 0.16);
  });

  window.setTimeout(() => {
    void audioContext.close();
  }, 700);
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [soundEnabled, setSoundEnabled] = useState(getStoredSoundPreference);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  const unreadItems = useMemo(
    () => items.filter((item) => !item.readAt),
    [items]
  );

  const loadNotifications = async () => {
    setLoading(true);
    const result = await fetchNotifications();
    setLoading(false);

    if (!result.result) return;

    const nextItems = result.result.items;
    const newUnread = nextItems.filter(
      (item) => !item.readAt && !seenIdsRef.current.has(item.id)
    );

    setItems(nextItems);
    setUnreadCount(result.result.unreadCount);

    nextItems.forEach((item) => seenIdsRef.current.add(item.id));

    if (!firstLoadRef.current && newUnread.length > 0 && soundEnabled) {
      playNotificationSound();
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
            icon: "/mds-notification.svg",
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
    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 15000);

    const handleFocus = () => void loadNotifications();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
  };

  const toggleSound = () => {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    localStorage.setItem("hms_notification_sound", nextValue ? "on" : "off");

    if (nextValue) {
      playNotificationSound();
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
        onClick={() => setOpen((current) => !current)}
      >
        <FiBell />
        {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <section className="notification-panel" aria-label="Notification center">
          <div className="notification-panel-header">
            <div>
              <strong>Notifications</strong>
              <small>{unreadCount} unread</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications">
              <FiX />
            </button>
          </div>

          <div className="notification-tools">
            <button type="button" onClick={requestPermission}>
              <FiBell />
              {permissionLabel(permission)}
            </button>
            <button type="button" onClick={toggleSound}>
              {soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
              {soundEnabled ? "Sound on" : "Sound off"}
            </button>
            <button type="button" onClick={loadNotifications}>
              <FiRefreshCw />
              Refresh
            </button>
            <button type="button" onClick={handleReadAll} disabled={unreadItems.length === 0}>
              <FiCheckCircle />
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
                <span>
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
