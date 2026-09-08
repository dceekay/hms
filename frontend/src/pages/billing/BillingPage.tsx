import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiCreditCard,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiCheckCircle,
  FiDollarSign,
  FiClock,
  FiUser,
  FiFileText,
  FiList,
  FiX,
  FiCheck,
  FiArrowRight,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import PatientSearchSelect from "../../components/common/PatientSearchSelect";
import BillingReceiptModal from "../../components/billing/BillingReceiptModal";
import {
  createPatientBill,
  fetchPatientBills,
} from "../../services/billingService";
import { fetchPatients, getCachedPatients } from "../../services/patients/patientService";
import { fetchHospitalServices } from "../../services/setupService";
import {
  BillPaymentStatus,
  PatientBill,
  PatientBillFormValues,
} from "../../types/billing";
import { Patient } from "../../types/patient";
import { HospitalService } from "../../types/setup";
import { useAuthStore } from "../../store/authStore";
import { confirmImportantAction, showSuccessWithSound } from "../../utils/sweetAlert";
import "../../styles/billing-studio.css";

const emptyForm: PatientBillFormValues = {
  patientId: "",
  serviceId: "",
  quantity: "1",
  unitPrice: "0",
  amountPaid: "0",
  paymentStatus: "pending",
  notes: "",
};

// Common hospital billing presets for rapid 1-click cashier selection
const commonBillingPresets = [
  { label: "OPD Consultation", price: 5000, code: "CONS" },
  { label: "Cardiology Review", price: 15000, code: "CARD" },
  { label: "12-Lead ECG", price: 7500, code: "ECG" },
  { label: "Echocardiogram (Echo)", price: 25000, code: "ECHO" },
  { label: "Full Blood Count (FBC)", price: 4500, code: "LAB-FBC" },
  { label: "Malaria Parasite (MP)", price: 2000, code: "LAB-MP" },
  { label: "Ultrasound & ECG Scan", price: 12500, code: "SCAN-ECG" },
  { label: "X-Ray Examination", price: 10000, code: "RAD" },
  { label: "Admission Deposit", price: 30000, code: "ADM" },
  { label: "Antenatal (ANC) Package", price: 8000, code: "ANC" },
  { label: "Wound Dressing & Nursing", price: 3500, code: "DRESS" },
  { label: "Major Surgery & Theatre", price: 85000, code: "SURG-TH" },
];

