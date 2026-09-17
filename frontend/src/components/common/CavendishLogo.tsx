import React from "react";
import mdsLogoImg from "../../assets/optimized/logo.png";

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const MdsMark: React.FC<LogoProps> = ({ size = 48, className = "", style = {} }) => {
  return (
    <img
      src={mdsLogoImg}
      width={size}
      height={size}
      alt="MDS Specialist Hospital Logo"
      className={`mds-hospital-logo ${className}`.trim()}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        imageRendering: "-webkit-optimize-contrast",
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
};

export const MdsLogo: React.FC<LogoProps> = (props) => <MdsMark {...props} />;
export const HospitalLogo: React.FC<LogoProps> = (props) => <MdsMark {...props} />;
export const CavendishMark: React.FC<LogoProps> = (props) => <MdsMark {...props} />;
export const CavendishLogo: React.FC<LogoProps> = (props) => <MdsMark {...props} />;

export default MdsMark;
