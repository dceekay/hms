import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export const CavendishMark: React.FC<LogoProps> = ({ size = 48, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Hospital Logo"
    >
      <rect width="100" height="100" rx="22" fill="url(#brandGrad)" />
      <path
        d="M50 20V80M20 50H80"
        stroke="#FFFFFF"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="8" fill="#D4AF37" />
      <defs>
        <linearGradient id="brandGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0C4A60" />
          <stop offset="1" stopColor="#06283D" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const CavendishLogo: React.FC<LogoProps> = (props) => <CavendishMark {...props} />;

export default CavendishMark;
