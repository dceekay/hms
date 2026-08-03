import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiClipboard,
  FiEdit3,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiShoppingCart,
} from "react-icons/fi";
import { FaCapsules } from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import mdsLogo from "../../assets/logo.png";
import { fetchPatients } from "../../services/patients/patientService";
import {
  adjustMedicationStock,
  createMedication,
  createPharmacySale,
  fetchMedications,
  fetchPharmacySales,
  fetchPharmacyStockMovements,
  updateMedication,
} from "../../services/pharmacyService";
import { useAuthStore } from "../../store/authStore";
import type { Patient } from "../../types/patient";
import type {
  Medication,
  MedicationFormValues,
  PharmacySale,
  PharmacySaleCartItem,
  PharmacySaleFormValues,
  PharmacyStockMovement,
  PharmacyStockStatus,
  PharmacySummary,
} from "../../types/pharmacy";

const emptyMedicationForm: MedicationFormValues = {
  name: "",
  genericName: "",
  brandName: "",
  category: "",
  strength: "",
  dosageForm: "",
  unit: "unit",
  sellingPrice: "0",
  costPrice: "0",
  currentStock: "0",
  reorderLevel: "10",
  batchNumber: "",
  expiryDate: "",
  isActive: true,
};

const emptySaleForm: PharmacySaleFormValues = {
  patientId: "",
  discountAmount: "0",
  amountPaid: "0",
  paymentStatus: "pending",
  notes: "",
  items: [],
};

