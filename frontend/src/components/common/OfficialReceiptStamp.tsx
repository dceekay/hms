import React, { useState, useEffect } from "react";

export interface OfficialReceiptStampProps {
  isSettled?: boolean;
  date?: string;
  department?: string;
  receiptNumber?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const UPLOADED_STAMP_KEY = "hms_official_stamp_data_url";

export default function OfficialReceiptStamp({
  isSettled = true,
  date,
  department = "ACCOUNTS & REVENUE",
  receiptNumber,
  className = "",
  size = "md",
}: OfficialReceiptStampProps) {
  const [customStampUrl, setCustomStampUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(UPLOADED_STAMP_KEY);
      if (stored) {
        setCustomStampUrl(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const displayDate = date
    ? date.includes(",")
      ? date.split(",")[0]
      : date
    : new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date());

  // If user uploaded a custom physical stamp image, display it nicely
  if (customStampUrl) {
    return (
      <div className={`official-uploaded-stamp-container size-${size} ${className}`}>
        <img
          src={customStampUrl}
          alt="Official Hospital Stamp"
          className="official-uploaded-stamp-img"
        />
        <div className="official-stamp-date-tag">{displayDate}</div>
      </div>
    );
  }

  // Realistic Nigerian Hospital Official Circular Stamp Seal
  const statusText = isSettled ? "PAID" : "PENDING";
  const stampToneClass = isSettled ? "stamp-paid" : "stamp-pending";

  const sizePx = size === "sm" ? 110 : size === "lg" ? 160 : 135;

  return (
    <div
      className={`official-hospital-stamp ${stampToneClass} size-${size} ${className}`}
      title="Official MDS Specialist Hospital Kano Stamp"
      style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
    >
      <svg
        viewBox="0 0 200 200"
        className="stamp-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Circular text path for Hospital Name */}
          <path
            id="stamp-top-arc"
            d="M 25,100 A 75,75 0 1,1 175,100"
            fill="none"
          />
          {/* Circular text path for State & Nigeria */}
          <path
            id="stamp-bottom-arc"
            d="M 175,100 A 75,75 0 1,1 25,100"
            fill="none"
          />
        </defs>

        {/* Outer and Inner Concentric Stamp Rings */}
        <circle cx="100" cy="100" r="95" className="stamp-ring-outer" />
        <circle cx="100" cy="100" r="90" className="stamp-ring-middle" />
        <circle cx="100" cy="100" r="62" className="stamp-ring-inner" />

        {/* Top Text: Hospital Name */}
        <text className="stamp-text-curved">
          <textPath
            href="#stamp-top-arc"
            startOffset="50%"
            textAnchor="middle"
          >
            MDS SPECIALIST HOSPITAL
          </textPath>
        </text>

        {/* Bottom Text: State / Department */}
        <text className="stamp-text-curved-sub">
          <textPath
            href="#stamp-bottom-arc"
            startOffset="50%"
            textAnchor="middle"
          >
            ★ KANO STATE • NIGERIA ★
          </textPath>
        </text>

        {/* Center Department / Division */}
        <text
          x="100"
          y="78"
          textAnchor="middle"
          className="stamp-dept-text"
        >
          {department.toUpperCase()}
        </text>

        {/* Center Main Status: PAID / PENDING */}
        <text
          x="100"
          y="112"
          textAnchor="middle"
          className="stamp-status-bold"
        >
          {statusText}
        </text>

        {/* Center Date */}
        <text
          x="100"
          y="132"
          textAnchor="middle"
          className="stamp-date-text"
        >
          {displayDate}
        </text>

        {/* Verified Security Star */}
        <text
          x="100"
          y="148"
          textAnchor="middle"
          className="stamp-verified-text"
        >
          ✔ OFFICIAL RECEIPT
        </text>
      </svg>
    </div>
  );
}
