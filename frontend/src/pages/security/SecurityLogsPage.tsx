import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiShield,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import SecurityEntryLogList from "../../components/security/SecurityEntryLogList";
import {
  checkoutSecurityEntry,
  fetchSecurityEntries,
} from "../../services/security/securityService";
import type { SecurityEntryLog } from "../../types/security";

type StatusFilter = "all" | "inside" | "checked_out";

export default function SecurityLogsPage() {
  const [entries, setEntries] = useState<SecurityEntryLog[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "inside") {
      return entries.filter((entry) => !entry.checkedOutAt);
    }

    if (statusFilter === "checked_out") {
      return entries.filter((entry) => Boolean(entry.checkedOutAt));
    }

    return entries;
  }, [entries, statusFilter]);

  const summary = useMemo(
    () => ({
      total: entries.length,
      inside: entries.filter((entry) => !entry.checkedOutAt).length,
      checkedOut: entries.filter((entry) => entry.checkedOutAt).length,
    }),
    [entries]
  );

  const loadEntries = async (searchTerm = search) => {
    setLoading(true);
    const response = await fetchSecurityEntries(searchTerm, { take: 100 });
    setLoading(false);

    if (response) {
      setEntries(response);
    }
  };

  useEffect(() => {
    void loadEntries("");
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
            <p className="eyebrow">Security desk</p>
            <h1>All entry logs.</h1>
            <p>Review movement records, checkout times, and overnight visits.</p>
          </div>
          <div className="security-live-count">
            <FiShield />
            <strong>{summary.inside}</strong>
            <span>inside</span>
          </div>
        </section>

        <section className="security-log-panel full-width">
          <div className="security-log-summary">
            <span>
              <small>Total</small>
              <strong>{summary.total}</strong>
            </span>
            <span>
              <small>Inside</small>
              <strong>{summary.inside}</strong>
            </span>
            <span>
              <small>Checked out</small>
              <strong>{summary.checkedOut}</strong>
            </span>
          </div>

          <form className="security-search security-log-search" onSubmit={handleSearch}>
            <FiSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, staff ID"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              aria-label="Filter security entries"
            >
              <option value="all">All</option>
              <option value="inside">Inside</option>
              <option value="checked_out">Checked out</option>
            </select>
            <button type="submit">
              <FiFilter />
              Search
            </button>
            <button type="button" onClick={() => loadEntries(search)}>
              <FiRefreshCw />
              Refresh
            </button>
          </form>

          <SecurityEntryLogList
            entries={filteredEntries}
            loading={loading}
            emptyMessage="No entries match this view."
            onCheckout={handleCheckout}
          />
        </section>
      </div>
    </AdminLayout>
  );
}
