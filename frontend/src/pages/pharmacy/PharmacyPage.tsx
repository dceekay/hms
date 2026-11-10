import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiClipboard,
  FiEdit3,
  FiMinus,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";
import { FaCapsules } from "react-icons/fa";
import PatientSearchSelect from "../../components/common/PatientSearchSelect";
import AdminLayout from "../../layouts/AdminLayout";
import QRCode from "qrcode";
import mdsLogo from "../../assets/optimized/logo.png";
import "../../styles/pharmacy-studio.css";
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
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [saleForm, setSaleForm] = useState<PharmacySaleFormValues>(emptySaleForm);
  const [cartDraft, setCartDraft] = useState<PharmacySaleCartItem>(emptyCartDraft);
  const [patientPicker, setPatientPicker] = useState("");
  const [medicinePicker, setMedicinePicker] = useState("");
  const [stockTarget, setStockTarget] = useState<Medication | null>(null);
  const [stockChange, setStockChange] = useState("0");
  const [stockReason, setStockReason] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<PharmacySale | null>(null);
  const [pharmacyQrDataUrl, setPharmacyQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedInvoice) {
      setPharmacyQrDataUrl("");
      return;
    }
    let active = true;
    const pName = selectedInvoice.patient
      ? `${selectedInvoice.patient.firstName || ""} ${selectedInvoice.patient.lastName || ""}`.trim()
      : "Walk-in";
    const qrData = JSON.stringify({
      hospital: "MDS Specialist Hospital Kano",
      invoice: selectedInvoice.invoiceNumber,
      patient: pName,
      mrn: selectedInvoice.patient?.mrn || "N/A",
      total: money(selectedInvoice.totalAmount),
      paid: money(selectedInvoice.amountPaid),
      status: selectedInvoice.paymentStatus.toUpperCase(),
      date: formatDate(selectedInvoice.soldAt),
      verify: `https://mds01.vercel.app/verify/pharmacy/${encodeURIComponent(selectedInvoice.invoiceNumber)}`,
    });

    QRCode.toDataURL(qrData, {
      margin: 1,
      width: 140,
      color: { dark: "#0f766e", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setPharmacyQrDataUrl(url);
      })
      .catch((err) => console.error("Pharmacy QR error:", err));

    return () => {
      active = false;
    };
  }, [selectedInvoice]);

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
      fetchPatients({ status: "active", take: 500 }),
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
    setIsMedicineModalOpen(false);
    await loadData();
  };

  const startEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    setMedicineForm(formFromMedication(medication));
    setIsMedicineModalOpen(true);
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

  const quickAddMedicationToCart = (medication: Medication) => {
    if (medication.currentStock <= 0) {
      setError(`Cannot add ${medication.name} because it is out of stock.`);
      return;
    }

    setSaleForm((current) => {
      const existingIndex = current.items.findIndex(
        (item) => item.medicationId === medication.id
      );

      if (existingIndex >= 0) {
        const existingItem = current.items[existingIndex];
        const newQty = Number(existingItem.quantity || 1) + 1;
        if (newQty > medication.currentStock) {
          setError(`Cannot add more than available stock (${medication.currentStock} ${medication.unit}).`);
          return current;
        }
        const updatedItems = [...current.items];
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: String(newQty),
        };
        return { ...current, items: updatedItems };
      }

      return {
        ...current,
        items: [
          ...current.items,
          {
            medicationId: medication.id,
            quantity: "1",
            unitPrice: String(medication.sellingPrice ?? 0),
            instructions: "",
          },
        ],
      };
    });
    setError(null);
  };

  const updateCartItemQty = (index: number, delta: number) => {
    setSaleForm((current) => {
      const item = current.items[index];
      if (!item) return current;
      const medication = medications.find((m) => m.id === item.medicationId);
      const newQty = Number(item.quantity || 1) + delta;

      if (newQty <= 0) {
        return {
          ...current,
          items: current.items.filter((_, i) => i !== index),
        };
      }

      if (medication && newQty > medication.currentStock) {
        setError(`Cannot exceed available stock (${medication.currentStock} ${medication.unit}).`);
        return current;
      }

      const updated = [...current.items];
      updated[index] = { ...item, quantity: String(newQty) };
      return { ...current, items: updated };
    });
  };

  const updateCartItemInstructions = (index: number, instructions: string) => {
    setSaleForm((current) => {
      const updated = [...current.items];
      if (updated[index]) {
        updated[index] = { ...updated[index], instructions };
      }
      return { ...current, items: updated };
    });
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
            <section className="pharmacy-pos-grid">
              {/* LEFT: CART BUILDER & CHECKOUT */}
              <form className="pharmacy-panel" onSubmit={handleSaleSubmit}>
                <div className="pharmacy-panel-title">
                  <div>
                    <h2>Dispense & Sell to Patient</h2>
                    <p>Select patient, add items to cart, and generate invoice.</p>
                  </div>
                  <FiShoppingCart style={{ fontSize: "1.35rem", color: "var(--accent, #0f766e)" }} />
                </div>

                {/* Patient Selector */}
                <div>
                  <PatientSearchSelect
                    label="Select Patient"
                    required
                    patients={patients}
                    selectedPatientId={saleForm.patientId}
                    onSelectPatient={(patient) => {
                      setSaleForm((current) => ({
                        ...current,
                        patientId: patient?.id ?? "",
                      }));
                    }}
                    placeholder="Search by patient name, P-File No., MRN, or phone..."
                  />
                  {selectedPatient && (
                    <div className="service-price-note" style={{ marginTop: "6px" }}>
                      <span>Card: <strong>{selectedPatient.physicalFileNumber || selectedPatient.mrn || "No Folder"}</strong></span>
                      <span>Plan: <strong>{selectedPatient.insuranceProvider?.name || "Self Pay / Cash"}</strong></span>
                      {selectedPatient.phone && <span>Tel: {selectedPatient.phone}</span>}
                    </div>
                  )}
                </div>

                {/* Optional Manual Medicine Input */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Manual Medicine Search
                    </label>
                    <input
                      list="pharmacy-medicine-options"
                      className="form-control"
                      value={medicinePicker}
                      onChange={(event) => handleMedicinePickerChange(event.target.value)}
                      placeholder="Type medicine name, strength or price..."
                    />
                    <datalist id="pharmacy-medicine-options">
                      {medications
                        .filter((medication) => medication.isActive && medication.currentStock > 0)
                        .map((medication) => (
                          <option key={medication.id} value={medicationOptionLabel(medication)} />
                        ))}
                    </datalist>
                  </div>
                  <div style={{ width: "90px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={cartDraft.quantity}
                      onChange={(event) => setCartDraft((current) => ({ ...current, quantity: event.target.value }))}
                    />
                  </div>
                  <button type="button" className="btn btn-primary" onClick={addCartItem} style={{ minHeight: "42px" }}>
                    <FiPlus /> Add
                  </button>
                </div>

                {/* Active Cart Items */}
                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-strong)", display: "block", marginBottom: "6px" }}>
                    Bill Items ({saleForm.items.length})
                  </label>
                  {saleForm.items.length === 0 ? (
                    <div style={{
                      padding: "2rem 1rem",
                      textAlign: "center",
                      border: "1.5px dashed var(--border)",
                      borderRadius: "12px",
                      color: "var(--muted)",
                      background: "var(--surface-strong)",
                    }}>
                      <FiShoppingCart style={{ fontSize: "2rem", opacity: 0.4, marginBottom: "0.4rem" }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Cart is empty</p>
                      <small>Click <strong>+ Add</strong> on any medicine from the catalog on the right.</small>
                    </div>
                  ) : (
                    <div className="table-scroll-container" style={{ maxHeight: "280px" }}>
                      <table className="pos-cart-table">
                        <thead>
                          <tr>
                            <th>Medicine</th>
                            <th>Unit Price</th>
                            <th style={{ textAlign: "center" }}>Qty</th>
                            <th>Subtotal</th>
                            <th>Instructions</th>
                            <th style={{ textAlign: "right" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {saleForm.items.map((item, index) => {
                            const medication = medications.find((med) => med.id === item.medicationId);
                            const lineTotal = Number(item.quantity) * Number(item.unitPrice);

                            return (
                              <tr key={`${item.medicationId}-${index}`}>
                                <td>
                                  <div className="cell-primary">
                                    {medication ? medicationLabel(medication) : "Medicine"}
                                  </div>
                                  <small className="cell-muted">
                                    Avail: {medication?.currentStock ?? "?"} {medication?.unit ?? "units"}
                                  </small>
                                </td>
                                <td>
                                  <span>{money(item.unitPrice)}</span>
                                </td>
                                <td>
                                  <div className="pos-qty-stepper">
                                    <button type="button" onClick={() => updateCartItemQty(index, -1)}>
                                      <FiMinus />
                                    </button>
                                    <span>{item.quantity}</span>
                                    <button type="button" onClick={() => updateCartItemQty(index, 1)}>
                                      <FiPlus />
                                    </button>
                                  </div>
                                </td>
                                <td>
                                  <strong>{money(lineTotal)}</strong>
                                </td>
                                <td>
                                  <input
                                    style={{ fontSize: "0.8rem", padding: "4px 8px", width: "130px" }}
                                    value={item.instructions || ""}
                                    onChange={(e) => updateCartItemInstructions(index, e.target.value)}
                                    placeholder="e.g. 1 tab bd x 5d"
                                  />
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    style={{ color: "var(--danger, #dc2626)" }}
                                    onClick={() => removeCartItem(index)}
                                    title="Remove item"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Payment Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Discount (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={saleForm.discountAmount}
                      onChange={(event) => updateSaleField("discountAmount", event.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Amount Paid (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control"
                      value={saleForm.amountPaid}
                      onChange={(event) => updateSaleField("amountPaid", event.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Payment Status
                    </label>
                    <select
                      className="form-control"
                      value={saleForm.paymentStatus}
                      onChange={(event) => updateSaleField("paymentStatus", event.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Notes (Optional)
                  </label>
                  <input
                    className="form-control"
                    value={saleForm.notes}
                    onChange={(event) => updateSaleField("notes", event.target.value)}
                    placeholder="e.g. Dispensed with counselling"
                  />
                </div>

                {/* Totals Summary */}
                <div className="pos-totals-card">
                  <div className="pos-total-item">
                    <small>Subtotal</small>
                    <strong>{money(cartTotal)}</strong>
                  </div>
                  <div className="pos-total-item">
                    <small>Discount</small>
                    <strong style={{ color: "#d97706" }}>-{money(saleForm.discountAmount)}</strong>
                  </div>
                  <div className="pos-total-item highlight">
                    <small>Invoice Total</small>
                    <strong>{money(invoiceTotal)}</strong>
                  </div>
                  <div className="pos-total-item">
                    <small>Amount Paid</small>
                    <strong>{money(saleForm.amountPaid)}</strong>
                  </div>
                  <div className={`pos-total-item ${invoiceBalance > 0 ? "due" : ""}`}>
                    <small>Balance Due</small>
                    <strong>{money(invoiceBalance)}</strong>
                  </div>
                </div>

                <button
                  className="registration-submit"
                  type="submit"
                  disabled={saving || !canSell || saleForm.items.length === 0}
                  style={{ width: "100%", justifyContent: "center", padding: "0.85rem", fontSize: "1rem" }}
                >
                  <FiSave />
                  {saving ? "Generating..." : `Generate Invoice (${money(invoiceTotal)})`}
                </button>
              </form>

              {/* RIGHT: QUICK CATALOG WITH 1-CLICK ADD */}
              <section className="pharmacy-panel">
                <div className="pharmacy-panel-title">
                  <div>
                    <h2>Quick Catalog & Dispense</h2>
                    <p>Click "+ Add" to add any drug directly to cart.</p>
                  </div>
                  <FaCapsules style={{ fontSize: "1.35rem", color: "#2563eb" }} />
                </div>

                <div className="patient-search-control" style={{ width: "100%" }}>
                  <FiSearch />
                  <input
                    value={medicineSearch}
                    onChange={(event) => setMedicineSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadData();
                    }}
                    placeholder="Filter catalog by medicine name, brand, or category..."
                  />
                </div>

                <div className="table-scroll-container" style={{ maxHeight: "560px" }}>
                  <table className="hms-data-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Stock</th>
                        <th>Price</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medications
                        .filter((m) => {
                          if (!medicineSearch.trim()) return true;
                          const q = medicineSearch.toLowerCase();
                          return (
                            m.name.toLowerCase().includes(q) ||
                            (m.genericName && m.genericName.toLowerCase().includes(q)) ||
                            (m.category && m.category.toLowerCase().includes(q))
                          );
                        })
                        .map((medication) => (
                          <tr key={medication.id}>
                            <td>
                              <div className="cell-primary">{medicationLabel(medication)}</div>
                              <div className="cell-muted">
                                {medication.category || "General"}
                                {medication.batchNumber ? ` • B:${medication.batchNumber}` : ""}
                              </div>
                            </td>
                            <td>
                              <span className={`pharmacy-stock-pill ${stockState(medication)}`}>
                                {medication.currentStock} {medication.unit}
                              </span>
                            </td>
                            <td>
                              <strong>{money(medication.sellingPrice)}</strong>
                            </td>
                            <td className="cell-actions">
                              <button
                                type="button"
                                className="icon-text-btn"
                                onClick={() => quickAddMedicationToCart(medication)}
                                disabled={medication.currentStock <= 0}
                                style={{
                                  background: medication.currentStock > 0 ? "rgba(15, 118, 110, 0.1)" : "var(--surface-strong)",
                                  color: medication.currentStock > 0 ? "#0f766e" : "var(--muted)",
                                  borderColor: medication.currentStock > 0 ? "#0f766e" : "var(--border)",
                                }}
                              >
                                <FiPlus /> Add
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          )}

          {activeTab === "inventory" && (
            <section className="hms-table-view">
              <div className="table-topbar">
                <div className="table-topbar-left">
                  <div className="patient-search-control">
                    <FiSearch />
                    <input
                      value={medicineSearch}
                      onChange={(event) => setMedicineSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void loadData();
                      }}
                      placeholder="Search medicine by name, generic, brand..."
                    />
                    {medicineSearch && (
                      <button
                        type="button"
                        className="patient-search-clear"
                        onClick={() => {
                          setMedicineSearch("");
                          void loadData();
                        }}
                      >
                        <FiX />
                      </button>
                    )}
                  </div>
                  <div className="table-filter-pills">
                    {(
                      [
                        { id: "all", label: `All (${summary.active + summary.outOfStock})` },
                        { id: "low", label: `Low (${summary.lowStock})` },
                        { id: "out", label: `Out (${summary.outOfStock})` },
                        { id: "expired", label: `Expired (${summary.expired})` },
                      ] as const
                    ).map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        className={`table-filter-pill ${stockFilter === pill.id ? "active" : ""}`}
                        onClick={() => {
                          setStockFilter(pill.id);
                        }}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="table-topbar-right">
                  <button type="button" className="icon-text-btn" onClick={loadData}>
                    <FiRefreshCw /> Refresh
                  </button>
                  {canCreate && (
                    <button
                      type="button"
                      className="registration-submit"
                      style={{ padding: "0.55rem 1rem", fontSize: "0.86rem" }}
                      onClick={() => {
                        setEditingMedication(null);
                        setMedicineForm(emptyMedicationForm);
                        setIsMedicineModalOpen(true);
                      }}
                    >
                      <FaCapsules /> + Add Medicine
                    </button>
                  )}
                </div>
              </div>

              {loading && <p className="muted-text" style={{ padding: "1.5rem" }}>Loading pharmacy stock...</p>}
              {!loading && medications.length === 0 && <p className="muted-text" style={{ padding: "1.5rem" }}>No medicines found.</p>}

              {!loading && medications.length > 0 && (
                <div className="table-scroll-container">
                  <table className="hms-data-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: "220px" }}>Medicine</th>
                        <th style={{ minWidth: "120px" }}>Category</th>
                        <th style={{ minWidth: "130px" }}>Batch & Exp</th>
                        <th style={{ minWidth: "140px" }}>Selling / Cost</th>
                        <th style={{ minWidth: "110px" }}>Stock</th>
                        <th style={{ width: "85px", minWidth: "85px" }}>Status</th>
                        <th className="sticky-action" style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medications.map((medication) => (
                        <tr key={medication.id}>
                          <td>
                            <div className="cell-primary">{medicationLabel(medication)}</div>
                            {medication.genericName && (
                              <div className="cell-muted">{medication.genericName}</div>
                            )}
                          </td>
                          <td>
                            <span>{medication.category || "General"}</span>
                          </td>
                          <td>
                            <div>{medication.batchNumber || "—"}</div>
                            <div className="cell-muted">
                              {medication.expiryDate ? medication.expiryDate.slice(0, 10) : "No expiry"}
                            </div>
                          </td>
                          <td>
                            <strong>{money(medication.sellingPrice)}</strong>
                            <div className="cell-muted">Cost: {money(medication.costPrice)}</div>
                          </td>
                          <td>
                            <strong>{medication.currentStock}</strong> <small className="cell-muted">{medication.unit}</small>
                            <div className="cell-muted" style={{ fontSize: "0.72rem" }}>Min: {medication.reorderLevel}</div>
                          </td>
                          <td>
                            <span className={`pharmacy-stock-pill ${stockState(medication)}`}>
                              {stockState(medication)}
                            </span>
                          </td>
                          <td className="cell-actions sticky-action">
                            <div className="table-actions-cluster">
                              {canUpdate && (
                                <>
                                  <button
                                    type="button"
                                    className="table-action-btn primary"
                                    onClick={() => startEditMedication(medication)}
                                    title="Edit Medicine"
                                  >
                                    <FiEdit3 />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="table-action-btn"
                                    onClick={() => setStockTarget(medication)}
                                    title="Adjust Stock"
                                  >
                                    <FiArchive />
                                    <span>Stock</span>
                                  </button>
                                </>
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

              {loading && <p className="muted-text" style={{ padding: "1.5rem" }}>Loading invoices...</p>}
              {!loading && sales.length === 0 && <p className="muted-text" style={{ padding: "1.5rem" }}>No pharmacy invoices yet.</p>}

              {!loading && sales.length > 0 && (
                <div className="table-scroll-container">
                  <table className="hms-data-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date & Time</th>
                        <th>Patient</th>
                        <th>Items</th>
                        <th>Total Amount</th>
                        <th>Paid</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale) => (
                        <tr key={sale.id}>
                          <td>
                            <div className="cell-primary">{sale.invoiceNumber}</div>
                          </td>
                          <td>
                            <div className="cell-muted" style={{ whiteSpace: "nowrap" }}>{formatDate(sale.soldAt)}</div>
                          </td>
                          <td>
                            <div className="cell-primary">{patientName(sale.patient)}</div>
                            <div className="cell-muted">MRN: {sale.patient.mrn || "No MRN"}</div>
                          </td>
                          <td>
                            <span>{sale.items.length} item(s)</span>
                          </td>
                          <td>
                            <strong>{money(sale.totalAmount)}</strong>
                          </td>
                          <td>
                            <span>{money(sale.amountPaid)}</span>
                          </td>
                          <td>
                            <span className={`patient-status-badge ${sale.paymentStatus === "paid" ? "active" : "inactive"}`}>
                              {sale.paymentStatus}
                            </span>
                          </td>
                          <td className="cell-actions">
                            <button type="button" className="icon-text-btn" onClick={() => handlePrintInvoice(sale)}>
                              <FiPrinter />
                              {sale.paymentStatus === "paid" ? "Receipt" : "Invoice"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

              {movements.length === 0 && <p className="muted-text" style={{ padding: "1.5rem" }}>No stock movements recorded yet.</p>}
              {movements.length > 0 && (
                <div className="table-scroll-container">
                  <table className="hms-data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Medicine</th>
                        <th>Movement Type</th>
                        <th>Qty Change</th>
                        <th>Balance</th>
                        <th>Reason / Notes</th>
                        <th>Logged By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((movement) => (
                        <tr key={movement.id}>
                          <td>
                            <div className="cell-muted" style={{ whiteSpace: "nowrap" }}>{formatDate(movement.createdAt)}</div>
                          </td>
                          <td>
                            <div className="cell-primary">{medicationLabel(movement.medication)}</div>
                          </td>
                          <td>
                            <span className="pharmacy-stock-badge">{movement.movementType.replace("_", " ")}</span>
                          </td>
                          <td>
                            <strong style={{ color: movement.quantity >= 0 ? "var(--success, #059669)" : "var(--danger, #dc2626)" }}>
                              {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                            </strong>
                          </td>
                          <td>
                            <span className="cell-muted">{movement.stockBefore} → {movement.stockAfter}</span>
                          </td>
                          <td>
                            <div>{movement.reason || movement.notes || "—"}</div>
                          </td>
                          <td>
                            <span className="cell-muted">
                              {movement.recordedBy ? `${movement.recordedBy.firstName} ${movement.recordedBy.lastName}` : "System"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
              <div className="pharmacy-print-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img src={mdsLogo} alt="MDS Specialist Hospital Logo" style={{ width: 52, height: 52, objectFit: "contain" }} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f766e" }}>MDS SPECIALIST HOSPITAL</h2>
                    <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                      {selectedInvoice.paymentStatus === "paid" ? "Official Pharmacy Dispensing Receipt" : "Pharmacy Dispensing Invoice"} · Kano State
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 800, color: "#0f766e" }}>
                    {selectedInvoice.invoiceNumber}
                  </span>
                  {pharmacyQrDataUrl && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                      <img
                        src={pharmacyQrDataUrl}
                        alt="Scan QR to verify pharmacy receipt"
                        style={{ width: 56, height: 56, borderRadius: 6, border: "1px solid #cbd5e1", padding: 2, background: "#fff" }}
                      />
                      <small style={{ fontSize: "0.58rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Scan to Verify</small>
                    </div>
                  )}
                </div>
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

              <div className="table-responsive">
                <table className="pharmacy-print-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Qty</th>
                      <th className="hide-mobile">Unit</th>
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
                        <td className="hide-mobile">{money(item.unitPrice)}</td>
                        <td>{money(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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

          {isMedicineModalOpen && (
            <div className="hms-modal-overlay" onClick={() => setIsMedicineModalOpen(false)}>
              <div className="hms-modal-window wide" onClick={(e) => e.stopPropagation()}>
                <div className="hms-modal-header">
                  <div className="hms-modal-title">
                    <FaCapsules />
                    <span>{editingMedication ? "Edit Medicine" : "Add Medicine to Catalog"}</span>
                  </div>
                  <button
                    type="button"
                    className="hms-modal-close-btn"
                    onClick={() => {
                      setIsMedicineModalOpen(false);
                      setEditingMedication(null);
                      setMedicineForm(emptyMedicationForm);
                    }}
                  >
                    <FiX />
                  </button>
                </div>
                <form onSubmit={handleMedicationSubmit} style={{ padding: "1.25rem 1.5rem" }}>
                  <div className="form-grid">
                    <label>
                      Name
                      <input
                        value={medicineForm.name}
                        onChange={(event) => updateMedicineField("name", event.target.value)}
                        required
                        placeholder="e.g. Amoxicillin Trihydrate"
                      />
                    </label>
                    <label>
                      Generic name
                      <input
                        value={medicineForm.genericName}
                        onChange={(event) => updateMedicineField("genericName", event.target.value)}
                        placeholder="e.g. Amoxicillin"
                      />
                    </label>
                    <label>
                      Brand
                      <input
                        value={medicineForm.brandName}
                        onChange={(event) => updateMedicineField("brandName", event.target.value)}
                        placeholder="e.g. Amoxil"
                      />
                    </label>
                    <label>
                      Category
                      <input
                        value={medicineForm.category}
                        onChange={(event) => updateMedicineField("category", event.target.value)}
                        placeholder="Antibiotic, Analgesic, Antimalarial..."
                      />
                    </label>
                    <label>
                      Strength
                      <input
                        value={medicineForm.strength}
                        onChange={(event) => updateMedicineField("strength", event.target.value)}
                        placeholder="e.g. 500mg, 250mg/5ml"
                      />
                    </label>
                    <label>
                      Dosage form
                      <input
                        value={medicineForm.dosageForm}
                        onChange={(event) => updateMedicineField("dosageForm", event.target.value)}
                        placeholder="Tablet, Capsule, Syrup, Injection..."
                      />
                    </label>
                    <label>
                      Unit
                      <input
                        value={medicineForm.unit}
                        onChange={(event) => updateMedicineField("unit", event.target.value)}
                        required
                        placeholder="packs, tabs, vials, bottles"
                      />
                    </label>
                    <label>
                      Selling price (₦)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={medicineForm.sellingPrice}
                        onChange={(event) => updateMedicineField("sellingPrice", event.target.value)}
                      />
                    </label>
                    <label>
                      Cost price (₦)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={medicineForm.costPrice}
                        onChange={(event) => updateMedicineField("costPrice", event.target.value)}
                      />
                    </label>
                    <label>
                      Opening stock
                      <input
                        type="number"
                        min="0"
                        value={medicineForm.currentStock}
                        onChange={(event) => updateMedicineField("currentStock", event.target.value)}
                      />
                    </label>
                    <label>
                      Reorder level
                      <input
                        type="number"
                        min="0"
                        value={medicineForm.reorderLevel}
                        onChange={(event) => updateMedicineField("reorderLevel", event.target.value)}
                      />
                    </label>
                    <label>
                      Batch number
                      <input
                        value={medicineForm.batchNumber}
                        onChange={(event) => updateMedicineField("batchNumber", event.target.value)}
                        placeholder="e.g. B24089"
                      />
                    </label>
                    <label>
                      Expiry date
                      <input
                        type="date"
                        value={medicineForm.expiryDate}
                        onChange={(event) => updateMedicineField("expiryDate", event.target.value)}
                      />
                    </label>
                  </div>

                  <label className="setup-toggle" style={{ marginTop: "1rem" }}>
                    <input
                      type="checkbox"
                      checked={medicineForm.isActive}
                      onChange={(event) => updateMedicineField("isActive", event.target.checked)}
                    />
                    Active medicine in catalog
                  </label>

                  <div className="setup-actions" style={{ marginTop: "1.25rem" }}>
                    <button
                      type="button"
                      className="icon-text-btn"
                      onClick={() => {
                        setIsMedicineModalOpen(false);
                        setEditingMedication(null);
                        setMedicineForm(emptyMedicationForm);
                      }}
                    >
                      Cancel
                    </button>
                    <button className="registration-submit" type="submit" disabled={saving || (!canCreate && !canUpdate)}>
                      {saving ? "Saving..." : editingMedication ? "Update Medicine" : "Add Medicine"}
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
