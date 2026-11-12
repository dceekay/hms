import { FiClock, FiLogOut, FiMapPin } from "react-icons/fi";
import type { SecurityEntryLog } from "../../types/security";

const personTypeLabels: Record<SecurityEntryLog["personType"], string> = {
  patient: "Patient",
  patient_relative: "Relative / Visitor",
  staff: "Hospital Staff",
  guest: "Guest / Delivery",
};

function formatLogTime(value?: string | null) {
  if (!value) return "Still inside";

  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLogDate(value?: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getInitials(name?: string | null, fallback = "G") {
  const clean = (name ?? "").trim();
  if (!clean) return fallback;
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function dayRolloverBadge(entry: SecurityEntryLog) {
  if (!entry.checkedOutAt) return null;

  const checkedIn = new Date(entry.checkedInAt);
  const checkedOut = new Date(entry.checkedOutAt);
  const inDay = new Date(
    checkedIn.getFullYear(),
    checkedIn.getMonth(),
    checkedIn.getDate()
  );
  const outDay = new Date(
    checkedOut.getFullYear(),
    checkedOut.getMonth(),
    checkedOut.getDate()
  );
  const dayDifference = Math.round(
    (outDay.getTime() - inDay.getTime()) / 86400000
  );

  if (dayDifference <= 0) return null;

  return `+${dayDifference} ${dayDifference === 1 ? "day" : "days"}`;
}

type Props = {
  entries: SecurityEntryLog[];
  loading?: boolean;
  emptyMessage?: string;
  onCheckout?: (entry: SecurityEntryLog) => void;
};

export default function SecurityEntryLogList({
  entries,
  loading = false,
  emptyMessage = "No gate records found.",
  onCheckout,
}: Props) {
  return (
    <div className="security-entry-list">
      {loading && <p className="muted-text">Loading gate records...</p>}

      {entries.map((entry) => {
        const rolloverBadge = dayRolloverBadge(entry);
        const typeLabel = personTypeLabels[entry.personType] ?? "Visitor";
        const displayName = entry.name?.trim() || typeLabel;
        const isQueued = Boolean(entry.queued) || entry.id.startsWith("offline-entry-");

        return (
          <article
            className={`security-entry-card ${
              entry.checkedOutAt ? "checked-out" : "active"
            }`}
            key={entry.id}
          >
            {entry.photoDataUrl ? (
              <img src={entry.photoDataUrl} alt={displayName} />
            ) : (
              <span className="entry-avatar" aria-hidden="true">
                {getInitials(entry.name, typeLabel[0])}
              </span>
            )}

            <div className="security-entry-main">
              <div className="security-entry-title">
                <strong>{displayName}</strong>
                <span className={`security-state-badge ${entry.checkedOutAt ? "out" : "in"}`}>
                  {entry.checkedOutAt ? "Checked Out" : "Still Inside"}
                </span>
                {isQueued && (
                  <span className="security-state-badge queued" title="Saved on this device. Will sync when network returns.">
                    <FiClock />
                    Saved Offline
                  </span>
                )}
              </div>

              <small className="security-entry-meta">
                {typeLabel}
                {entry.phone ? ` • ${entry.phone}` : ""}
                {entry.patientId ? ` • ID: ${entry.patientId}` : ""}
              </small>

              {(entry.destination || entry.purpose) && (
                <div className="security-entry-route">
                  <FiMapPin />
                  <span>
                    {[entry.destination, entry.purpose].filter(Boolean).join(" — ")}
                  </span>
                </div>
              )}

              {entry.staffIdCardNumber && <code>Staff ID: {entry.staffIdCardNumber}</code>}

              <div className="security-time-grid">
                <span>
                  <small>Time In</small>
                  <strong>{formatLogTime(entry.checkedInAt)}</strong>
                  <em>{formatLogDate(entry.checkedInAt)}</em>
                </span>
                <span>
                  <small>Time Out</small>
                  <strong>{formatLogTime(entry.checkedOutAt)}</strong>
                  <em>{formatLogDate(entry.checkedOutAt) || "Still inside"}</em>
                </span>
                {rolloverBadge && (
                  <b className="security-day-badge">{rolloverBadge}</b>
                )}
              </div>
            </div>

            {!entry.checkedOutAt && onCheckout && (
              <button
                type="button"
                className="security-checkout-btn"
                onClick={() => onCheckout(entry)}
                title="Mark person as checked out"
              >
                <FiLogOut />
                <span>Check Out</span>
              </button>
            )}
          </article>
        );
      })}

      {!loading && entries.length === 0 && <p className="muted-text">{emptyMessage}</p>}
    </div>
  );
}
