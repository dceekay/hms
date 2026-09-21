import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiCheckCircle, FiLoader, FiShield, FiSlash } from "react-icons/fi";
import QRCode from "qrcode";
import mdsLogo from "../assets/optimized/logo.png";
import { StaffVerification, verifyStaffPublic } from "../services/userService";
import "../styles/verification.css";

function fullName(staff: StaffVerification) {
  return `${staff.firstName} ${staff.lastName}`;
}

function photoSource(staff: StaffVerification) {
  return staff.photoDataUrl || staff.photoUrl || "";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function StaffVerificationPage() {
  const { id } = useParams();
  const [staff, setStaff] = useState<StaffVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffQrDataUrl, setStaffQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    QRCode.toDataURL(window.location.href, {
      margin: 1,
      width: 140,
      color: { dark: "#092a5e", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setStaffQrDataUrl(url);
      })
      .catch((err) => console.error("Staff QR error:", err));

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) {
        setLoading(false);
        return;
      }

      const result = await verifyStaffPublic(id);
      if (active) {
        setStaff(result);
        setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="verification-page">
      <section className="verification-card">
        <div className="verification-brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img src={mdsLogo} alt="MDS Hospital" style={{ width: 54, height: 54, objectFit: "contain" }} />
            <div>
              <strong style={{ fontSize: "1.15rem", color: "#092a5e" }}>MDS Specialist Hospital Kano</strong>
              <span style={{ fontSize: "0.82rem", color: "#0284c7", fontWeight: 600 }}>Staff Identification &amp; Credentials Verification</span>
            </div>
          </div>

          {staffQrDataUrl && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <img
                src={staffQrDataUrl}
                alt="Scan to verify staff credentials"
                style={{ width: 56, height: 56, borderRadius: 6, border: "1px solid #cbd5e1", padding: 2, background: "#fff" }}
              />
              <small style={{ fontSize: "0.58rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Scan to Verify</small>
            </div>
          )}
        </div>

        {loading && (
          <div className="verification-state">
            <FiLoader />
            <h1>Checking ID</h1>
            <p>Please wait while we verify this staff record.</p>
          </div>
        )}

        {!loading && !staff && (
          <div className="verification-state failed">
            <FiSlash />
            <h1>ID Not Found</h1>
            <p>This staff ID could not be verified by MDS Hospital.</p>
          </div>
        )}

        {!loading && staff && (
          <>
            <div className={`verification-status ${staff.verified ? "verified" : "inactive"}`}>
              {staff.verified ? <FiCheckCircle /> : <FiSlash />}
              <span>{staff.verified ? "Official staff ID" : "Inactive staff ID"}</span>
            </div>

            <div className="verification-profile">
              <div className="verification-photo">
                {photoSource(staff) ? (
                  <img src={photoSource(staff)} alt={fullName(staff)} />
                ) : (
                  <FiShield />
                )}
              </div>
              <div>
                <p>{staff.staffId}</p>
                <h1>{fullName(staff)}</h1>
                <span>{staff.roles.join(", ") || "Staff"}</span>
              </div>
            </div>

            <div className="verification-grid">
              <span>
                <small>Service</small>
                <strong>{staff.serviceArea?.name || "General"}</strong>
              </span>
              <span>
                <small>Issue Date</small>
                <strong>{formatDate(staff.issueDate)}</strong>
              </span>
              <span>
                <small>Expires</small>
                <strong>{formatDate(staff.expiresAt)}</strong>
              </span>
              <span>
                <small>Phone</small>
                <strong>{staff.phone || "Not provided"}</strong>
              </span>
            </div>
          </>
        )}

        <Link className="verification-link" to="/landing">
          Open hospital page
        </Link>
      </section>
    </main>
  );
}
