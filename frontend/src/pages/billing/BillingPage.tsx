import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiCreditCard,
  FiRefreshCw,
  FiSave,
  FiSearch,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import {
  createPatientBill,
  fetchPatientBills,
} from "../../services/billingService";
import { fetchPatients } from "../../services/patients/patientService";
import { fetchHospitalServices } from "../../services/setupService";
import {
  BillPaymentStatus,
  PatientBill,
  PatientBillFormValues,
} from "../../types/billing";
import { Patient } from "../../types/patient";
import { HospitalService } from "../../types/setup";
import { useAuthStore } from "../../store/authStore";

const emptyForm: PatientBillFormValues = {
  patientId: "",
  serviceId: "",
  quantity: "1",
  unitPrice: "0",
  amountPaid: "0",
  paymentStatus: "pending",
  notes: "",
};

function money(value?: number | string | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function patientName(patient: Patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

export default function BillingPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("billing.create");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<HospitalService[]>([]);
  const [bills, setBills] = useState<PatientBill[]>([]);
  const [form, setForm] = useState<PatientBillFormValues>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BillPaymentStatus | "all">("all");
  const [summary, setSummary] = useState({
    pendingAmount: 0,
    paidAmount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === form.serviceId),
    [form.serviceId, services]
  );

  const totalAmount = useMemo(
    () => Number(form.quantity || 1) * Number(form.unitPrice || 0),
    [form.quantity, form.unitPrice]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [patientResult, serviceResult, billResult] = await Promise.all([
      fetchPatients(),
      fetchHospitalServices(),
      fetchPatientBills({ search, paymentStatus: statusFilter }),
    ]);

    setLoading(false);

    if (!patientResult || !serviceResult.services || !billResult.result) {
      setError("Unable to load billing data.");
      return;
    }

    setPatients(patientResult);
    setServices(serviceResult.services.filter((service) => service.isActive));
    setBills(billResult.result.items);
    setSummary({
      pendingAmount: Number(billResult.result.summary.pendingAmount ?? 0),
      paidAmount: Number(billResult.result.summary.paidAmount ?? 0),
    });
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateField = (
    field: keyof PatientBillFormValues,
    value: string
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((item) => item.id === serviceId);

    setForm((current) => ({
      ...current,
      serviceId,
      unitPrice: String(service?.price ?? 0),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await createPatientBill(form);
    setSaving(false);

    if (!result.bill) {
      setError(result.error ?? "Unable to create patient bill.");
      return;
    }

    setSuccess(`Bill ${result.bill.invoiceNumber} created.`);
    setForm(emptyForm);
    await loadData();
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="billing-page">
          <section className="setup-hero">
            <div>
              <p className="eyebrow">Billing</p>
              <h1>Patient Billing</h1>
              <p>Select a patient, choose the service received, and record the charge.</p>
            </div>
            <div className="billing-summary-grid">
              <span>
                <strong>{bills.length}</strong>
                <small>Bills</small>
              </span>
              <span>
                <strong>{money(summary.pendingAmount)}</strong>
                <small>Pending</small>
              </span>
              <span>
                <strong>{money(summary.paidAmount)}</strong>
                <small>Paid</small>
              </span>
            </div>
          </section>

          <section className="billing-layout">
            <form className="setup-form" onSubmit={handleSubmit}>
              <div className="panel-title">
                <div>
                  <h2>Create Bill</h2>
                  <p>Use the service catalog amount or adjust it.</p>
                </div>
                <FiCreditCard />
              </div>

              <label>
                Patient
                <select
                  value={form.patientId}
                  onChange={(event) => updateField("patientId", event.target.value)}
                  required
                >
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patientName(patient)} {patient.mrn ? `(${patient.mrn})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Service received
                <select
                  value={form.serviceId}
                  onChange={(event) => handleServiceChange(event.target.value)}
                  required
                >
                  <option value="">Select service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedService && (
                <div className="service-price-note">
                  <span>{selectedService.code || "SERVICE"}</span>
                  <strong>{money(selectedService.price)}</strong>
                </div>
              )}

              <div className="form-grid">
                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(event) => updateField("quantity", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Unit amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={(event) => updateField("unitPrice", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Amount paid
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amountPaid}
                    onChange={(event) => updateField("amountPaid", event.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={form.paymentStatus}
                    onChange={(event) => updateField("paymentStatus", event.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>

              <label>
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Optional billing note"
                />
              </label>

              <div className="billing-total">
                <span>Total</span>
                <strong>{money(totalAmount)}</strong>
              </div>

              {error && <p className="registration-error">{error}</p>}
              {success && <p className="security-success">{success}</p>}

              <button className="registration-submit" type="submit" disabled={saving || !canCreate}>
                {saving ? "Saving..." : "Create Bill"}
                <FiSave />
              </button>
            </form>

            <section className="setup-list-panel">
              <div className="setup-list-header">
                <div className="patient-search-control">
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadData();
                    }}
                    placeholder="Search bills"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as BillPaymentStatus | "all")}
                >
                  <option value="all">All bills</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button type="button" className="icon-text-btn" onClick={loadData}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {loading && <p className="muted-text">Loading bills...</p>}
              {!loading && bills.length === 0 && <p className="muted-text">No bills found.</p>}

              <div className="billing-list">
                {bills.map((bill) => (
                  <article className="billing-card" key={bill.id}>
                    <div>
                      <div className="setup-provider-title">
                        <strong>{bill.invoiceNumber}</strong>
                        <span className={`patient-status-badge ${bill.paymentStatus === "paid" ? "active" : "inactive"}`}>
                          {bill.paymentStatus}
                        </span>
                      </div>
                      <p>{patientName(bill.patient)} | {bill.service.name}</p>
                      <small>{bill.patient.mrn || "No MRN"}</small>
                    </div>
                    <strong>{money(bill.totalAmount)}</strong>
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
