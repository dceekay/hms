import { useEffect, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiX,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import { AuditItem, getSystemActivity } from "../../services/auditService";
import "../../styles/system-activity.css";

const actionLabel = (action: AuditItem["action"]) =>
  ({
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
    LOGIN: "Signed in",
    LOGOUT: "Signed out",
  })[action];

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function SystemActivityPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1, limit: 25 });
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AuditItem | null>(null);

  const load = async (page = meta.page) => {
    setLoading(true);
    setError("");
    try {
      const result = await getSystemActivity({
        query,
        action,
        entity,
        from,
        to,
        page,
        limit: 25,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch {
      setError("System activity could not be loaded. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, []);

  const reset = () => {
    setQuery("");
    setAction("");
    setEntity("");
    setFrom("");
    setTo("");
    window.setTimeout(() => void load(1), 0);
  };

  return (
    <AdminLayout>
      <main className="system-activity page-container">
        <header className="activity-header">
          <div>
            <p className="eyebrow">Executive control record</p>
            <h1>System Logs &amp; Activity</h1>
            <p>
              Immutable operational records for completed actions and staff sign-ins across MDS Specialist Hospital.
            </p>
          </div>
          <div className="activity-summary">
            <strong>{meta.total}</strong>
            <span>records in this view</span>
            <button onClick={() => void load()} type="button">
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </header>

        <section className="activity-filters" aria-label="Activity filters">
          <label className="activity-search">
            Search
            <FiSearch />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load(1)}
              placeholder="Search actor, module, or IP..."
            />
          </label>
          <label>
            Action
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
              <option value="LOGIN">Signed in</option>
              <option value="LOGOUT">Signed out</option>
            </select>
          </label>
          <label>
            Module
            <input
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="e.g. Laboratory, Patient, Pharmacy"
            />
          </label>
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="activity-apply"
            onClick={() => void load(1)}
          >
            Apply filters
          </button>
          <button type="button" className="activity-reset" onClick={reset}>
            Reset
          </button>
        </section>

        {error && <p className="activity-error">{error}</p>}

        <section className="activity-ledger" aria-live="polite">
          {loading ? (
            <div className="activity-empty">Loading system activity…</div>
          ) : items.length === 0 ? (
            <div className="activity-empty">
              <FiShield />
              <h2>No activity matches these filters</h2>
              <p>
                New completed actions will appear here. Existing records remain historic.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="activity-row"
                key={item.id}
              >
                <span className={`activity-action ${item.action.toLowerCase()}`}>
                  {actionLabel(item.action)}
                </span>
                <div className="activity-narrative">
                  <strong>{item.summary}</strong>
                  <small>
                    {item.entity}
                    {item.reference ? ` · ${item.reference}` : ""}
                    {item.ipAddress ? ` · IP: ${item.ipAddress}` : ""}
                  </small>
                </div>
                <span className="activity-actor">
                  {item.actor?.name || "System"}
                  <small>{item.actor?.username ? `@${item.actor.username}` : ""}</small>
                </span>
                <time>{formatTime(item.createdAt)}</time>
              </button>
            ))
          )}
        </section>

        <footer className="activity-pagination">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div>
            <button
              disabled={meta.page <= 1 || loading}
              onClick={() => void load(meta.page - 1)}
            >
              <FiChevronLeft /> Previous
            </button>
            <button
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => void load(meta.page + 1)}
            >
              Next <FiChevronRight />
            </button>
          </div>
        </footer>

        {selected && (
          <section
            className="activity-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Activity record"
          >
            <button
              className="activity-backdrop"
              aria-label="Close details"
              onClick={() => setSelected(null)}
            />
            <article>
              <header>
                <div>
                  <p className="eyebrow">Audit record</p>
                  <h2>{selected.summary}</h2>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close">
                  <FiX />
                </button>
              </header>
              <dl>
                <dt>Action</dt>
                <dd>{actionLabel(selected.action)}</dd>
                <dt>Actor</dt>
                <dd>
                  {selected.actor?.name || "System"}
                  {selected.actor?.username ? ` (@${selected.actor.username})` : ""}
                </dd>
                <dt>Module</dt>
                <dd>{selected.entity}</dd>
                <dt>Record</dt>
                <dd className="activity-code">
                  {selected.reference || selected.entityId || "Not recorded"}
                </dd>
                {selected.ipAddress && (
                  <>
                    <dt>IP Address</dt>
                    <dd className="activity-code">{selected.ipAddress}</dd>
                  </>
                )}
                {selected.deviceSummary && (
                  <>
                    <dt>Device</dt>
                    <dd>{selected.deviceSummary}</dd>
                  </>
                )}
                <dt>Timestamp</dt>
                <dd>{formatTime(selected.createdAt)}</dd>
              </dl>
              {selected.changes.length > 0 && (
                <div className="activity-changes">
                  <h3>Selected changes</h3>
                  {selected.changes.map((change, i) => (
                    <p key={`${change.field}-${i}`}>
                      <strong>{change.field}</strong>
                      <span>
                        {String(change.before ?? "—")} → {String(change.after ?? "—")}
                      </span>
                    </p>
                  ))}
                </div>
              )}
              <p className="activity-safe-note">
                Sensitive credentials, payment card details, and clinical free text are never displayed in activity records.
              </p>
            </article>
          </section>
        )}
      </main>
    </AdminLayout>
  );
}

