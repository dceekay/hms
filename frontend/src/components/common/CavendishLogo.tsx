import React, { useState } from "react";
import mdsLogo from "../../assets/optimized/logo.png";
import { HOSPITAL_OFFICIAL_DETAILS } from "../../constants/hospitalInfo";

interface LogoProps {
  variant?: "full" | "mark" | "white" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showSubtitle?: boolean;
}

export function CavendishMark({
  size = 44,
  width,
  height,
  className = "",
}: { size?: number; width?: number; height?: number; className?: string }) {
  const [imgError, setImgError] = useState(false);
  const markWidth = width ?? size;
  const markHeight = height ?? size;

  if (imgError) {
    return (
      <svg
        width={markWidth}
        height={markHeight}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <rect x="6" y="6" width="108" height="108" rx="26" fill="#092A5E" />
        <rect x="52" y="26" width="16" height="68" rx="8" fill="#FFFFFF" />
        <rect x="26" y="52" width="68" height="16" rx="8" fill="#FFFFFF" />
        <path
          d="M38 60 H48 L53 52 L59 68 L64 56 L68 64 L72 60 H82"
          stroke="#10A9D6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <img
      src={mdsLogo}
      alt={`${HOSPITAL_OFFICIAL_DETAILS.name} Logo`}
      style={{
        width: `${markWidth}px`,
        height: `${markHeight}px`,
        objectFit: "contain",
        display: "inline-block",
        flexShrink: 0,
        imageRendering: "-webkit-optimize-contrast",
      }}
      className={className}
      onError={() => setImgError(true)}
    />
  );
}

export default function CavendishLogo({
  variant = "full",
  size = "md",
  className = "",
  showSubtitle = true,
}: LogoProps) {
  const markDimensions = {
    sm: 36,
    md: 48,
    lg: 58,
    xl: 72,
  }[size];

  const isLightMode = variant === "white";

  return (
    <div
      className={`hospital-logo-container flex items-center gap-3 select-none ${className}`}
      style={{ display: "inline-flex", alignItems: "center", gap: size === "sm" ? "8px" : "12px" }}
    >
      <CavendishMark size={markDimensions} />
      {variant !== "mark" && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span
            style={{
              fontFamily: "var(--font-serif, 'DM Serif Display', Georgia, serif)",
              fontSize: size === "sm" ? "1.05rem" : size === "lg" ? "1.45rem" : size === "xl" ? "1.8rem" : "1.24rem",
              fontWeight: 800,
              letterSpacing: "0.02em",
              color: isLightMode ? "#FFFFFF" : "var(--text-strong, #092A5E)",
            }}
          >
            {HOSPITAL_OFFICIAL_DETAILS.name}
          </span>
          {showSubtitle && (
            <span
              style={{
                fontFamily: "var(--font-sans, 'Inter', sans-serif)",
                fontSize: size === "sm" ? "0.68rem" : "0.76rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isLightMode ? "rgba(255, 255, 255, 0.78)" : "var(--muted, #087EBD)",
                marginTop: "2px",
              }}
            >
              {HOSPITAL_OFFICIAL_DETAILS.brandSubtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Alias MDSLogo for clarity
export const MDSLogo = CavendishLogo;
export const MDSMark = CavendishMark;
