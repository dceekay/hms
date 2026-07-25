import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiEdit3, FiPlus, FiRefreshCw, FiSave, FiSearch, FiShield, FiSlash } from "react-icons/fi";
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
    await loadProviders(search);
  };

  const startEdit = (provider: InsuranceProvider) => {
    setEditingProvider(provider);
    setForm(providerToForm(provider));
    setSuccess(null);
    setError(null);
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

          <section className="setup-layout">
            <form className="setup-form" onSubmit={handleSubmit}>
              <div className="panel-title">
                <div>
                  <h2>{editingProvider ? "Edit Provider" : "Add Provider"}</h2>
                  <p>{editingProvider ? editingProvider.name : "Create insurance options for registration."}</p>
                </div>
                <FiPlus />
              </div>

              <div className="form-grid">
                <label>
                  Provider name
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Hygeia HMO"
                    required
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
                  rows={4}
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

              {error && <p className="registration-error">{error}</p>}
              {success && <p className="security-success">{success}</p>}

              <div className="setup-actions">
                {editingProvider && (
                  <button type="button" className="icon-text-btn" onClick={resetForm}>
                    Cancel
                  </button>
                )}
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

            <section className="setup-list-panel">
              <div className="setup-list-header">
                <div className="patient-search-control">
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void loadProviders(search);
                      }
                    }}
                    placeholder="Search provider"
                  />
                </div>
                <button type="button" className="icon-text-btn" onClick={() => loadProviders(search)}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {loading && <p className="muted-text">Loading insurance providers...</p>}
              {!loading && providers.length === 0 && <p className="muted-text">No providers found.</p>}

              <div className="setup-provider-list">
                {providers.map((provider) => (
                  <article key={provider.id} className="setup-provider-card">
                    <div>
                      <div className="setup-provider-title">
                        <strong>{provider.name}</strong>
                        <span className={`patient-status-badge ${provider.isActive ? "active" : "inactive"}`}>
                          {provider.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p>{provider.description || "No notes added."}</p>
                      <div className="setup-provider-meta">
                        <span>{provider.code || "No code"}</span>
                        <span>{Number(provider.patientPayPercentage ?? 0)}% patient pays</span>
                        <span>{provider.email || "No email"}</span>
                        <span>{provider.phone || "No phone"}</span>
                      </div>
                    </div>

                    <div className="patient-row-actions">
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
