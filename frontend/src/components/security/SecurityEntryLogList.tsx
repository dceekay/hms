import { FiLogOut } from "react-icons/fi";
import type { SecurityEntryLog } from "../../types/security";

const personTypeLabels: Record<SecurityEntryLog["personType"], string> = {
  patient: "Patient",
  patient_relative: "Patient Relative",
  staff: "Staff",
  guest: "Guest",
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
  emptyMessage = "No security entries found.",
  onCheckout,
}: Props) {
  return (
    <div className="security-entry-list">
      {loading && <p className="muted-text">Loading entries...</p>}

      {entries.map((entry) => {
        const rolloverBadge = dayRolloverBadge(entry);

        return (
          <article
            className={`security-entry-card ${
              entry.checkedOutAt ? "checked-out" : "active"
            }`}
            key={entry.id}
          >
            {entry.photoDataUrl ? (
              <img src={entry.photoDataUrl} alt="" />
            ) : (
              <span className="entry-avatar" />
            )}

            <div className="security-entry-main">
              <div className="security-entry-title">
                <strong>{entry.name || personTypeLabels[entry.personType]}</strong>
                <span className={`security-state-badge ${entry.checkedOutAt ? "out" : "in"}`}>
                  {entry.checkedOutAt ? "Checked out" : "Inside"}
                </span>
              </div>

              <small>
                {personTypeLabels[entry.personType]} {entry.phone ? `- ${entry.phone}` : ""}
              </small>

              {entry.staffIdCardNumber && <code>{entry.staffIdCardNumber}</code>}

              <div className="security-time-grid">
                <span>
                  <small>Time in</small>
                  <strong>{formatLogTime(entry.checkedInAt)}</strong>
                  <em>{formatLogDate(entry.checkedInAt)}</em>
                </span>
                <span>
                  <small>Time out</small>
                  <strong>{formatLogTime(entry.checkedOutAt)}</strong>
                  <em>{formatLogDate(entry.checkedOutAt) || "Pending"}</em>
                </span>
                {rolloverBadge && (
                  <b className="security-day-badge">{rolloverBadge}</b>
                )}
              </div>
            </div>

            {!entry.checkedOutAt && onCheckout && (
              <button
                type="button"
                onClick={() => onCheckout(entry)}
                title="Check out"
              >
                <FiLogOut />
              </button>
            )}
          </article>
        );
      })}

      {!loading && entries.length === 0 && <p className="muted-text">{emptyMessage}</p>}
    </div>
  );
}
