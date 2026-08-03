type JwtPayload = {
  exp?: number;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  return atob(padded);
}

export function getJwtExpiryMs(token: string | null) {
  if (!token) return null;

  const [, payload] = token.split(".");

  if (!payload) return null;

  try {
    const decoded = JSON.parse(decodeBase64Url(payload)) as JwtPayload;
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string | null, clockSkewMs = 5000) {
  if (!token) return false;

  const expiryMs = getJwtExpiryMs(token);

  if (!expiryMs) return true;

  return Date.now() + clockSkewMs >= expiryMs;
}

export function getMsUntilJwtExpiry(token: string | null, clockSkewMs = 0) {
  const expiryMs = getJwtExpiryMs(token);

  if (!expiryMs) return 0;

  return Math.max(expiryMs - Date.now() - clockSkewMs, 0);
}
