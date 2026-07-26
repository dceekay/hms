import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiEdit3,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSlash,
  FiTool,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import {
  createHospitalService,
  deactivateHospitalService,
  fetchHospitalServices,
  updateHospitalService,
} from "../../services/setupService";
import { useAuthStore } from "../../store/authStore";
import {
  HospitalService,
  HospitalServiceFormValues,
} from "../../types/setup";

const emptyForm: HospitalServiceFormValues = {
  name: "",
  code: "",
  description: "",
  price: "0",
  isActive: true,
};

function money(value?: number | string | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function serviceToForm(service: HospitalService): HospitalServiceFormValues {
  return {
    name: service.name ?? "",
    code: service.code ?? "",
    description: service.description ?? "",
    price: String(service.price ?? 0),
    isActive: service.isActive,
  };
}

export default function HospitalServicesPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("setup.create");
  const canUpdate = permissions.includes("setup.update");
  const canDelete = permissions.includes("setup.delete");

  const [services, setServices] = useState<HospitalService[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<HospitalServiceFormValues>(emptyForm);
  const [editingService, setEditingService] = useState<HospitalService | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const summary = useMemo(
    () => ({
      active: services.filter((service) => service.isActive).length,
      paid: services.filter((service) => Number(service.price ?? 0) > 0).length,
    }),
    [services]
  );

  const loadServices = async (searchTerm = search) => {
    setLoading(true);
    setError(null);
    const { services: result, error: fetchError } = await fetchHospitalServices({
      search: searchTerm,
    });
    setLoading(false);

    if (!result) {
      setError(fetchError ?? "Unable to load hospital services.");
      return;
    }

    setServices(result);
  };

  useEffect(() => {
    void loadServices("");
  }, []);

  const updateField = (
    field: keyof HospitalServiceFormValues,
    value: string | boolean
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingService(null);
    setError(null);
    setSuccess(null);
  };

  const startEdit = (service: HospitalService) => {
    setEditingService(service);
    setForm(serviceToForm(service));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = editingService
      ? await updateHospitalService(editingService.id, form)
      : await createHospitalService(form);

    setSaving(false);

    if (!result.service) {
      setError(result.error ?? "Unable to save hospital service.");
      return;
    }

    setSuccess(editingService ? "Service updated." : "Service added.");
    resetForm();
    await loadServices(search);
  };

  const handleDeactivate = async (service: HospitalService) => {
    if (!window.confirm(`Deactivate ${service.name}?`)) return;

    const result = await deactivateHospitalService(service.id);

    if (!result.success) {
      setError(result.error ?? "Unable to deactivate hospital service.");
      return;
    }

    setSuccess("Service deactivated.");
    await loadServices(search);
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="setup-page">
          <section className="setup-hero">
            <div>
              <p className="eyebrow">Admin Setup</p>
              <h1>Hospital Services</h1>
              <p>Manage service areas, billing options, and default charges.</p>
            </div>
            <div className="setup-summary">
              <FiTool />
              <strong>{summary.active}</strong>
              <span>Active services</span>
            </div>
          </section>

          <section className="setup-layout">
            <form className="setup-form" onSubmit={handleSubmit}>
              <div className="panel-title">
                <div>
                  <h2>{editingService ? "Edit Service" : "Add Service"}</h2>
                  <p>{editingService ? editingService.name : "Create a service for staff and billing."}</p>
                </div>
                <FiPlus />
              </div>

              <div className="form-grid">
                <label>
                  Service name
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Consultation"
                    required
                  />
                </label>
                <label>
                  Code
                  <input
                    value={form.code}
                    onChange={(event) => updateField("code", event.target.value.toUpperCase())}
                    placeholder="CONS"
                  />
                </label>
                <label>
                  Default amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) => updateField("price", event.target.value)}
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  rows={4}
                  placeholder="Short description for staff and reports"
                />
              </label>

              <label className="setup-toggle">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateField("isActive", event.target.checked)}
                />
                Active service
              </label>

              {error && <p className="registration-error">{error}</p>}
              {success && <p className="security-success">{success}</p>}

              <div className="setup-actions">
                {editingService && (
                  <button type="button" className="icon-text-btn" onClick={resetForm}>
                    Cancel
                  </button>
                )}
                <button
                  className="registration-submit"
                  type="submit"
                  disabled={saving || (editingService ? !canUpdate : !canCreate)}
                >
                  {saving ? "Saving..." : editingService ? "Save Service" : "Add Service"}
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
                      if (event.key === "Enter") void loadServices(search);
                    }}
                    placeholder="Search service"
                  />
                </div>
                <button type="button" className="icon-text-btn" onClick={() => loadServices(search)}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {loading && <p className="muted-text">Loading services...</p>}
              {!loading && services.length === 0 && <p className="muted-text">No services found.</p>}

              <div className="setup-provider-list">
                {services.map((service) => (
                  <article key={service.id} className="setup-provider-card">
                    <div>
                      <div className="setup-provider-title">
                        <strong>{service.name}</strong>
                        <span className={`patient-status-badge ${service.isActive ? "active" : "inactive"}`}>
                          {service.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p>{service.description || "No notes added."}</p>
                      <div className="setup-provider-meta">
                        <span>{service.code || "No code"}</span>
                        <span>{money(service.price)}</span>
                      </div>
                    </div>

                    <div className="patient-row-actions">
                      {canUpdate && (
                        <button type="button" className="icon-text-btn" onClick={() => startEdit(service)}>
                          <FiEdit3 />
                          Edit
                        </button>
                      )}
                      {canDelete && service.isActive && (
                        <button type="button" className="icon-text-btn danger" onClick={() => handleDeactivate(service)}>
                          <FiSlash />
                          Deactivate
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <p className="muted-text">{summary.paid} service(s) currently have default charges.</p>
            </section>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
