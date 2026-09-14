import logo from "../../assets/optimized/logo.png";

interface LoaderProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export default function Loader({ text = "Loading...", size = "md", fullScreen }: LoaderProps) {
  const isFullScreen = fullScreen || size === "lg";
  return (
    <div
      className={`loader-wrapper loader-${size} ${isFullScreen ? "loader-fullscreen" : ""}`}
      aria-label="Loading"
      role="status"
    >
      <div className="loader-mark">
        <div className="loader-ring-wrapper">
          <div className="loader-ring"></div>
          <img
            src={logo}
            alt="MDS Hospital"
            className="loader-logo-img"
            style={{ imageRendering: "-webkit-optimize-contrast" }}
            width={size === "sm" ? 32 : size === "lg" ? 64 : 46}
            height={size === "sm" ? 32 : size === "lg" ? 64 : 46}
          />
        </div>
        {text && <span className="loader-caption">{text}</span>}
      </div>
    </div>
  );
}