import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiEdit3, FiPlus, FiRefreshCw, FiSave, FiSearch, FiShield, FiSlash, FiX } from "react-icons/fi";
import InsuranceProviderChip from "../../components/insurance/InsuranceProviderChip";
import AdminLayout from "../../layouts/AdminLayout";
import {
  createInsuranceProvider,
  deactivateInsuranceProvider,
  fetchInsuranceProviders,
  updateInsuranceProvider,
} from "../../services/setupService";
import { useAuthStore } from "../../store/authStore";
import { InsuranceProvider, InsuranceProviderFormValues } from "../../types/setup";

const emptyForm: InsuranceProviderFormValues = {
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  description: "",
  patientPayPercentage: "0",
  isActive: true,
};

function providerToForm(provider: InsuranceProvider): InsuranceProviderFormValues {
  const payPercentage =
    provider.patientPayPercentage === null || provider.patientPayPercentage === undefined
      ? "0"
      : String(provider.patientPayPercentage);

  return {
    name: provider.name ?? "",
    code: provider.code ?? "",
    email: provider.email ?? "",
    phone: provider.phone ?? "",
    address: provider.address ?? "",
    description: provider.description ?? "",
    patientPayPercentage: payPercentage,
    isActive: provider.isActive,
  };
}

export default function InsuranceProvidersPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("setup.create");
  const canUpdate = permissions.includes("setup.update");
  const canDelete = permissions.includes("setup.delete");

  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<InsuranceProviderFormValues>(emptyForm);
  const [editingProvider, setEditingProvider] = useState<InsuranceProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeCount = useMemo(() => providers.filter((provider) => provider.isActive).length, [providers]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const loadProviders = async (searchTerm = search) => {
    setLoading(true);
    setError(null);
    const { providers: result, error: fetchError } = await fetchInsuranceProviders({ search: searchTerm });
    setLoading(false);

    if (!result) {
      setError(fetchError ?? "Unable to load insurance providers.");
      return;
    }

    setProviders(result);
  };

  useEffect(() => {
    void loadProviders("");
  }, []);

  const updateField = (field: keyof InsuranceProviderFormValues, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProvider(null);
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = editingProvider
      ? await updateInsuranceProvider(editingProvider.id, form)
      : await createInsuranceProvider(form);

    setSaving(false);

    if (!result.provider) {
      setError(result.error ?? "Unable to save insurance provider.");
      return;
    }

    setSuccess(editingProvider ? "Insurance provider updated." : "Insurance provider added.");
    setForm(emptyForm);
    setEditingProvider(null);
    setIsModalOpen(false);
    await loadProviders(search);
  };

  const startEdit = (provider: InsuranceProvider) => {
    setEditingProvider(provider);
    setForm(providerToForm(provider));
    setSuccess(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDeactivate = async (provider: InsuranceProvider) => {
    if (!window.confirm(`Deactivate ${provider.name}?`)) return;

    setError(null);
    setSuccess(null);
    const result = await deactivateInsuranceProvider(provider.id);

    if (!result.success) {
      setError(result.error ?? "Unable to deactivate insurance provider.");
      return;
    }

    setSuccess("Insurance provider deactivated.");
    await loadProviders(search);
  };

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (statusFilter === "active") return p.isActive;
      if (statusFilter === "inactive") return !p.isActive;
      return true;
    });
  }, [providers, statusFilter]);

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="setup-page">
          <section className="setup-hero">
            <div>
              <p className="eyebrow">Admin Setup</p>
              <h1>Insurance Providers</h1>
              <p>Maintain approved insurance organizations for patient billing and future claim workflows.</p>
            </div>
            <div className="setup-summary">
              <FiShield />
              <strong>{activeCount}</strong>
              <span>Active providers</span>
            </div>
          </section>

          {error && <p className="registration-error" style={{ margin: "0.5rem 0" }}>{error}</p>}
          {success && <p className="security-success" style={{ margin: "0.5rem 0" }}>{success}</p>}

          {/* FULL WIDTH TABLE VIEW */}
          <section className="hms-table-view">
            <div className="table-topbar">
              <div className="table-topbar-left">
                <div className="patient-search-control" style={{ minWidth: "260px" }}>
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadProviders(search);
                    }}
                    placeholder="Search provider name or code..."
                  />
                  {search && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => {
                        setSearch("");
                        void loadProviders("");
                      }}
                      title="Clear search"
                    >
                      <FiX />
                    </button>
                  )}
                </div>

                <div className="table-filter-pills">
                  <button
                    type="button"
                    className={`table-filter-pill ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    All ({providers.length})
                  </button>
                  <button
                    type="button"
                    className={`table-filter-pill ${statusFilter === "active" ? "active" : ""}`}
                    onClick={() => setStatusFilter("active")}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    type="button"
                    className={`table-filter-pill ${statusFilter === "inactive" ? "active" : ""}`}
                    onClick={() => setStatusFilter("inactive")}
                  >
                    Inactive ({providers.length - activeCount})
                  </button>
                </div>
              </div>

              <div className="table-topbar-right">
                <button type="button" className="icon-text-btn" onClick={() => loadProviders(search)}>
                  <FiRefreshCw />
                  Refresh
                </button>
                {canCreate && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      resetForm();
                      setIsModalOpen(true);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FiPlus /> Add Insurance Provider
                  </button>
                )}
              </div>
            </div>

            {loading && <p className="muted-text" style={{ padding: "1.5rem" }}>Loading insurance providers...</p>}
            {!loading && filteredProviders.length === 0 && (
              <p className="muted-text" style={{ padding: "1.5rem" }}>No providers found.</p>
            )}

            {!loading && filteredProviders.length > 0 && (
              <div className="table-scroll-container">
                <table className="hms-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "32%" }}>Provider Name & Details</th>
                      <th style={{ width: "12%" }}>Code</th>
                      <th style={{ width: "14%" }}>Patient Pays</th>
                      <th style={{ width: "22%" }}>Contact Info</th>
                      <th style={{ width: "10%" }}>Status</th>
                      <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProviders.map((provider) => (
                      <tr key={provider.id}>
                        <td>
                          <div className="cell-primary" style={{ fontSize: "0.95rem" }}>{provider.name}</div>
                          {provider.description && (
                            <div className="cell-muted" style={{ marginTop: "2px" }}>
                              {provider.description}
                            </div>
                          )}
                          {provider.address && (
                            <div className="cell-muted" style={{ fontSize: "0.75rem" }}>
                              📍 {provider.address}
                            </div>
                          )}
                        </td>
                        <td>
                          <InsuranceProviderChip
                            name={provider.name}
                            code={provider.code}
                            compact
                          />
                        </td>
                        <td>
                          <strong style={{ fontSize: "0.95rem" }}>{Number(provider.patientPayPercentage ?? 0)}%</strong>
                          <div className="cell-muted" style={{ fontSize: "0.72rem" }}>
                            HMO covers {100 - Number(provider.patientPayPercentage ?? 0)}%
                          </div>
                        </td>
                        <td>
                          <div>{provider.phone || "—"}</div>
                          <div className="cell-muted">{provider.email || "No email"}</div>
                        </td>
                        <td>
                          <span className={`patient-status-badge ${provider.isActive ? "active" : "inactive"}`}>
                            {provider.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="cell-actions">
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            {canUpdate && (
                              <button type="button" className="icon-text-btn" onClick={() => startEdit(provider)}>
                                <FiEdit3 />
                                Edit
                              </button>
                            )}
                            {canDelete && provider.isActive && (
                              <button type="button" className="icon-text-btn danger" onClick={() => handleDeactivate(provider)}>
                                <FiSlash />
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ADD / EDIT INSURANCE PROVIDER MODAL */}
          {isModalOpen && (
            <div className="hms-modal-overlay" role="dialog" aria-modal="true">
              <div className="hms-modal-window">
                <div className="hms-modal-header">
                  <div>
                    <h2>{editingProvider ? "Edit Insurance Provider" : "Add Insurance Provider"}</h2>
                    <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                      {editingProvider ? editingProvider.name : "Create insurance options for patient registration."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="hms-modal-close-btn"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    title="Close"
                  >
                    <FiX />
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-grid">
                    <label>
                      Provider name
                      <input
                        value={form.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        placeholder="e.g. Hygeia HMO"
                        required
                        autoFocus
                      />
                    </label>
                    <label>
                      Code
                      <input
                        value={form.code}
                        onChange={(event) => updateField("code", event.target.value)}
                        placeholder="HYG"
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        placeholder="claims@example.com"
                      />
                    </label>
                    <label>
                      Phone
                      <input
                        value={form.phone}
                        onChange={(event) => updateField("phone", event.target.value)}
                        placeholder="+234..."
                      />
                    </label>
                    <label>
                      Patient pays (%)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.patientPayPercentage}
                        onChange={(event) => updateField("patientPayPercentage", event.target.value)}
                        placeholder="20"
                      />
                    </label>
                  </div>

                  <label>
                    Address
                    <input
                      value={form.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      placeholder="Office address"
                    />
                  </label>

                  <label>
                    Notes
                    <textarea
                      value={form.description}
                      onChange={(event) => updateField("description", event.target.value)}
                      rows={3}
                      placeholder="Coverage notes, contact desk, or claim instructions"
                    />
                  </label>

                  <label className="setup-toggle">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => updateField("isActive", event.target.checked)}
                    />
                    Active provider
                  </label>

                  <div className="setup-actions" style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="icon-text-btn"
                      onClick={() => {
                        setIsModalOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="registration-submit"
                      type="submit"
                      disabled={saving || (editingProvider ? !canUpdate : !canCreate)}
                    >
                      {saving ? "Saving..." : editingProvider ? "Save Provider" : "Add Provider"}
                      <FiSave />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
