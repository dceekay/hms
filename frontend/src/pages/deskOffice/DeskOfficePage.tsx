import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiEdit3,
  FiFileText,
  FiRefreshCw,
  FiSave,
  FiSearch,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import {
  createInsuranceClaim,
  fetchDeskOfficeDashboard,
  updateInsuranceClaim,
} from "../../services/deskOfficeService";
import { fetchInsuranceProviders } from "../../services/setupService";
import { useAuthStore } from "../../store/authStore";
import {
  DeskOfficeDashboard,
  InsuranceClaim,
  InsuranceClaimFormValues,
} from "../../types/deskOffice";
import { InsuranceProvider } from "../../types/setup";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm: InsuranceClaimFormValues = {
  insuranceProviderId: "",
  amountClaimed: "",
  amountProvided: "",
  claimDate: today(),
  providedDate: "",
  notes: "",
};

function money(value?: number | string | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function claimToForm(claim: InsuranceClaim): InsuranceClaimFormValues {
  return {
    insuranceProviderId: claim.insuranceProviderId,
    amountClaimed: String(claim.amountClaimed ?? ""),
    amountProvided: String(claim.amountProvided ?? ""),
    claimDate: claim.claimDate ? new Date(claim.claimDate).toISOString().slice(0, 10) : today(),
    providedDate: claim.providedDate ? new Date(claim.providedDate).toISOString().slice(0, 10) : "",
    notes: claim.notes ?? "",
  };
}

export default function DeskOfficePage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("claims.create");
  const canUpdate = permissions.includes("claims.update");
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [dashboard, setDashboard] = useState<DeskOfficeDashboard | null>(null);
  const [form, setForm] = useState<InsuranceClaimFormValues>(emptyForm);
  const [editingClaim, setEditingClaim] = useState<InsuranceClaim | null>(null);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeProviders = useMemo(
    () => providers.filter((provider) => provider.isActive),
    [providers]
  );

  const selectedProvider = useMemo(
    () => activeProviders.find((provider) => provider.id === form.insuranceProviderId),
    [activeProviders, form.insuranceProviderId]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [providerResult, claimResult] = await Promise.all([
      fetchInsuranceProviders(),
      fetchDeskOfficeDashboard({
        search,
        insuranceProviderId: providerFilter,
        dateFrom,
        dateTo,
      }),
    ]);

    setLoading(false);

    if (!providerResult.providers || !claimResult.dashboard) {
      setError(providerResult.error ?? claimResult.error ?? "Unable to load desk office data.");
      return;
    }

    setProviders(providerResult.providers);
    setDashboard(claimResult.dashboard);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateField = (field: keyof InsuranceClaimFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = (clearMessages = true) => {
    setForm({ ...emptyForm, claimDate: today() });
    setEditingClaim(null);
    if (clearMessages) {
      setSuccess(null);
      setError(null);
    }
  };

  const startEdit = (claim: InsuranceClaim) => {
    setEditingClaim(claim);
    setForm(claimToForm(claim));
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = editingClaim
      ? await updateInsuranceClaim(editingClaim.id, form)
      : await createInsuranceClaim(form);

    setSaving(false);

    if (!result.claim) {
      setError(result.error ?? "Unable to save insurance claim.");
      return;
    }

    setSuccess(editingClaim ? "Claim updated." : `Claim ${result.claim.claimNumber} recorded.`);
    resetForm(false);
    await loadData();
  };

  const claims = dashboard?.items ?? [];
  const summary = dashboard?.summary ?? {
    totalClaims: 0,
    amountClaimed: 0,
    amountProvided: 0,
    outstandingAmount: 0,
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="desk-office-page">
          <section className="desk-office-hero">
            <div>
              <p className="eyebrow">Desk Office</p>
              <h1>Insurance Claims</h1>
              <p>File claims, record payments from providers, and track what is still outstanding.</p>
            </div>
            <div className="desk-office-hero-card">
              <FiFileText />
              <strong>{summary.totalClaims}</strong>
              <span>Claims filed</span>
            </div>
          </section>

          <section className="desk-office-summary-grid">
            <article>
              <span>Total claimed</span>
              <strong>{money(summary.amountClaimed)}</strong>
            </article>
            <article>
              <span>Total provided</span>
              <strong>{money(summary.amountProvided)}</strong>
            </article>
            <article>
              <span>Outstanding</span>
              <strong>{money(summary.outstandingAmount)}</strong>
            </article>
          </section>

          <section className="desk-office-layout">
            <form className="setup-form" onSubmit={handleSubmit}>
              <div className="panel-title">
                <div>
                  <h2>{editingClaim ? "Edit Claim" : "File Claim"}</h2>
                  <p>{editingClaim ? editingClaim.claimNumber : "Choose insurance and enter the claim amount."}</p>
                </div>
                <FiSave />
              </div>

              <label>
                Insurance
                <select
                  value={form.insuranceProviderId}
                  onChange={(event) => updateField("insuranceProviderId", event.target.value)}
                  required
                >
                  <option value="">Select insurance</option>
                  {activeProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedProvider && (
                <div className="desk-office-provider-note">
                  <span>{selectedProvider.code || "INSURANCE"}</span>
                  <strong>{selectedProvider.patientPayPercentage ?? 0}% patient pay</strong>
                </div>
              )}

              <div className="form-grid">
                <label>
                  Amount claimed
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amountClaimed}
                    onChange={(event) => updateField("amountClaimed", event.target.value)}
                    placeholder="0"
                    required
                  />
                </label>
                <label>
                  Amount provided
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amountProvided}
                    onChange={(event) => updateField("amountProvided", event.target.value)}
                    placeholder="0"
                  />
                </label>
                <label>
                  Claim date
                  <input
                    type="date"
                    value={form.claimDate}
                    onChange={(event) => updateField("claimDate", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Provided date
                  <input
                    type="date"
                    value={form.providedDate}
                    onChange={(event) => updateField("providedDate", event.target.value)}
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Approval number, contact person, or claim note"
                />
              </label>

              <div className="desk-office-balance">
                <span>Balance</span>
                <strong>
                  {money(Number(form.amountClaimed || 0) - Number(form.amountProvided || 0))}
                </strong>
              </div>

              {error && <p className="registration-error">{error}</p>}
              {success && <p className="security-success">{success}</p>}

              <div className="setup-actions">
                {editingClaim && (
                  <button type="button" className="icon-text-btn" onClick={() => resetForm()}>
                    Cancel
                  </button>
                )}
                <button
                  className="registration-submit"
                  type="submit"
                  disabled={saving || (editingClaim ? !canUpdate : !canCreate)}
                >
                  {saving ? "Saving..." : editingClaim ? "Save Claim" : "Record Claim"}
                  <FiCheckCircle />
                </button>
              </div>
            </form>

            <section className="setup-list-panel">
              <div className="setup-list-header desk-office-filter">
                <div className="patient-search-control">
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadData();
                    }}
                    placeholder="Search claim number or notes"
                  />
                </div>
                <select
                  value={providerFilter}
                  onChange={(event) => setProviderFilter(event.target.value)}
                >
                  <option value="">All insurance</option>
                  {activeProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  aria-label="To date"
                />
                <button type="button" className="icon-text-btn" onClick={loadData}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {loading && <p className="muted-text">Loading claims...</p>}
              {!loading && claims.length === 0 && <p className="muted-text">No claims found.</p>}

              <div className="desk-office-claim-list">
                {claims.map((claim) => (
                  <article className="desk-office-claim-card" key={claim.id}>
                    <div>
                      <div className="setup-provider-title">
                        <strong>{claim.claimNumber}</strong>
                        <span className="patient-status-badge active">
                          {claim.insuranceProvider?.name ?? "Insurance"}
                        </span>
                      </div>
                      <p>{claim.notes || "No notes added."}</p>
                      <div className="setup-provider-meta">
                        <span>Claimed {formatDate(claim.claimDate)}</span>
                        <span>Provided {formatDate(claim.providedDate)}</span>
                        <span>
                          By{" "}
                          {claim.recordedBy
                            ? `${claim.recordedBy.firstName} ${claim.recordedBy.lastName}`
                            : "System"}
                        </span>
                      </div>
                    </div>
                    <div className="desk-office-claim-money">
                      <span>
                        <small>Claimed</small>
                        <strong>{money(claim.amountClaimed)}</strong>
                      </span>
                      <span>
                        <small>Provided</small>
                        <strong>{money(claim.amountProvided)}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="icon-text-btn"
                      onClick={() => startEdit(claim)}
                      disabled={!canUpdate}
                    >
                      <FiEdit3 />
                      Edit
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="desk-office-provider-grid" aria-label="Insurance provider claim totals">
            {(dashboard?.providerSummary ?? []).map((provider) => (
              <article key={provider.insuranceProviderId}>
                <span>{provider.insuranceProvider?.name ?? "Insurance"}</span>
                <strong>{money(provider.outstandingAmount)}</strong>
                <small>
                  {provider.totalClaims} claims | {money(provider.amountProvided)} provided
                </small>
              </article>
            ))}
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
