import { useEffect, useState } from "react";
import { FiDownload, FiInfo, FiShare, FiSmartphone, FiX } from "react-icons/fi";
import mdsLogo from "../../assets/optimized/logo.png";
import "../../styles/pwa.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(sessionStorage.getItem("mds_pwa_banner_dismissed"));
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running as installed standalone PWA
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsStandalone(isStandaloneMode);

    // Detect iPhone/iPad Safari, including modern iPads that identify as Mac with touch.
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    setIsIos(isAppleMobile);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleOpenTrigger = () => {
      setDismissed(false);
      if (isAppleMobile || isIos) {
        setShowIosGuide(true);
      } else if (deferredPrompt) {
        void deferredPrompt.prompt();
      } else {
        setShowIosGuide(true);
      }
    };

    window.addEventListener("open-pwa-install", handleOpenTrigger);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("open-pwa-install", handleOpenTrigger);
    };
  }, [deferredPrompt, isIos]);

  if (isStandalone || (dismissed && !showIosGuide)) {
    return null;
  }

  // Only show if prompt is available or on iOS mobile
  if (!deferredPrompt && !isIos && !showIosGuide) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIos && !deferredPrompt) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("mds_pwa_banner_dismissed", "true");
  };

  return (
    <>
      {!dismissed && (
        <aside className="pwa-install-banner" aria-label="Add App Banner">
          <div className="pwa-banner-content">
            <img src={mdsLogo} alt="MDS Hospital" className="pwa-app-icon" />
            <div className="pwa-banner-text">
              <strong>{isIos ? "Add to iPhone Home Screen" : "Add MDS Hospital to Home Screen"}</strong>
              <p>
                {isIos
                  ? "Install as a full-screen app on your iPhone for faster access & offline records."
                  : "Add to your phone home screen for instant alerts & faster ward rounds."}
              </p>
            </div>
          </div>

          <div className="pwa-banner-actions">
            <button type="button" className="pwa-install-btn" onClick={handleInstallClick}>
              {isIos ? <FiShare /> : <FiDownload />}
              {isIos ? "Add to iPhone" : "Add App"}
            </button>
            <button
              type="button"
              className="pwa-close-btn"
              onClick={handleDismiss}
              aria-label="Dismiss app install banner"
            >
              <FiX />
            </button>
          </div>
        </aside>
      )}

      {showIosGuide && (
        <div className="pwa-ios-modal-overlay" onClick={() => setShowIosGuide(false)}>
          <div className="pwa-ios-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-ios-header">
              <div className="pwa-ios-title">
                <FiSmartphone />
                <h3>Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                className="pwa-modal-close"
                onClick={() => setShowIosGuide(false)}
              >
                <FiX />
              </button>
            </div>

            <ol className="pwa-ios-steps">
              <li>
                <span className="step-num">1</span>
                <div>
                  Tap the <strong>Share</strong> button in Safari toolbar:
                  <div className="share-icon-pill">
                    <FiShare /> <span>Share</span>
                  </div>
                </div>
              </li>
              <li>
                <span className="step-num">2</span>
                <div>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </div>
              </li>
              <li>
                <span className="step-num">3</span>
                <div>
                  Tap <strong>Add</strong> at top-right. Launch from your home screen anytime!
                </div>
              </li>
            </ol>

            <div className="pwa-ios-tip">
              <FiInfo />
              <span>Make sure to open in <strong>Safari</strong> on your iPhone to see the "Add to Home Screen" option.</span>
            </div>

            <button
              type="button"
              className="pwa-guide-confirm-btn"
              onClick={() => setShowIosGuide(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

