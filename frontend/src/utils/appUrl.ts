export function getAppBaseUrl() {
  const configuredUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();

  if (configuredUrl && /^https?:\/\//i.test(configuredUrl)) {
    return new URL(configuredUrl).origin;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export function getAppUrl(path = "/") {
  const baseUrl = getAppBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}
