export interface ParsedClientDevice {
  deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  os: string;
  browser: string;
  browserVersion?: string;
  isMobile: boolean;
}

export interface ClientAuditNetworkInfo {
  ip: string;
  forwardedFor?: string;
  connectionType?: string;
  effectiveType?: string;
}

/**
 * Extracts the real client IP address from request headers or socket.
 */
export function extractClientIp(
  headers: Record<string, string | string[] | undefined>,
  socketIp?: string,
  reqIp?: string
): string {
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) {
    const rawIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const firstIp = rawIp.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers["x-real-ip"];
  if (realIp) {
    const cleanReal = Array.isArray(realIp) ? realIp[0] : realIp;
    if (cleanReal) return cleanReal.trim();
  }

  if (reqIp && reqIp !== "::1" && reqIp !== "127.0.0.1") {
    return reqIp;
  }

  if (socketIp) {
    // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:192.168.1.1)
    return socketIp.replace(/^.*:/, "");
  }

  return reqIp || "127.0.0.1";
}

/**
 * Parses User-Agent header to identify device category, OS, and browser.
 */
export function parseUserAgent(userAgent = ""): ParsedClientDevice {
  const ua = userAgent.toLowerCase();

  // 1. Detect Bots / Crawlers
  if (/bot|crawler|spider|crawling|curl|wget/i.test(ua)) {
    return {
      deviceType: "bot",
      os: "Unknown",
      browser: "Bot/Crawler",
      isMobile: false,
    };
  }

  // 2. Detect Operating System
  let os = "Unknown OS";
  if (/windows nt 10\.0/i.test(ua)) {
    os = "Windows 10/11";
  } else if (/windows nt 6\.3/i.test(ua)) {
    os = "Windows 8.1";
  } else if (/windows nt 6\.1/i.test(ua)) {
    os = "Windows 7";
  } else if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/android/i.test(ua)) {
    const match = ua.match(/android\s+([\d.]+)/i);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/os\s+([\d_]+)/i);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
  } else if (/mac os x/i.test(ua)) {
    const match = ua.match(/mac os x\s+([\d_]+)/i);
    os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  } else if (/cros/i.test(ua)) {
    os = "ChromeOS";
  }

  // 3. Detect Device Category
  const isTablet = /tablet|ipad|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua));
  const isMobilePhone = /mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);

  let deviceType: "mobile" | "tablet" | "desktop" | "unknown" = "desktop";
  if (isTablet) {
    deviceType = "tablet";
  } else if (isMobilePhone) {
    deviceType = "mobile";
  }

  // 4. Detect Browser & Version
  let browser = "Unknown Browser";
  let browserVersion: string | undefined;

  if (/edg\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/edg\/([\d.]+)/i);
    browser = "Microsoft Edge";
    browserVersion = match ? match[1] : undefined;
  } else if (/opr\/([\d.]+)|opera\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/opr\/([\d.]+)|opera\/([\d.]+)/i);
    browser = "Opera";
    browserVersion = match ? match[1] || match[2] : undefined;
  } else if (/samsungbrowser\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/samsungbrowser\/([\d.]+)/i);
    browser = "Samsung Internet";
    browserVersion = match ? match[1] : undefined;
  } else if (/chrome\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/chrome\/([\d.]+)/i);
    browser = "Google Chrome";
    browserVersion = match ? match[1] : undefined;
  } else if (/firefox\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/firefox\/([\d.]+)/i);
    browser = "Mozilla Firefox";
    browserVersion = match ? match[1] : undefined;
  } else if (/version\/([\d.]+).*safari/i.test(ua)) {
    const match = ua.match(/version\/([\d.]+).*safari/i);
    browser = "Apple Safari";
    browserVersion = match ? match[1] : undefined;
  }

  return {
    deviceType,
    os,
    browser: browserVersion ? `${browser} ${browserVersion.split(".")[0]}` : browser,
    browserVersion,
    isMobile: deviceType === "mobile" || deviceType === "tablet",
  };
}
