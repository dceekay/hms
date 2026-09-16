import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export const MdsMark: React.FC<LogoProps> = ({ size = 48, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="MDS Hospital Logo"
    >
      <rect width="100" height="100" rx="22" fill="url(#mdsBrandGrad)" />
      <path
        d="M50 20V80M20 50H80"
        stroke="#FFFFFF"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="8" fill="#38BDF8" />
      <defs>
        <linearGradient id="mdsBrandGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7" />
          <stop offset="1" stopColor="#0369A1" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const MdsLogo: React.FC<LogoProps> = (props) => <MdsMark {...props} />;
export const HospitalLogo: React.FC<LogoProps> = (props) => <MdsMark {...props} />;
export const CavendishMark: React.FC<LogoProps> = (props) => <MdsMark {...props} />;
export const CavendishLogo: React.FC<LogoProps> = (props) => <MdsMark {...props} />;

export default MdsMark;
