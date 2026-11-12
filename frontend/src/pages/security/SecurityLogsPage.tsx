import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiLogIn,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import SecurityEntryLogList from "../../components/security/SecurityEntryLogList";
import {
  checkoutSecurityEntry,
  fetchSecurityEntries,
} from "../../services/security/securityService";
import type { SecurityEntryLog } from "../../types/security";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { HMS_SYNC_FLUSHED_EVENT } from "../../utils/appEvents";

type StatusFilter = "all" | "inside" | "checked_out";
type PersonTypeFilter = "all" | SecurityEntryLog["personType"];

export default function SecurityLogsPage() {
  const [entries, setEntries] = useState<SecurityEntryLog[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [personTypeFilter, setPersonTypeFilter] = useState<PersonTypeFilter>("all");
  const [loading, setLoading] = useState(false);

  const { pendingCount, isBrowserOnline, syncing, syncNow } = useOfflineSync();

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (statusFilter === "inside" && entry.checkedOutAt) return false;
      if (statusFilter === "checked_out" && !entry.checkedOutAt) return false;
      if (personTypeFilter !== "all" && entry.personType !== personTypeFilter) return false;

      if (!term) return true;
      const haystack = [
        entry.name,
        entry.phone,
        entry.staffIdCardNumber,
        entry.patientId,
        entry.destination,
        entry.purpose,
        entry.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [entries, statusFilter, personTypeFilter, search]);

  const summary = useMemo(
    () => ({
      total: entries.length,
      inside: entries.filter((entry) => !entry.checkedOutAt).length,
      checkedOut: entries.filter((entry) => entry.checkedOutAt).length,
    }),
    [entries]
  );

  const loadEntries = async (searchTerm = "") => {
    setLoading(true);
    const response = await fetchSecurityEntries(searchTerm, { take: 120 });
    setLoading(false);

    if (response) {
      setEntries(response);
    }
  };

  useEffect(() => {
    void loadEntries("");

    const handleSynced = () => {
      void loadEntries("");
    };
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, handleSynced);
    };
  }, []);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    void loadEntries(search);
  };

  const handleCheckout = async (entry: SecurityEntryLog) => {
    const checkedOut = await checkoutSecurityEntry(entry.id);

    if (checkedOut) {
      setEntries((current) =>
        current.map((item) => (item.id === entry.id ? checkedOut : item))
      );
    }
  };

  return (
    <AdminLayout>
      <div className="security-entry-page security-logs-page">
        <section className="security-hero compact">
          <div>
            <p className="eyebrow">Security & Gate Desk</p>
            <h1>All Gate Logs</h1>
            <p>See everyone who entered or left the hospital, check people out, or search past visits.</p>
          </div>
          <div className="security-hero-stats">
            <Link className="security-goto-entry" to="/security/entry">
              <FiLogIn />
              <span>New Check-In</span>
            </Link>
            <div className="security-live-count">
              <FiShield />
              <strong>{summary.inside}</strong>
              <span>Inside Now</span>
            </div>
          </div>
        </section>

        <div className={`security-sync-bar ${isBrowserOnline ? "online" : "offline"}`}>
          <div className="security-sync-state">
            {isBrowserOnline ? <FiWifi /> : <FiWifiOff />}
            <div>
              <strong>
                {isBrowserOnline
                  ? "System Online"
                  : "Offline Mode — Showing saved records on this device"}
              </strong>
              <small>
                {pendingCount > 0
                  ? `${pendingCount} gate record${pendingCount === 1 ? "" : "s"} waiting to sync`
                  : "All records synced with server"}
              </small>
            </div>
          </div>

          {pendingCount > 0 && (
            <button
              type="button"
              className="security-sync-btn"
              onClick={() => void syncNow()}
              disabled={!isBrowserOnline || syncing}
            >
              <FiRefreshCw className={syncing ? "spin" : ""} />
              <span>{syncing ? "Syncing..." : isBrowserOnline ? "Sync Now" : "Waiting for Network"}</span>
            </button>
          )}
        </div>

        <section className="security-log-panel full-width">
          <div className="security-log-summary">
            <span>
              <small>Total Shown</small>
              <strong>{summary.total}</strong>
            </span>
            <span>
              <small>Still Inside</small>
              <strong>{summary.inside}</strong>
            </span>
            <span>
              <small>Checked Out</small>
              <strong>{summary.checkedOut}</strong>
            </span>
          </div>

          <div className="security-filter-tabs" role="tablist" aria-label="Filter by status">
            <button
              type="button"
              className={statusFilter === "all" ? "active" : ""}
              onClick={() => setStatusFilter("all")}
            >
              All ({summary.total})
            </button>
            <button
              type="button"
              className={statusFilter === "inside" ? "active" : ""}
              onClick={() => setStatusFilter("inside")}
            >
              Still Inside ({summary.inside})
            </button>
            <button
              type="button"
              className={statusFilter === "checked_out" ? "active" : ""}
              onClick={() => setStatusFilter("checked_out")}
            >
              Checked Out ({summary.checkedOut})
            </button>
          </div>

          <form className="security-search security-log-search" onSubmit={handleSearch}>
            <FiSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, staff ID, place..."
            />
            <select
              value={personTypeFilter}
              onChange={(event) => setPersonTypeFilter(event.target.value as PersonTypeFilter)}
              aria-label="Filter by person type"
            >
              <option value="all">All People</option>
              <option value="patient">Patients</option>
              <option value="patient_relative">Relatives</option>
              <option value="staff">Staff</option>
              <option value="guest">Guests</option>
            </select>
            <button type="button" onClick={() => void loadEntries(search)}>
              <FiRefreshCw />
              Refresh
            </button>
          </form>

          <SecurityEntryLogList
            entries={filteredEntries}
            loading={loading}
            emptyMessage="No gate records match this filter."
            onCheckout={handleCheckout}
          />
        </section>
      </div>
    </AdminLayout>
  );
}
