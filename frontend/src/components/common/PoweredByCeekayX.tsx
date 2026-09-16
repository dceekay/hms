import React from "react";
import "../../styles/powered-by.css";

interface PoweredByCeekayXProps {
  className?: string;
  variant?: "default" | "login" | "subtle";
}

export const PoweredByCeekayX: React.FC<PoweredByCeekayXProps> = ({
  className = "",
  variant = "default",
}) => {
  return (
    <footer className={`ceekayx-powered-wrap ceekayx-variant-${variant} ${className}`}>
      <span className="ceekayx-powered-label">Powered by</span>
      <a
        href="https://ceekayx.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="ceekayx-powered-link"
        title="Visit ceekayX — Healthcare Technology & Engineering"
      >
        <span className="ceekayx-brand-name">ceekayX</span>
      </a>
    </footer>
  );
};

export default PoweredByCeekayX;