// Standard Outpatient Presets ensuring cashier quick-select is always available
const DEFAULT_BILLING_PATIENTS: Patient[] = [
  {
    id: "pat-walkin-opd",
    mrn: "CVD-OPD-001",
    firstName: "General",
    lastName: "Outpatient (Walk-in)",
    gender: "other",
    dateOfBirth: "1990-01-01",
    patientCategory: "new_patient",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "pat-emergency-triage",
    mrn: "CVD-ER-002",
    firstName: "Emergency",
    lastName: "Triage Patient",
    gender: "other",
    dateOfBirth: "1992-06-15",
    patientCategory: "new_patient",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "pat-cardiology-clinic",
    mrn: "CVD-CARD-003",
    firstName: "Cardiology",
    lastName: "Consultation Patient",
    gender: "male",
    dateOfBirth: "1985-08-20",
    patientCategory: "new_patient",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "pat-anc-maternal",
    mrn: "CVD-ANC-004",
    firstName: "Antenatal",
    lastName: "Maternal Care",
    gender: "female",
    dateOfBirth: "1996-03-10",
    patientCategory: "new_patient",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "pat-lab-investigation",
    mrn: "CVD-LAB-005",
    firstName: "Laboratory",
    lastName: "Investigation Walk-in",
    gender: "other",
    dateOfBirth: "1988-11-25",
    patientCategory: "investigation_patient",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "pat-pharmacy-dispense",
    mrn: "CVD-PHARM-006",
    firstName: "Pharmacy",
    lastName: "Direct Dispensing",
    gender: "other",
    dateOfBirth: "1993-09-05",
    patientCategory: "new_patient",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function money(value?: number | string | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function patientName(patient?: Patient | null) {
  if (!patient) return "Patient";
  return `${patient.firstName} ${patient.lastName}`.trim();
}

function calculateAge(dob?: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? `${age} yrs` : "Infant";
}

export default function BillingPage() {
  const permissions = useAuthStore((state) => state.user)?.permissions ?? [];
  const canCreate = permissions.includes("billing.create");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<HospitalService[]>([]);
  const [bills, setBills] = useState<PatientBill[]>([]);
  const [form, setForm] = useState<PatientBillFormValues>(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BillPaymentStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"create" | "ledger">("create");
  const mobileBillingView = activeTab;
  const setMobileBillingView = setActiveTab;
  const [patientSelectMode, setPatientSelectMode] = useState<"search" | "list">("search");
  const [patientDirSearch, setPatientDirSearch] = useState("");
  const [summary, setSummary] = useState({
    pendingAmount: 0,
    paidAmount: 0,
  });
  const [selectedBill, setSelectedBill] = useState<PatientBill | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === form.patientId),
    [form.patientId, patients]
  );

  const totalAmount = useMemo(
    () => Number(form.quantity || 1) * Number(form.unitPrice || 0),
    [form.quantity, form.unitPrice]
  );

  const amountPaidNum = Number(form.amountPaid || 0);
  const balanceRemaining = Math.max(0, totalAmount - amountPaidNum);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [patientResult, serviceResult, billResult] = await Promise.allSettled([
        fetchPatients({ take: 100 }),
        fetchHospitalServices(),
        fetchPatientBills({ search, paymentStatus: statusFilter }),
      ]);

      let loadedPatients: Patient[] = [];
      if (patientResult.status === "fulfilled" && patientResult.value && patientResult.value.length > 0) {
        loadedPatients = patientResult.value;
      } else {
        const cached = getCachedPatients();
        if (cached.length > 0) {
          loadedPatients = cached;
        }
      }

      if (billResult.status === "fulfilled" && billResult.value?.result) {
        setBills(billResult.value.result.items);
        setSummary({
          pendingAmount: Number(billResult.value.result.summary.pendingAmount ?? 0),
          paidAmount: Number(billResult.value.result.summary.paidAmount ?? 0),
        });

        // Also extract unique patients from existing bills if patientResult didn't return many
        const seenIds = new Set(loadedPatients.map((p) => p.id));
        const billPatients: Patient[] = [];
        for (const b of billResult.value.result.items) {
          if (b.patient && b.patient.id && !seenIds.has(b.patient.id)) {
            seenIds.add(b.patient.id);
            billPatients.push(b.patient);
          }
        }
        if (billPatients.length > 0) {
          loadedPatients = [...loadedPatients, ...billPatients];
        }
      }

      // Always guarantee at least the standard outpatient quick presets are available
      if (loadedPatients.length === 0) {
        loadedPatients = DEFAULT_BILLING_PATIENTS;
      } else {
        // Prepend walk-in / OPD presets if not already in system
        const hasWalkin = loadedPatients.some((p) => p.firstName?.toLowerCase().includes("outpatient") || p.lastName?.toLowerCase().includes("outpatient"));
        if (!hasWalkin) {
          loadedPatients = [...DEFAULT_BILLING_PATIENTS.slice(0, 2), ...loadedPatients];
        }
      }
      setPatients(loadedPatients);

      if (serviceResult.status === "fulfilled" && serviceResult.value?.services) {
        const activeServices = serviceResult.value.services
          .filter((service) => service.isActive)
          .sort((a, b) => a.name.localeCompare(b.name));
        setServices(activeServices);
      }
    } catch (err) {
      console.error("Error loading billing data", err);
      const cached = getCachedPatients();
      setPatients(cached.length > 0 ? cached : DEFAULT_BILLING_PATIENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter]);

  const updateField = (
    field: keyof PatientBillFormValues,
    value: string
  ) => {
    setForm((current) => {
      const updated = { ...current, [field]: value };
      if (field === "amountPaid" || field === "unitPrice" || field === "quantity") {
        const qty = Number(field === "quantity" ? value : updated.quantity || 1);
        const price = Number(field === "unitPrice" ? value : updated.unitPrice || 0);
        const paid = Number(field === "amountPaid" ? value : updated.amountPaid || 0);
        const total = qty * price;
        if (paid >= total && total > 0) {
          updated.paymentStatus = "paid";
        } else if (paid > 0) {
          updated.paymentStatus = "pending";
        }
      }
      return updated;
    });
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((item) => item.id === serviceId);

    setForm((current) => {
      const price = Number(service?.price ?? 0);
      const qty = Number(current.quantity || 1);
      const total = qty * price;
      return {
        ...current,
        serviceId,
        unitPrice: String(price),
        amountPaid: String(total),
        paymentStatus: total > 0 ? "paid" : "pending",
      };
    });
  };

  const applyPreset = (preset: typeof commonBillingPresets[0]) => {
    const matchingService = services.find(
      (s) =>
        (preset.code && s.code?.toLowerCase() === preset.code.toLowerCase()) ||
        s.name.toLowerCase().includes(preset.label.toLowerCase()) ||
        preset.label.toLowerCase().includes(s.name.toLowerCase())
    );

    const sId = matchingService?.id || services[0]?.id || "";
    setForm((current) => {
      const qty = Number(current.quantity || 1);
      const total = qty * preset.price;
      return {
        ...current,
        serviceId: sId,
        unitPrice: String(preset.price),
        amountPaid: String(total),
        paymentStatus: "paid",
        notes: `Service: ${preset.label}`,
      };
    });
  };

  const setFullPayment = () => {
    setForm((current) => ({
      ...current,
      amountPaid: String(totalAmount),
      paymentStatus: "paid",
    }));
  };

  const setPartialPayment = () => {
    const half = Math.round(totalAmount / 2);
    setForm((current) => ({
      ...current,
      amountPaid: String(half),
      paymentStatus: "pending",
    }));
  };

  const setUnpaid = () => {
    setForm((current) => ({
      ...current,
      amountPaid: "0",
      paymentStatus: "pending",
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.patientId) {
      setError("Please select a patient first.");
      return;
    }
    if (!form.serviceId && services.length > 0) {
      setError("Please select a hospital service.");
      return;
    }

    const amountVal = Number(form.amountPaid || (Number(form.unitPrice || 0) * Number(form.quantity || 1)));
    const amountFormatted = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amountVal);

    const selPat = patients.find((p) => p.id === form.patientId);
    const patName = selPat ? `${selPat.firstName} ${selPat.lastName}`.trim() : "the patient";

    const confirmed = await confirmImportantAction({
      title: "Confirm Payment Recording?",
      text: `Are you sure you want to confirm this payment of ${amountFormatted} for ${patName}?`,
      confirmButtonText: "Yes, Confirm Payment",
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await createPatientBill(form);
    setSaving(false);

    if (!result.bill) {
      setError(result.error ?? "Unable to create patient bill.");
      return;
    }

    setSuccess(`Bill ${result.bill.invoiceNumber} created and recorded successfully.`);
    void showSuccessWithSound({
      title: "Payment Confirmed & Receipt Ready",
      text: `Invoice #${result.bill.invoiceNumber} • Paid: ${amountFormatted}`,
      timer: 3000,
    });
    // Immediately open print receipt modal
    setSelectedBill(result.bill);
    setForm(emptyForm);
    await loadData();
  };

  const handlePrintBill = (bill: PatientBill) => {
    setSelectedBill(bill);
  };

  const filteredBills = useMemo(() => {
    if (!search.trim()) return bills;
    const q = search.toLowerCase();
    return bills.filter(
      (b) =>
        b.invoiceNumber?.toLowerCase().includes(q) ||
        b.patient?.firstName?.toLowerCase().includes(q) ||
        b.patient?.lastName?.toLowerCase().includes(q) ||
        b.patient?.mrn?.toLowerCase().includes(q) ||
        b.service?.name?.toLowerCase().includes(q)
    );
  }, [bills, search]);

  const filteredPatientsDirectory = useMemo(() => {
    if (!patientDirSearch.trim()) return patients;
    const q = patientDirSearch.toLowerCase();
    return patients.filter(
      (p) =>
        p.firstName?.toLowerCase().includes(q) ||
        p.lastName?.toLowerCase().includes(q) ||
        p.mrn?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q)
    );
  }, [patients, patientDirSearch]);

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="billing-studio-container">
          {/* 1. Top Summary Metrics Strip */}
          <section className="billing-metrics-strip">
            <div className="billing-metric-card">
              <div className="billing-metric-icon total">
                <FiDollarSign />
              </div>
              <div className="billing-metric-data">
                <span className="billing-metric-label">Total Invoices</span>
                <span className="billing-metric-val">{bills.length}</span>
              </div>
            </div>

            <div className="billing-metric-card">
              <div className="billing-metric-icon paid">
                <FiCheckCircle />
              </div>
              <div className="billing-metric-data">
                <span className="billing-metric-label">Total Collected</span>
                <span className="billing-metric-val">{money(summary.paidAmount)}</span>
              </div>
            </div>

            <div className="billing-metric-card">
              <div className="billing-metric-icon pending">
                <FiClock />
              </div>
              <div className="billing-metric-data">
                <span className="billing-metric-label">Pending / Outstanding</span>
                <span className="billing-metric-val">{money(summary.pendingAmount)}</span>
              </div>
            </div>
          </section>

          {/* 2. Workstation Tab Switcher (Universal Desktop & Mobile) */}
          <nav className="billing-workstation-tabs" aria-label="Billing Workstation Views">
            <button
              type="button"
              className={`billing-workstation-tab-btn ${activeTab === "create" ? "active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              <FiCreditCard />
              <span>Issue New Bill</span>
            </button>
            <button
              type="button"
              className={`billing-workstation-tab-btn ${activeTab === "ledger" ? "active" : ""}`}
              onClick={() => setActiveTab("ledger")}
            >
              <FiFileText />
              <span>Invoices & Receipts ({bills.length})</span>
            </button>
          </nav>

          {/* 3. Main Workstation Layout */}
          <section className={`billing-studio-grid view-${activeTab}`}>
            {/* Create & Issue Bill Workstation */}
            <div className="billing-form-card">
              <div className="billing-form-header">
                <div>
                  <h2>Create & Issue Bill</h2>
                  <p>Point-of-sale hospital billing & receipt generation</p>
                </div>
                <span className="billing-step-badge">Cashier Desk</span>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {/* 1. Patient Selection with Live Search & Directory List */}
                <div>
                  <div className="billing-patient-mode-row">
                    <label style={{ margin: 0, fontWeight: 750, fontSize: "0.84rem", color: "var(--text-strong)" }}>
                      Patient <span style={{ color: "var(--danger)" }}>*</span>
                    </label>

                    <div className="billing-patient-mode-pills">
                      <button
                        type="button"
                        className={`billing-patient-mode-btn ${patientSelectMode === "search" ? "active" : ""}`}
                        onClick={() => setPatientSelectMode("search")}
                      >
                        <FiSearch /> Live Search
                      </button>
                      <button
                        type="button"
                        className={`billing-patient-mode-btn ${patientSelectMode === "list" ? "active" : ""}`}
                        onClick={() => setPatientSelectMode("list")}
                      >
                        <FiList /> Directory ({patients.length})
                      </button>
                    </div>
                  </div>

                  {/* Mode A: Live Search Bar */}
                  {patientSelectMode === "search" && (
                    <PatientSearchSelect
                      patients={patients}
                      selectedPatientId={form.patientId}
                      onSelectPatient={(p) => updateField("patientId", p?.id || "")}
                      placeholder="Search by name, MRN (CVD-...), or phone..."
                    />
                  )}

                  {/* Mode B: Patient Directory List */}
                  {patientSelectMode === "list" && (
                    <div className="billing-patient-dir-box">
                      <div style={{ position: "relative", marginBottom: "0.2rem" }}>
                        <FiSearch style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                        <input
                          type="text"
                          value={patientDirSearch}
                          onChange={(e) => setPatientDirSearch(e.target.value)}
                          placeholder="Filter directory by name, MRN, phone..."
                          style={{
                            width: "100%",
                            padding: "0.45rem 0.5rem 0.45rem 2rem",
                            borderRadius: "7px",
                            border: "1px solid var(--border)",
                            background: "var(--surface)",
                            color: "var(--text-strong)",
                            fontSize: "0.8rem",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "150px", overflowY: "auto" }}>
                        {filteredPatientsDirectory.map((p) => {
                          const isSelected = form.patientId === p.id;
                          return (
                            <div
                              key={p.id}
                              className={`billing-patient-dir-item ${isSelected ? "selected" : ""}`}
                              onClick={() => updateField("patientId", p.id)}
                            >
                              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <strong style={{ fontSize: "0.84rem", color: "var(--text-strong)" }}>
                                  {p.firstName} {p.lastName}
                                </strong>
                                <small style={{ color: "var(--muted)", fontSize: "0.74rem" }}>
                                  MRN: <strong>{p.mrn || "N/A"}</strong> • {p.gender.toUpperCase()} • {calculateAge(p.dateOfBirth)}
                                </small>
                              </div>

                              <button
                                type="button"
                                className={`billing-patient-chip-btn ${isSelected ? "is-active" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateField("patientId", p.id);
                                }}
                              >
                                {isSelected ? <><FiCheck /> Selected</> : "Select"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected Patient Banner */}
                  {selectedPatient && (
                    <div className="billing-patient-card-selected">
                      <div className="billing-patient-card-info">
                        <div className="billing-patient-avatar">
                          {selectedPatient.firstName.charAt(0)}{selectedPatient.lastName.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "0.95rem", color: "var(--text-strong)" }}>
                              {patientName(selectedPatient)}
                            </strong>
                            <span className="billing-invoice-card-badge">
                              {selectedPatient.mrn || "MRN N/A"}
                            </span>
                          </div>
                          <p style={{ margin: "2px 0 0 0", fontSize: "0.76rem", color: "var(--muted)" }}>
                            {selectedPatient.gender.toUpperCase()} • {calculateAge(selectedPatient.dateOfBirth)} • {selectedPatient.phone || "No phone"} {selectedPatient.bloodGroup ? `• Blood: ${selectedPatient.bloodGroup}` : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateField("patientId", "")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--danger)",
                          cursor: "pointer",
                          padding: "0.3rem",
                          borderRadius: "6px",
                          display: "inline-flex",
                          alignItems: "center",
                          fontSize: "1.1rem",
                        }}
                        title="Deselect patient"
                      >
                        <FiX />
                      </button>
                    </div>
                  )}

                  {/* Quick Select Patient Chips (Always Visible) */}
                  <div className="billing-quick-patient-section">
                    <div className="billing-quick-patient-header">
                      <span className="billing-quick-patient-label">
                        <FiUser /> Quick Select Patient:
                      </span>
                      {selectedPatient && (
                        <span className="billing-quick-selected-tag">
                          Active: <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
                        </span>
                      )}
                    </div>
                    <div className="billing-quick-patient-chips">
                      {patients.slice(0, 8).map((p) => {
                        const isSelected = form.patientId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`billing-patient-chip-btn ${isSelected ? "is-active" : ""}`}
                            onClick={() => updateField("patientId", p.id)}
                            title={`Click to select ${p.firstName} ${p.lastName} (${p.mrn || "No MRN"})`}
                          >
                            <FiUser />
                            <span className="billing-chip-name">{p.firstName} {p.lastName}</span>
                            {p.mrn && <span className="billing-chip-mrn">({p.mrn})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Quick Charge Presets */}
                <div className="billing-preset-section">
                  <span className="billing-preset-label">Quick Charge Presets</span>
                  <div className="billing-preset-chips">
                    {commonBillingPresets.map((preset) => {
                      const isSelected = form.unitPrice === String(preset.price) && form.notes?.includes(preset.label);
                      return (
                        <button
                          key={preset.code}
                          type="button"
                          className={`billing-preset-chip ${isSelected ? "is-active" : ""}`}
                          onClick={() => applyPreset(preset)}
                          title={`Quick apply ${preset.label} - ${money(preset.price)}`}
                        >
                          <span className="billing-preset-name">{preset.label}</span>
                          <strong className="billing-preset-price">({money(preset.price)})</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Service Catalog Selector */}
                <div>
                  <label className="billing-label">
                    Hospital Service / Procedure <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    value={form.serviceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    required
                    className="billing-select"
                  >
                    <option value="">-- Choose Hospital Service --</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.code || "SVC"}) — {money(service.price)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Quantity & Unit Price */}
                <div className="billing-form-grid-row">
                  <div>
                    <label className="billing-label">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => updateField("quantity", e.target.value)}
                      required
                      className="billing-input"
                    />
                  </div>
                  <div>
                    <label className="billing-label">
                      Unit Price (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={form.unitPrice}
                      onChange={(e) => updateField("unitPrice", e.target.value)}
                      required
                      className="billing-input"
                    />
                  </div>
                </div>

                {/* 5. Live Calculation Box */}
                <div className="billing-calc-card">
                  <div className="billing-calc-header">
                    <span className="billing-calc-header-title">Payment Calculation Breakdown</span>
                    <span className={`billing-calc-badge ${balanceRemaining === 0 ? "cleared" : "pending"}`}>
                      {balanceRemaining === 0 ? "✓ Cleared in Full" : "Pending Balance"}
                    </span>
                  </div>

                  <div className="billing-calc-grid">
                    <div className="billing-calc-row">
                      <span>Subtotal:</span>
                      <strong>{money(totalAmount)}</strong>
                    </div>
                    <div className="billing-calc-row">
                      <span>Amount Paid:</span>
                      <strong>{money(amountPaidNum)}</strong>
                    </div>
                    <div className={`billing-calc-row balance ${balanceRemaining === 0 ? "cleared" : ""}`}>
                      <span>Balance Due:</span>
                      <strong>{money(balanceRemaining)}</strong>
                    </div>
                    <div className="billing-calc-row total">
                      <span>Total Charge:</span>
                      <strong>{money(totalAmount)}</strong>
                    </div>
                  </div>

                  {/* Quick Payment Action Buttons */}
                  <div className="billing-quick-pay-actions">
                    <button
                      type="button"
                      className="billing-quick-pay-btn"
                      onClick={setFullPayment}
                      title="Set paid amount equal to total charge"
                    >
                      ✓ Full Payment
                    </button>
                    <button
                      type="button"
                      className="billing-quick-pay-btn"
                      onClick={setPartialPayment}
                      title="Set 50% deposit"
                    >
                      50% Deposit
                    </button>
                    <button
                      type="button"
                      className="billing-quick-pay-btn"
                      onClick={setUnpaid}
                      title="Mark as pending payment"
                    >
                      Unpaid / Later
                    </button>
                  </div>
                </div>

                {/* 6. Amount Paid & Status */}
                <div className="billing-form-grid-row">
                  <div>
                    <label className="billing-label">
                      Amount Paid (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={form.amountPaid}
                      onChange={(e) => updateField("amountPaid", e.target.value)}
                      className="billing-input"
                    />
                  </div>
                  <div>
                    <label className="billing-label">
                      Payment Status
                    </label>
                    <select
                      value={form.paymentStatus}
                      onChange={(e) => updateField("paymentStatus", e.target.value as BillPaymentStatus)}
                      className="billing-select"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* 7. Notes */}
                <div>
                  <label className="billing-label">
                    Billing Reference / Note
                  </label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="e.g. POS Ref: 893120, Cash received, etc."
                    className="billing-input"
                  />
                </div>

                {error && (
                  <div style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: 700, padding: "0.4rem 0" }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{ color: "#10b981", fontSize: "0.85rem", fontWeight: 700, padding: "0.4rem 0" }}>
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || !canCreate}
                  className="billing-submit-btn"
                >
                  <FiCreditCard />
                  {saving ? "Processing..." : "Generate & Record Bill"}
                </button>
              </form>
            </div>

            {/* Recent Invoices & Receipts Strip (Directly Below The Form) */}
            <div className="billing-recent-tx-section">
              <div className="billing-recent-tx-header">
                <div>
                  <h3>Recent Invoices & Receipts</h3>
                  <p>Newly generated patient bills ready for immediate receipt printing</p>
                </div>
                <button
                  type="button"
                  className="billing-view-ledger-link"
                  onClick={() => setActiveTab("ledger")}
                >
                  <span>Full Ledger ({bills.length})</span>
                  <FiArrowRight />
                </button>
              </div>

              {bills.length === 0 ? (
                <p style={{ color: "var(--muted)", padding: "1.5rem", textAlign: "center", fontSize: "0.86rem" }}>
                  No billing records yet. New bills generated will appear here.
                </p>
              ) : (
                <div className="billing-invoices-stream">
                  {bills.slice(0, 5).map((bill) => (
                    <article key={bill.id} className="billing-invoice-item">
                      <div className="billing-invoice-main">
                        <div className="billing-invoice-num-row">
                          <span className="billing-invoice-num">{bill.invoiceNumber}</span>
                          <span className={`billing-status-tag ${bill.paymentStatus}`}>
                            {bill.paymentStatus}
                          </span>
                        </div>
                        <span className="billing-invoice-patient">
                          {patientName(bill.patient)}
                        </span>
                        <div className="billing-invoice-submeta">
                          <span>{bill.service.name}</span>
                          {bill.patient?.mrn && (
                            <span className="billing-invoice-card-badge">MRN: {bill.patient.mrn}</span>
                          )}
                          <span style={{ fontSize: "0.75rem" }}>
                            {new Date(bill.billedAt).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="billing-invoice-amount-col">
                        <span className="billing-invoice-price">{money(bill.totalAmount)}</span>
                        <button
                          type="button"
                          className="billing-print-action-btn"
                          onClick={() => handlePrintBill(bill)}
                        >
                          <FiPrinter />
                          {bill.paymentStatus === "paid" ? "Print Receipt" : "Print Invoice"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices Ledger Tab */}
            <div className="billing-ledger-card">
              <div className="billing-ledger-header">
                <div>
                  <h2>Invoices & Receipts</h2>
                  <p>Recent billing transactions</p>
                </div>

                <div className="billing-tab-group">
                  <button
                    type="button"
                    className={`billing-tab-btn ${statusFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    All ({bills.length})
                  </button>
                  <button
                    type="button"
                    className={`billing-tab-btn ${statusFilter === "pending" ? "is-active" : ""}`}
                    onClick={() => setStatusFilter("pending")}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    className={`billing-tab-btn ${statusFilter === "paid" ? "is-active" : ""}`}
                    onClick={() => setStatusFilter("paid")}
                  >
                    Paid
                  </button>
                </div>
              </div>

              {/* Search & Refresh Bar */}
              <div className="billing-search-bar">
                <div className="billing-search-input-wrap">
                  <FiSearch />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invoices by number, patient name, MRN..."
                  />
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="billing-refresh-btn"
                >
                  <FiRefreshCw /> Refresh
                </button>
              </div>

              {/* List Stream */}
              {loading && <p style={{ color: "var(--muted)", padding: "1rem" }}>Loading invoices...</p>}
              {!loading && filteredBills.length === 0 && (
                <p style={{ color: "var(--muted)", padding: "2rem", textAlign: "center" }}>
                  No billing records found.
                </p>
              )}

              <div className="billing-invoices-stream">
                {filteredBills.map((bill) => (
                  <article key={bill.id} className="billing-invoice-item">
                    <div className="billing-invoice-main">
                      <div className="billing-invoice-num-row">
                        <span className="billing-invoice-num">{bill.invoiceNumber}</span>
                        <span className={`billing-status-tag ${bill.paymentStatus}`}>
                          {bill.paymentStatus}
                        </span>
                      </div>
                      <span className="billing-invoice-patient">
                        {patientName(bill.patient)}
                      </span>
                      <div className="billing-invoice-submeta">
                        <span>{bill.service.name}</span>
                        {bill.patient?.mrn && (
                          <span className="billing-invoice-card-badge">MRN: {bill.patient.mrn}</span>
                        )}
                        <span style={{ fontSize: "0.75rem" }}>
                          {new Date(bill.billedAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="billing-invoice-amount-col">
                      <span className="billing-invoice-price">{money(bill.totalAmount)}</span>
                      <button
                        type="button"
                        className="billing-print-action-btn"
                        onClick={() => handlePrintBill(bill)}
                      >
                        <FiPrinter />
                        {bill.paymentStatus === "paid" ? "Print Receipt" : "Print Invoice"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* 4. Interactive & Printable Receipt / Invoice Modal */}
          {selectedBill && (
            <BillingReceiptModal
              bill={selectedBill}
              onClose={() => setSelectedBill(null)}
            />
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
