/**
 * Device information and persistent device ID utility for HMS.
 */

const DEVICE_ID_KEY = "hms_device_id";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Gets or initializes a persistent device ID for this client browser.
 */
export function getPersistentDeviceId(): string {
  if (typeof window === "undefined") return "server-environment";

  // 1. Check localStorage
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  // 2. Check Cookie
  if (!deviceId) {
    deviceId = getCookie(DEVICE_ID_KEY);
  }

  // 3. Generate new if missing
  if (!deviceId) {
    deviceId = `dev_${generateUUID().replace(/-/g, "").slice(0, 20)}`;
  }

  // Persist across both storage mechanisms
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  setCookie(DEVICE_ID_KEY, deviceId);

  return deviceId;
}

/**
 * Detects whether the current device is Desktop, Mobile, or Tablet.
 */
export function getClientDeviceType(): "Desktop" | "Mobile" | "Tablet" {
  if (typeof navigator === "undefined") return "Desktop";
  const ua = navigator.userAgent;

  if (/iPad|Tablet|PlayBook|Silk|Kindle|(Android(?!.*Mobile))/i.test(ua)) {
    return "Tablet";
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated/i.test(ua)) {
    return "Mobile";
  }
  return "Desktop";
}

/**
 * Get headers to automatically attach to outgoing API requests.
 */
export function getDeviceInfoHeaders(): Record<string, string> {
  return {
    "X-Device-Id": getPersistentDeviceId(),
    "X-Device-Type": getClientDeviceType(),
  };
}

