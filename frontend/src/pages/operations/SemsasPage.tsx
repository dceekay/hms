import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiArchive, FiFileText, FiRefreshCw, FiSave, FiSearch, FiTruck } from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import { createSemsasTransfer, fetchSemsasTransfers, fileSemsasMonth } from "../../services/semsasService";
import { useAuthStore } from "../../store/authStore";
import { SemsasTransfer, SemsasTransferFormValues, SemsasTransferType } from "../../types/semsas";

const transferLabels: Record<SemsasTransferType, string> = {
  hospital_ambulance_to_other_hospital: "MDS ambulance to another hospital",
  hospital_ambulance_to_this_hospital: "MDS ambulance to MDS",
  external_ambulance_to_this_hospital: "External ambulance to MDS",
};

const emptyForm: SemsasTransferFormValues = {
  transferType: "hospital_ambulance_to_other_hospital",
  patientName: "",
  patientPhone: "",
  fromFacility: "",
  toFacility: "MDS Hospital",
  ambulanceProvider: "",
  ambulancePlateNumber: "",
  driverName: "",
  driverPhone: "",
  pickupAddress: "",
  destinationAddress: "",
  transferDate: new Date().toISOString().slice(0, 16),
  feeAmount: "0",
  notes: "",
};

function money(value?: string | number | null) {
  return `₦${Number(value ?? 0).toLocaleString()}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function SemsasPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("semsas.create");
  const canFile = permissions.includes("semsas.file");

  const [form, setForm] = useState<SemsasTransferFormValues>(emptyForm);
  const [transfers, setTransfers] = useState<SemsasTransfer[]>([]);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [filingStatus, setFilingStatus] = useState("unfiled");
  const [filingNotes, setFilingNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filing, setFiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totals = useMemo(() => {
    const amount = transfers.reduce((sum, transfer) => sum + Number(transfer.feeAmount ?? 0), 0);
    const unfiled = transfers.filter((transfer) => !transfer.filedAt).length;
    return { amount, unfiled };
  }, [transfers]);

  const loadTransfers = async () => {
    setLoading(true);
    setError(null);
    const { transfers: result, error: fetchError } = await fetchSemsasTransfers({
      search,
      month,
      filingStatus,
    });
    setLoading(false);

    if (!result) {
      setError(fetchError ?? "Unable to load SEMSAS records.");
      return;
    }

    setTransfers(result);
  };

  useEffect(() => {
    void loadTransfers();
  }, []);

  const updateField = (field: keyof SemsasTransferFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleTransferType = (transferType: SemsasTransferType) => {
    setForm((current) => ({
      ...current,
      transferType,
      fromFacility:
        transferType === "external_ambulance_to_this_hospital" ? current.fromFacility : "MDS Hospital",
      toFacility:
        transferType === "hospital_ambulance_to_other_hospital" ? "" : "MDS Hospital",
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const { transfer, error: saveError } = await createSemsasTransfer(form);
    setSaving(false);

    if (!transfer) {
      setError(saveError ?? "Unable to save SEMSAS record.");
      return;
    }

    setSuccess("SEMSAS service record saved.");
    setForm({ ...emptyForm, transferDate: new Date().toISOString().slice(0, 16) });
    await loadTransfers();
  };

  const handleFileMonth = async () => {
    if (!window.confirm(`File all unfiled SEMSAS records for ${month}?`)) return;

    setFiling(true);
    setError(null);
    setSuccess(null);
    const { filing: result, error: filingError } = await fileSemsasMonth(month, filingNotes);
    setFiling(false);

    if (!result) {
      setError(filingError ?? "Unable to file SEMSAS month.");
      return;
    }

    setSuccess(`${result.count} SEMSAS record(s) filed for ${result.month}.`);
    setFilingNotes("");
    await loadTransfers();
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="semsas-page">
          <section className="semsas-hero">
            <div>
              <p className="eyebrow">SEMSAS</p>
              <h1>Ambulance Service Register</h1>
              <p>Record ambulance movement into or out of MDS and prepare monthly filing for accounts.</p>
            </div>
            <div className="semsas-stats">
              <span>
                <FiTruck />
                <strong>{transfers.length}</strong>
                Records
              </span>
              <span>
                <FiArchive />
                <strong>{totals.unfiled}</strong>
                Unfiled
              </span>
              <span>
                <FiFileText />
                <strong>{money(totals.amount)}</strong>
                Value
              </span>
            </div>
          </section>

          <section className="semsas-layout">
            <form className="setup-form semsas-form" onSubmit={handleSubmit}>
              <div className="panel-title">
                <div>
                  <h2>New Service Use</h2>
                  <p>Capture one ambulance service event.</p>
                </div>
                <FiTruck />
              </div>

              <div className="semsas-type-grid">
                {(Object.keys(transferLabels) as SemsasTransferType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`category-option ${form.transferType === type ? "active" : ""}`}
                    onClick={() => handleTransferType(type)}
                  >
                    <strong>{transferLabels[type]}</strong>
                  </button>
                ))}
              </div>

              <div className="form-grid">
                <label>
                  Patient name
                  <input value={form.patientName} onChange={(event) => updateField("patientName", event.target.value)} required />
                </label>
                <label>
                  Patient phone
                  <input value={form.patientPhone} onChange={(event) => updateField("patientPhone", event.target.value)} />
                </label>
                <label>
                  From facility
                  <input value={form.fromFacility} onChange={(event) => updateField("fromFacility", event.target.value)} required />
                </label>
                <label>
                  To facility
                  <input value={form.toFacility} onChange={(event) => updateField("toFacility", event.target.value)} required />
                </label>
                <label>
                  Transfer date
                  <input
                    type="datetime-local"
                    value={form.transferDate}
                    onChange={(event) => updateField("transferDate", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.feeAmount}
                    onChange={(event) => updateField("feeAmount", event.target.value)}
                  />
                </label>
              </div>

              <details className="registration-details">
                <summary>Ambulance details</summary>
                <div className="form-section">
                  <div className="form-grid">
                    <label>
                      Ambulance provider
                      <input
                        value={form.ambulanceProvider}
                        onChange={(event) => updateField("ambulanceProvider", event.target.value)}
                      />
                    </label>
                    <label>
                      Plate number
                      <input
                        value={form.ambulancePlateNumber}
                        onChange={(event) => updateField("ambulancePlateNumber", event.target.value)}
                      />
                    </label>
                    <label>
                      Driver name
                      <input value={form.driverName} onChange={(event) => updateField("driverName", event.target.value)} />
                    </label>
                    <label>
                      Driver phone
                      <input value={form.driverPhone} onChange={(event) => updateField("driverPhone", event.target.value)} />
                    </label>
                    <label>
                      Pickup address
                      <input value={form.pickupAddress} onChange={(event) => updateField("pickupAddress", event.target.value)} />
                    </label>
                    <label>
                      Destination address
                      <input
                        value={form.destinationAddress}
                        onChange={(event) => updateField("destinationAddress", event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </details>

              <label>
                Notes
                <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={3} />
              </label>

              {error && <p className="registration-error">{error}</p>}
              {success && <p className="security-success">{success}</p>}

              <button className="registration-submit" type="submit" disabled={saving || !canCreate}>
                {saving ? "Saving..." : "Save SEMSAS Record"}
                <FiSave />
              </button>
            </form>

            <section className="setup-list-panel semsas-list-panel">
              <div className="semsas-filing-panel">
                <div>
                  <p className="eyebrow">Monthly Filing</p>
                  <h2>Accounts Filing</h2>
                </div>
                <div className="form-grid">
                  <label>
                    Month
                    <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
                  </label>
                  <label>
                    Status
                    <select value={filingStatus} onChange={(event) => setFilingStatus(event.target.value)}>
                      <option value="unfiled">Unfiled</option>
                      <option value="filed">Filed</option>
                      <option value="">All</option>
                    </select>
                  </label>
                </div>
                <label>
                  Filing notes
                  <input value={filingNotes} onChange={(event) => setFilingNotes(event.target.value)} />
                </label>
                <button className="registration-submit" type="button" disabled={filing || !canFile} onClick={handleFileMonth}>
                  {filing ? "Filing..." : "File Month"}
                  <FiArchive />
                </button>
              </div>

              <div className="setup-list-header">
                <div className="patient-search-control">
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadTransfers();
                    }}
                    placeholder="Search patient, facility, ambulance"
                  />
                </div>
                <button type="button" className="icon-text-btn" onClick={loadTransfers}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {loading && <p className="muted-text">Loading SEMSAS records...</p>}
              {!loading && transfers.length === 0 && <p className="muted-text">No SEMSAS records found.</p>}

              <div className="semsas-record-list">
                {transfers.map((transfer) => (
                  <article key={transfer.id} className="semsas-record-card">
                    <div>
                      <strong>{transfer.patientName}</strong>
                      <span className={`patient-status-badge ${transfer.filedAt ? "active" : "inactive"}`}>
                        {transfer.filedAt ? `Filed ${transfer.filedMonth}` : "Unfiled"}
                      </span>
                    </div>
                    <p>{transferLabels[transfer.transferType]}</p>
                    <div className="setup-provider-meta">
                      <span>{new Date(transfer.transferDate).toLocaleString()}</span>
                      <span>{transfer.fromFacility} to {transfer.toFacility}</span>
                      <span>{money(transfer.feeAmount)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