const emptyCartDraft: PharmacySaleCartItem = {
  medicationId: "",
  quantity: "1",
  unitPrice: "0",
  instructions: "",
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

function patientOptionLabel(patient: Patient) {
  return `${patientName(patient)}${patient.mrn ? ` | ${patient.mrn}` : ""}${patient.phone ? ` | ${patient.phone}` : ""}`;
}

function medicationLabel(medication: Medication) {
  return [
    medication.name,
    medication.strength,
    medication.dosageForm,
  ].filter(Boolean).join(" ");
}

function medicationOptionLabel(medication: Medication) {
  return `${medicationLabel(medication)} | ${medication.currentStock} ${medication.unit} | ${money(medication.sellingPrice)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function stockState(medication: Medication) {
  if (medication.currentStock <= 0) return "out";
  if (medication.currentStock <= medication.reorderLevel) return "low";
  return "ok";
}

function formFromMedication(medication: Medication): MedicationFormValues {
  return {
    name: medication.name,
    genericName: medication.genericName ?? "",
    brandName: medication.brandName ?? "",
    category: medication.category ?? "",
    strength: medication.strength ?? "",
    dosageForm: medication.dosageForm ?? "",
    unit: medication.unit,
    sellingPrice: String(medication.sellingPrice ?? 0),
    costPrice: String(medication.costPrice ?? 0),
    currentStock: String(medication.currentStock ?? 0),
    reorderLevel: String(medication.reorderLevel ?? 0),
    batchNumber: medication.batchNumber ?? "",
    expiryDate: medication.expiryDate ? medication.expiryDate.slice(0, 10) : "",
    isActive: medication.isActive,
  };
}

export default function PharmacyPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("pharmacy.create");
  const canUpdate = permissions.includes("pharmacy.update");
  const canSell = permissions.includes("pharmacy.dispense");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [sales, setSales] = useState<PharmacySale[]>([]);
  const [movements, setMovements] = useState<PharmacyStockMovement[]>([]);
  const [summary, setSummary] = useState<PharmacySummary>({
    active: 0,
    lowStock: 0,
    outOfStock: 0,
    expired: 0,
  });
  const [medicineSearch, setMedicineSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<PharmacyStockStatus>("all");
  const [saleSearch, setSaleSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"sell" | "inventory" | "invoices" | "stock">("sell");
  const [medicineForm, setMedicineForm] = useState<MedicationFormValues>(emptyMedicationForm);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [saleForm, setSaleForm] = useState<PharmacySaleFormValues>(emptySaleForm);
  const [cartDraft, setCartDraft] = useState<PharmacySaleCartItem>(emptyCartDraft);
  const [patientPicker, setPatientPicker] = useState("");
  const [medicinePicker, setMedicinePicker] = useState("");
  const [stockTarget, setStockTarget] = useState<Medication | null>(null);
  const [stockChange, setStockChange] = useState("0");
  const [stockReason, setStockReason] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<PharmacySale | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === saleForm.patientId),
    [patients, saleForm.patientId]
  );

  const cartTotal = useMemo(
    () =>
      saleForm.items.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0
      ),
    [saleForm.items]
  );
  const invoiceTotal = Math.max(0, cartTotal - Number(saleForm.discountAmount || 0));
  const invoiceBalance = Math.max(0, invoiceTotal - Number(saleForm.amountPaid || 0));
  const ledgerTotals = useMemo(
    () =>
      movements.reduce(
        (totals, movement) => {
          if (movement.quantity > 0) totals.received += movement.quantity;
          if (movement.quantity < 0) totals.issued += Math.abs(movement.quantity);
          return totals;
        },
        { received: 0, issued: 0 }
      ),
    [movements]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [patientResult, medicationResult, salesResult, movementResult] = await Promise.all([
      fetchPatients({ status: "active" }),
      fetchMedications({ search: medicineSearch, stockStatus: stockFilter }),
      fetchPharmacySales(saleSearch),
      fetchPharmacyStockMovements(),
    ]);

    setLoading(false);

    if (!patientResult || !medicationResult.result || !salesResult.result || !movementResult.result) {
      setError(
        medicationResult.error ??
          salesResult.error ??
          movementResult.error ??
          "Unable to load pharmacy workspace."
      );
      return;
    }

    setPatients(patientResult);
    setMedications(medicationResult.result.items);
    setSummary(medicationResult.result.summary);
    setSales(salesResult.result.items);
    setMovements(movementResult.result.items);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateMedicineField = (field: keyof MedicationFormValues, value: string | boolean) => {
    setMedicineForm((current) => ({ ...current, [field]: value }));
  };

  const updateSaleField = (field: keyof PharmacySaleFormValues, value: string) => {
    setSaleForm((current) => ({ ...current, [field]: value }));
  };

  const handlePatientPick = (value: string) => {
    setPatientPicker(value);
    const patient = patients.find((item) => patientOptionLabel(item) === value);
    setSaleForm((current) => ({ ...current, patientId: patient?.id ?? "" }));
  };

  const handleMedicationSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = editingMedication
      ? await updateMedication(editingMedication.id, medicineForm)
      : await createMedication(medicineForm);

    setSaving(false);

    if (!result.medication) {
      setError(result.error ?? "Unable to save medication.");
      return;
    }

    setSuccess(editingMedication ? "Medication updated." : "Medication added.");
    setMedicineForm(emptyMedicationForm);
    setEditingMedication(null);
    await loadData();
  };

  const startEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    setMedicineForm(formFromMedication(medication));
    setActiveTab("inventory");
  };

  const handleMedicationPick = (medicationId: string) => {
    const medication = medications.find((item) => item.id === medicationId);

    setCartDraft((current) => ({
      ...current,
      medicationId,
      unitPrice: String(medication?.sellingPrice ?? 0),
    }));
  };

  const handleMedicinePickerChange = (value: string) => {
    setMedicinePicker(value);
    const medication = medications.find((item) => medicationOptionLabel(item) === value);
    handleMedicationPick(medication?.id ?? "");
  };

  const addCartItem = () => {
    const medication = medications.find((item) => item.id === cartDraft.medicationId);
    const quantity = Number(cartDraft.quantity || 0);

    if (!medication || quantity <= 0) {
      setError("Select a medicine and enter a valid quantity.");
      return;
    }

    if (quantity > medication.currentStock) {
      setError("Requested quantity is higher than available stock.");
      return;
    }

    setSaleForm((current) => ({
      ...current,
      items: [...current.items, cartDraft],
    }));
    setCartDraft(emptyCartDraft);
    setMedicinePicker("");
    setError(null);
  };

  const removeCartItem = (index: number) => {
    setSaleForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSaleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await createPharmacySale(saleForm);
    setSaving(false);

    if (!result.sale) {
      setError(result.error ?? "Unable to complete sale.");
      return;
    }

    setSuccess(`Invoice ${result.sale.invoiceNumber} generated.`);
    setSaleForm(emptySaleForm);
    setPatientPicker("");
    setMedicinePicker("");
    setSelectedInvoice(result.sale);
    setActiveTab("invoices");
    await loadData();
  };

  const handleStockAdjust = async () => {
    if (!stockTarget || !Number(stockChange)) {
      setError("Choose a medicine and enter stock quantity change.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await adjustMedicationStock(stockTarget.id, {
      quantityChange: Number(stockChange),
      reason: stockReason.trim() || (Number(stockChange) > 0 ? "Stock received" : "Stock correction"),
      notes: stockNotes.trim() || undefined,
    });
    setSaving(false);

    if (!result.medication) {
      setError(result.error ?? "Unable to update stock.");
      return;
    }

    setSuccess("Stock updated.");
    setStockTarget(null);
    setStockChange("0");
    setStockReason("");
    setStockNotes("");
    await loadData();
  };

  const handlePrintInvoice = (sale: PharmacySale) => {
    setSelectedInvoice(sale);
    window.setTimeout(() => window.print(), 80);
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="pharmacy-page">
          <section className="setup-hero pharmacy-hero">
            <div>
              <p className="eyebrow">Pharmacy</p>
              <h1>Medicine Sales & Stock</h1>
              <p>Sell medicines to registered patients, manage stock, and print invoices.</p>
            </div>
            <div className="billing-summary-grid pharmacy-summary-grid">
              <span>
                <strong>{summary.active}</strong>
                <small>Medicines</small>
              </span>
              <span>
                <strong>{summary.lowStock}</strong>
                <small>Low stock</small>
              </span>
              <span>
                <strong>{summary.outOfStock}</strong>
                <small>Out of stock</small>
              </span>
              <span>
                <strong>{summary.expired}</strong>
                <small>Expired</small>
              </span>
            </div>
          </section>

          <div className="pharmacy-tabs">
            {[
              { id: "sell", label: "Sell", icon: <FiShoppingCart /> },
              { id: "inventory", label: "Inventory", icon: <FaCapsules /> },
              { id: "invoices", label: "Invoices", icon: <FiArchive /> },
              { id: "stock", label: "Stock Ledger", icon: <FiClipboard /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <button type="button" onClick={loadData}>
              <FiRefreshCw />
              Refresh
            </button>
          </div>

          {error && <p className="registration-error">{error}</p>}
          {success && <p className="security-success">{success}</p>}

          {activeTab === "sell" && (
            <section className="pharmacy-sale-layout">
              <form className="setup-form pharmacy-sale-form" onSubmit={handleSaleSubmit}>
                <div className="panel-title">
                  <div>
                    <h2>Sell to Patient</h2>
                    <p>Build a cart and generate one invoice.</p>
                  </div>
                  <FiShoppingCart />
                </div>

                <label>
                  Patient
                  <input
                    list="pharmacy-patient-options"
                    value={patientPicker}
                    onChange={(event) => handlePatientPick(event.target.value)}
                    placeholder="Search patient by name, MRN or phone"
                    required
                  />
                  <datalist id="pharmacy-patient-options">
                    {patients.map((patient) => (
                      <option key={patient.id} value={patientOptionLabel(patient)} />
                    ))}
                  </datalist>
                </label>

                {selectedPatient && (
                  <div className="service-price-note">
                    <span>{selectedPatient.mrn || "No MRN"}</span>
                    <strong>{selectedPatient.insuranceProvider?.name || "Self pay"}</strong>
                  </div>
                )}

                <div className="pharmacy-cart-builder">
                  <label>
                    Medicine
                    <input
                      list="pharmacy-medicine-options"
                      value={medicinePicker}
                      onChange={(event) => handleMedicinePickerChange(event.target.value)}
                      placeholder="Search medicine by name, strength or price"
                    />
                    <datalist id="pharmacy-medicine-options">
                      {medications
                        .filter((medication) => medication.isActive && medication.currentStock > 0)
                        .map((medication) => (
                          <option key={medication.id} value={medicationOptionLabel(medication)} />
                        ))}
                    </datalist>
                  </label>
                  <label>
                    Qty
                    <input
                      type="number"
                      min="1"
                      value={cartDraft.quantity}
                      onChange={(event) => setCartDraft((current) => ({ ...current, quantity: event.target.value }))}
                    />
                  </label>
                  <label>
                    Price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cartDraft.unitPrice}
                      onChange={(event) => setCartDraft((current) => ({ ...current, unitPrice: event.target.value }))}
                    />
                  </label>
                  <label>
                    Instructions
                    <input
                      value={cartDraft.instructions}
                      onChange={(event) => setCartDraft((current) => ({ ...current, instructions: event.target.value }))}
                      placeholder="e.g. 1 tablet twice daily"
                    />
                  </label>
                  <button type="button" className="icon-text-btn" onClick={addCartItem}>
                    <FiPlus />
                    Add
                  </button>
                </div>

                <div className="pharmacy-cart-list">
                  {saleForm.items.length === 0 && <p className="muted-text">No medicine added yet.</p>}
                  {saleForm.items.map((item, index) => {
                    const medication = medications.find((med) => med.id === item.medicationId);

                    return (
                      <article className="pharmacy-cart-item" key={`${item.medicationId}-${index}`}>
                        <div>
                          <strong>{medication ? medicationLabel(medication) : "Medicine"}</strong>
                          <small>{item.instructions || "No instructions"}</small>
                        </div>
                        <span>{item.quantity} x {money(item.unitPrice)}</span>
                        <b>{money(Number(item.quantity) * Number(item.unitPrice))}</b>
                        <button type="button" onClick={() => removeCartItem(index)}>Remove</button>
                      </article>
                    );
                  })}
                </div>

                <div className="form-grid">
                  <label>
                    Discount
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={saleForm.discountAmount}
                      onChange={(event) => updateSaleField("discountAmount", event.target.value)}
                    />
                  </label>
                  <label>
                    Amount paid
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={saleForm.amountPaid}
                      onChange={(event) => updateSaleField("amountPaid", event.target.value)}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={saleForm.paymentStatus}
                      onChange={(event) => updateSaleField("paymentStatus", event.target.value)}
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
                    value={saleForm.notes}
                    onChange={(event) => updateSaleField("notes", event.target.value)}
                    placeholder="Optional invoice note"
                  />
                </label>

                <div className="pharmacy-sale-total">
                  <span>
                    <small>Subtotal</small>
                    <strong>{money(cartTotal)}</strong>
                  </span>
                  <span>
                    <small>Total</small>
                    <strong>{money(invoiceTotal)}</strong>
                  </span>
                  <span>
                    <small>Balance</small>
                    <strong>{money(invoiceBalance)}</strong>
                  </span>
                </div>

                <button className="registration-submit" type="submit" disabled={saving || !canSell || saleForm.items.length === 0}>
                  {saving ? "Saving..." : "Generate Invoice"}
                  <FiSave />
                </button>
              </form>

              <section className="setup-list-panel pharmacy-quick-stock">
                <div className="panel-title">
                  <div>
                    <h2>Stock Watch</h2>
                    <p>Fast view of low and available medicines.</p>
                  </div>
                  <FaCapsules />
                </div>

                <div className="pharmacy-stock-stack">
                  {medications.slice(0, 10).map((medication) => (
                    <button
                      type="button"
                      key={medication.id}
                      className={`pharmacy-stock-row ${stockState(medication)}`}
                      onClick={() => setStockTarget(medication)}
                    >
                      <span>
                        <strong>{medicationLabel(medication)}</strong>
                        <small>{medication.category || "General"} | {money(medication.sellingPrice)}</small>
                      </span>
                      <b>{medication.currentStock}</b>
                    </button>
                  ))}
                </div>
              </section>
            </section>
          )}

          {activeTab === "inventory" && (
            <section className="billing-layout pharmacy-inventory-layout">
              <form className="setup-form" onSubmit={handleMedicationSubmit}>
                <div className="panel-title">
                  <div>
                    <h2>{editingMedication ? "Edit Medicine" : "Add Medicine"}</h2>
                    <p>Maintain catalog, pricing, batches, and reorder levels.</p>
                  </div>
                  <FaCapsules />
                </div>

                <div className="form-grid">
                  <label>
                    Name
                    <input value={medicineForm.name} onChange={(event) => updateMedicineField("name", event.target.value)} required />
                  </label>
                  <label>
                    Generic name
                    <input value={medicineForm.genericName} onChange={(event) => updateMedicineField("genericName", event.target.value)} />
                  </label>
                  <label>
                    Brand
                    <input value={medicineForm.brandName} onChange={(event) => updateMedicineField("brandName", event.target.value)} />
                  </label>
                  <label>
                    Category
                    <input value={medicineForm.category} onChange={(event) => updateMedicineField("category", event.target.value)} placeholder="Antibiotic" />
                  </label>
                  <label>
                    Strength
                    <input value={medicineForm.strength} onChange={(event) => updateMedicineField("strength", event.target.value)} placeholder="500mg" />
                  </label>
                  <label>
                    Dosage form
                    <input value={medicineForm.dosageForm} onChange={(event) => updateMedicineField("dosageForm", event.target.value)} placeholder="Tablet" />
                  </label>
                  <label>
                    Unit
                    <input value={medicineForm.unit} onChange={(event) => updateMedicineField("unit", event.target.value)} required />
                  </label>
                  <label>
                    Selling price
                    <input type="number" min="0" step="0.01" value={medicineForm.sellingPrice} onChange={(event) => updateMedicineField("sellingPrice", event.target.value)} />
                  </label>
                  <label>
                    Cost price
                    <input type="number" min="0" step="0.01" value={medicineForm.costPrice} onChange={(event) => updateMedicineField("costPrice", event.target.value)} />
                  </label>
                  <label>
                    Opening stock
                    <input type="number" min="0" value={medicineForm.currentStock} onChange={(event) => updateMedicineField("currentStock", event.target.value)} />
                  </label>
                  <label>
                    Reorder level
                    <input type="number" min="0" value={medicineForm.reorderLevel} onChange={(event) => updateMedicineField("reorderLevel", event.target.value)} />
                  </label>
                  <label>
                    Batch
                    <input value={medicineForm.batchNumber} onChange={(event) => updateMedicineField("batchNumber", event.target.value)} />
                  </label>
                  <label>
                    Expiry date
                    <input type="date" value={medicineForm.expiryDate} onChange={(event) => updateMedicineField("expiryDate", event.target.value)} />
                  </label>
                </div>

                <label className="setup-toggle">
                  <input
                    type="checkbox"
                    checked={medicineForm.isActive}
                    onChange={(event) => updateMedicineField("isActive", event.target.checked)}
                  />
                  Active medicine
                </label>

                <div className="setup-actions">
                  {editingMedication && (
                    <button
                      type="button"
                      className="icon-text-btn"
                      onClick={() => {
                        setEditingMedication(null);
                        setMedicineForm(emptyMedicationForm);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                  <button className="registration-submit" type="submit" disabled={saving || (!canCreate && !canUpdate)}>
                    {saving ? "Saving..." : editingMedication ? "Update Medicine" : "Add Medicine"}
                    <FiSave />
                  </button>
                </div>
              </form>

              <section className="setup-list-panel">
                <div className="setup-list-header">
                  <div className="patient-search-control">
                    <FiSearch />
                    <input
                      value={medicineSearch}
                      onChange={(event) => setMedicineSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void loadData();
                      }}
                      placeholder="Search medicine"
                    />
                  </div>
                  <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as PharmacyStockStatus)}>
                    <option value="all">All stock</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out</option>
                    <option value="expired">Expired</option>
                  </select>
                  <button type="button" className="icon-text-btn" onClick={loadData}>
                    <FiRefreshCw />
                    Search
                  </button>
                </div>

                {loading && <p className="muted-text">Loading pharmacy stock...</p>}
                <div className="pharmacy-medicine-list">
                  {medications.map((medication) => (
                    <article className="pharmacy-medicine-card" key={medication.id}>
                      <div>
                        <div className="setup-provider-title">
                          <strong>{medicationLabel(medication)}</strong>
                          <span className={`pharmacy-stock-badge ${stockState(medication)}`}>
                            {stockState(medication)}
                          </span>
                        </div>
                        <p>{medication.genericName || medication.brandName || medication.category || "General medicine"}</p>
                        <small>
                          Batch {medication.batchNumber || "N/A"} | Exp {medication.expiryDate ? medication.expiryDate.slice(0, 10) : "N/A"}
                        </small>
                      </div>
                      <div className="pharmacy-card-side">
                        <strong>{medication.currentStock} {medication.unit}</strong>
                        <small>{money(medication.sellingPrice)}</small>
                      </div>
                      <div className="patient-row-actions">
                        {canUpdate && (
                          <>
                            <button type="button" className="icon-text-btn" onClick={() => startEditMedication(medication)}>
                              <FiEdit3 />
                              Edit
                            </button>
                            <button type="button" className="icon-text-btn" onClick={() => setStockTarget(medication)}>
                              <FiArchive />
                              Stock
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          )}

          {activeTab === "invoices" && (
            <section className="setup-list-panel">
              <div className="setup-list-header">
                <div className="patient-search-control">
                  <FiSearch />
                  <input
                    value={saleSearch}
                    onChange={(event) => setSaleSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadData();
                    }}
                    placeholder="Search invoice, patient, MRN, medicine"
                  />
                </div>
                <button type="button" className="icon-text-btn" onClick={loadData}>
                  <FiRefreshCw />
                  Search
                </button>
              </div>

              <div className="pharmacy-invoice-list">
                {sales.length === 0 && <p className="muted-text">No pharmacy invoices yet.</p>}
                {sales.map((sale) => (
                  <article className="pharmacy-invoice-card" key={sale.id}>
                    <div>
                      <div className="setup-provider-title">
                        <strong>{sale.invoiceNumber}</strong>
                        <span className={`patient-status-badge ${sale.paymentStatus === "paid" ? "active" : "inactive"}`}>
                          {sale.paymentStatus}
                        </span>
                      </div>
                      <p>{patientName(sale.patient)} | {sale.patient.mrn || "No MRN"}</p>
                      <small>{sale.items.length} item(s) | {formatDate(sale.soldAt)}</small>
                    </div>
                    <strong>{money(sale.totalAmount)}</strong>
                    <button type="button" className="icon-text-btn" onClick={() => handlePrintInvoice(sale)}>
                      <FiPrinter />
                      {sale.paymentStatus === "paid" ? "Receipt" : "Invoice"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === "stock" && (
            <section className="setup-list-panel pharmacy-ledger-panel">
              <div className="panel-title">
                <div>
                  <h2>Stock Ledger</h2>
                  <p>All received, adjusted, and dispensed medicine movements.</p>
                </div>
                <FiClipboard />
              </div>

              <div className="pharmacy-ledger-summary">
                <span>
                  <small>Movement records</small>
                  <strong>{movements.length}</strong>
                </span>
                <span>
                  <small>Units received</small>
                  <strong>{ledgerTotals.received}</strong>
                </span>
                <span>
                  <small>Units issued</small>
                  <strong>{ledgerTotals.issued}</strong>
                </span>
                <span>
                  <small>Low stock items</small>
                  <strong>{summary.lowStock}</strong>
                </span>
              </div>

              <div className="pharmacy-ledger-list">
                {movements.length === 0 && <p className="muted-text">No stock movements recorded yet.</p>}
                {movements.map((movement) => (
                  <article className="pharmacy-ledger-card" key={movement.id}>
                    <div className={movement.quantity >= 0 ? "pharmacy-ledger-icon in" : "pharmacy-ledger-icon out"}>
                      {movement.quantity >= 0 ? <FiPlus /> : <FiArchive />}
                    </div>
                    <div>
                      <div className="setup-provider-title">
                        <strong>{medicationLabel(movement.medication)}</strong>
                        <span className="pharmacy-stock-badge">{movement.movementType.replace("_", " ")}</span>
                      </div>
                      <p>{movement.reason || movement.notes || "No reason added."}</p>
                      <small>
                        {formatDate(movement.createdAt)} | {movement.recordedBy ? `${movement.recordedBy.firstName} ${movement.recordedBy.lastName}` : "System"}
                      </small>
                    </div>
                    <div className={movement.quantity >= 0 ? "inventory-quantity in" : "inventory-quantity out"}>
                      <strong>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</strong>
                      <small>{movement.stockBefore} to {movement.stockAfter}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {stockTarget && (
            <section className="patient-id-modal" role="dialog" aria-modal="true">
              <button className="patient-id-modal-backdrop" type="button" onClick={() => setStockTarget(null)} />
              <div className="patient-id-modal-panel pharmacy-stock-modal">
                <div className="modal-header">
                  <div>
                    <p className="eyebrow">Stock adjustment</p>
                    <h2>{medicationLabel(stockTarget)}</h2>
                  </div>
                </div>
                <div className="service-price-note">
                  <span>Current stock</span>
                  <strong>{stockTarget.currentStock} {stockTarget.unit}</strong>
                </div>
                <label>
                  Quantity change
                  <input
                    type="number"
                    value={stockChange}
                    onChange={(event) => setStockChange(event.target.value)}
                    placeholder="Use negative number to reduce"
                  />
                </label>
                <label>
                  Reason
                  <input
                    value={stockReason}
                    onChange={(event) => setStockReason(event.target.value)}
                    placeholder="Stock received, count correction, expired batch"
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={stockNotes}
                    onChange={(event) => setStockNotes(event.target.value)}
                    placeholder="Supplier, batch note, or approval detail"
                  />
                </label>
                <div className="setup-actions">
                  <button
                    type="button"
                    className="icon-text-btn"
                    onClick={() => {
                      setStockTarget(null);
                      setStockReason("");
                      setStockNotes("");
                    }}
                  >
                    Cancel
                  </button>
                  <button type="button" className="registration-submit" disabled={saving} onClick={handleStockAdjust}>
                    Update Stock
                  </button>
                </div>
              </div>
            </section>
          )}

          {selectedInvoice && (
            <section className="pharmacy-print-template" aria-label="Printable pharmacy invoice">
              <div className="pharmacy-print-header">
                <img src={mdsLogo} alt="MDS Hospital" />
                <div>
                  <h2>MDS Hospital</h2>
                  <p>{selectedInvoice.paymentStatus === "paid" ? "Pharmacy Receipt" : "Pharmacy Invoice"}</p>
                </div>
                <span>{selectedInvoice.invoiceNumber}</span>
              </div>

              <div className="pharmacy-print-meta">
                <span>
                  <small>Patient</small>
                  <strong>{patientName(selectedInvoice.patient)}</strong>
                </span>
                <span>
                  <small>MRN</small>
                  <strong>{selectedInvoice.patient.mrn || "N/A"}</strong>
                </span>
                <span>
                  <small>Date</small>
                  <strong>{formatDate(selectedInvoice.soldAt)}</strong>
                </span>
                <span>
                  <small>Status</small>
                  <strong>{selectedInvoice.paymentStatus}</strong>
                </span>
                <span>
                  <small>Insurance</small>
                  <strong>{selectedInvoice.patient.insuranceProvider?.name || "Self pay"}</strong>
                </span>
              </div>

              <table className="pharmacy-print-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{medicationLabel(item.medication)}</strong>
                        <small>{item.instructions || "No instructions"}</small>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{money(item.unitPrice)}</td>
                      <td>{money(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pharmacy-print-totals">
                <span><small>Subtotal</small><strong>{money(selectedInvoice.subtotalAmount)}</strong></span>
                <span><small>Discount</small><strong>{money(selectedInvoice.discountAmount)}</strong></span>
                <span><small>Total</small><strong>{money(selectedInvoice.totalAmount)}</strong></span>
                <span><small>Paid</small><strong>{money(selectedInvoice.amountPaid)}</strong></span>
                <span><small>Balance</small><strong>{money(Math.max(0, Number(selectedInvoice.totalAmount) - Number(selectedInvoice.amountPaid)))}</strong></span>
              </div>

              <p className="pharmacy-print-footer">
                Thank you. Please follow dosage instructions and return for review if symptoms persist.
              </p>
            </section>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
