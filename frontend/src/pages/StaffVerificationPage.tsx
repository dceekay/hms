import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiCheckCircle, FiLoader, FiShield, FiSlash } from "react-icons/fi";
import mdsLogo from "../assets/logo.png";
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
        <div className="verification-brand">
          <img src={mdsLogo} alt="MDS Hospital" />
          <div>
            <strong>MDS Hospital</strong>
            <span>Staff ID Verification</span>
          </div>
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
