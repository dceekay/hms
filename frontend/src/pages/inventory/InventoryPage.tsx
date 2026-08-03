import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiBox,
  FiClipboard,
  FiEdit3,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTruck,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import {
  createInventoryItem,
  fetchInventoryItems,
  fetchInventoryMovements,
  recordInventoryMovement,
  updateInventoryItem,
} from "../../services/inventoryService";
import { useAuthStore } from "../../store/authStore";
import type {
  InventoryItem,
  InventoryItemFormValues,
  InventoryItemKind,
  InventoryMovement,
  InventoryMovementFormValues,
  InventoryMovementType,
  InventoryStockStatus,
  InventorySummary,
} from "../../types/inventory";

const emptyItemForm: InventoryItemFormValues = {
  name: "",
  code: "",
  category: "",
  itemType: "",
  description: "",
  unit: "unit",
  location: "",
  department: "",
  supplier: "",
  serialNumber: "",
  batchNumber: "",
  costPrice: "0",
  currentStock: "0",
  reorderLevel: "5",
  isConsumable: true,
  isActive: true,
  notes: "",
};

const emptyMovementForm: InventoryMovementFormValues = {
  itemId: "",
  movementType: "stock_out",
  quantityChange: "1",
  reason: "",
  destination: "",
  issuedTo: "",
  notes: "",
};

const negativeMovementTypes: InventoryMovementType[] = ["stock_out", "damaged", "lost"];

const movementOptions: Array<{ value: InventoryMovementType; label: string }> = [
  { value: "stock_in", label: "Stock received" },
  { value: "stock_out", label: "Issued out" },
  { value: "transfer", label: "Transferred" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "adjustment", label: "Correction" },
];

function money(value?: number | string | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
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

function stockState(item: InventoryItem) {
  if (item.currentStock <= 0) return "out";
  if (item.currentStock <= item.reorderLevel) return "low";
  return "ok";
}

function stockLabel(item: InventoryItem) {
  const state = stockState(item);
  if (state === "out") return "Out";
  if (state === "low") return "Low";
  return "OK";
}

function itemToForm(item: InventoryItem): InventoryItemFormValues {
  return {
    name: item.name,
    code: item.code ?? "",
    category: item.category ?? "",
    itemType: item.itemType ?? "",
    description: item.description ?? "",
    unit: item.unit,
    location: item.location ?? "",
    department: item.department ?? "",
    supplier: item.supplier ?? "",
    serialNumber: item.serialNumber ?? "",
    batchNumber: item.batchNumber ?? "",
    costPrice: String(item.costPrice ?? 0),
    currentStock: String(item.currentStock ?? 0),
    reorderLevel: String(item.reorderLevel ?? 0),
    isConsumable: item.isConsumable,
    isActive: item.isActive,
    notes: item.notes ?? "",
  };
}

function displayMovementType(type: InventoryMovementType) {
  return movementOptions.find((option) => option.value === type)?.label ?? type;
}

function signedQuantity(type: InventoryMovementType, quantity: string) {
  const amount = Math.abs(Number(quantity || 0));
  return negativeMovementTypes.includes(type) ? -amount : amount;
}

export default function InventoryPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("inventory.create");
  const canUpdate = permissions.includes("inventory.update");
  const canIssue = permissions.includes("inventory.issue");

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    active: 0,
    lowStock: 0,
    outOfStock: 0,
    consumables: 0,
    appliances: 0,
    categories: [],
  });
  const [activeTab, setActiveTab] = useState<"movement" | "catalog" | "history">("movement");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<InventoryStockStatus>("all");
  const [itemKindFilter, setItemKindFilter] = useState<InventoryItemKind>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [itemForm, setItemForm] = useState<InventoryItemFormValues>(emptyItemForm);
  const [movementForm, setMovementForm] = useState<InventoryMovementFormValues>(emptyMovementForm);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === movementForm.itemId) ?? null,
    [items, movementForm.itemId]
  );

  const movementPreview = useMemo(() => {
    if (!selectedItem) return null;
    const change = signedQuantity(movementForm.movementType, movementForm.quantityChange);
    return selectedItem.currentStock + change;
  }, [movementForm.movementType, movementForm.quantityChange, selectedItem]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [itemResult, movementResult] = await Promise.all([
      fetchInventoryItems({
        search,
        stockStatus: stockFilter,
        category: categoryFilter,
        itemKind: itemKindFilter,
      }),
      fetchInventoryMovements(),
    ]);

    setLoading(false);

    if (!itemResult.result || !movementResult.result) {
      setError(itemResult.error ?? movementResult.error ?? "Unable to load hospital inventory.");
      return;
    }

    setItems(itemResult.result.items);
    setSummary(itemResult.result.summary);
    setMovements(movementResult.result.items);
  };

  useEffect(() => {
    void loadData();
  }, [itemKindFilter, stockFilter, categoryFilter]);

  const updateItemField = (
    field: keyof InventoryItemFormValues,
    value: string | boolean
  ) => {
    setItemForm((current) => ({ ...current, [field]: value }));
  };

  const updateMovementField = (
    field: keyof InventoryMovementFormValues,
    value: string
  ) => {
    setMovementForm((current) => ({ ...current, [field]: value }));
  };

  const resetItemForm = () => {
    setItemForm(emptyItemForm);
    setEditingItem(null);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm(itemToForm(item));
    setActiveTab("catalog");
    setError(null);
    setSuccess(null);
  };

  const startMovement = (item: InventoryItem, type: InventoryMovementType = "stock_out") => {
    setMovementForm((current) => ({
      ...current,
      itemId: item.id,
      movementType: type,
      quantityChange: "1",
    }));
    setActiveTab("movement");
    setError(null);
    setSuccess(null);
  };

  const handleItemSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = editingItem
      ? await updateInventoryItem(editingItem.id, itemForm)
      : await createInventoryItem(itemForm);

    setSaving(false);

    if (!result.item) {
      setError(result.error ?? "Unable to save inventory item.");
      return;
    }

    setSuccess(editingItem ? "Inventory item updated." : "Inventory item added.");
    resetItemForm();
    await loadData();
  };

  const handleMovementSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!movementForm.itemId || !Number(movementForm.quantityChange)) {
      setError("Choose an item and enter a valid quantity.");
      return;
    }

    const quantityChange = signedQuantity(movementForm.movementType, movementForm.quantityChange);

    if (selectedItem && selectedItem.currentStock + quantityChange < 0) {
      setError("This movement would reduce stock below zero.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await recordInventoryMovement({
      ...movementForm,
      quantityChange: String(quantityChange),
    });

    setSaving(false);

    if (!result.item) {
      setError(result.error ?? "Unable to record stock movement.");
      return;
    }

    setSuccess("Stock movement recorded.");
    setMovementForm(emptyMovementForm);
    await loadData();
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="inventory-page">
          <section className="setup-hero inventory-hero">
            <div>
              <p className="eyebrow">Hospital Inventory</p>
              <h1>Materials & Appliances</h1>
              <p>Control hospital consumables, appliances, equipment, stock issues, and movement history.</p>
            </div>
            <div className="billing-summary-grid inventory-summary-grid">
              <span>
                <strong>{summary.active}</strong>
                <small>Active items</small>
              </span>
              <span>
                <strong>{summary.consumables}</strong>
                <small>Consumables</small>
              </span>
              <span>
                <strong>{summary.appliances}</strong>
                <small>Appliances</small>
              </span>
              <span>
                <strong>{summary.lowStock}</strong>
                <small>Low stock</small>
              </span>
              <span>
                <strong>{summary.outOfStock}</strong>
                <small>Out of stock</small>
              </span>
            </div>
          </section>

          <div className="pharmacy-tabs inventory-tabs">
            {[
              { id: "movement", label: "Issue / Receive", icon: <FiTruck /> },
              { id: "catalog", label: "Items", icon: <FiPackage /> },
              { id: "history", label: "History", icon: <FiClipboard /> },
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

          <div className="inventory-kind-toggle" aria-label="Inventory type filter">
            {[
              { value: "all", label: "All Items" },
              { value: "consumable", label: "Consumables" },
              { value: "appliance", label: "Appliances" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={itemKindFilter === option.value ? "active" : ""}
                onClick={() => {
                  setItemKindFilter(option.value as InventoryItemKind);
                  if (option.value === "appliance") {
                    setItemForm((current) => ({ ...current, isConsumable: false }));
                  }
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {error && <p className="registration-error">{error}</p>}
          {success && <p className="security-success">{success}</p>}

          {activeTab === "movement" && (
            <section className="inventory-movement-layout">
              <form className="setup-form inventory-movement-form" onSubmit={handleMovementSubmit}>
                <div className="panel-title">
                  <div>
                    <h2>Record Movement</h2>
                    <p>Issue, receive, transfer, or write off hospital materials.</p>
                  </div>
                  <FiTruck />
                </div>

                <label>
                  Item
                  <select
                    value={movementForm.itemId}
                    onChange={(event) => updateMovementField("itemId", event.target.value)}
                    required
                  >
                    <option value="">Select item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.code ? `(${item.code})` : ""} - {item.currentStock} {item.unit}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedItem && (
                  <div className="inventory-stock-snapshot">
                    <span>
                      <small>Current</small>
                      <strong>{selectedItem.currentStock} {selectedItem.unit}</strong>
                    </span>
                    <span>
                      <small>After</small>
                      <strong className={movementPreview !== null && movementPreview < 0 ? "danger-text" : ""}>
                        {movementPreview ?? selectedItem.currentStock} {selectedItem.unit}
                      </strong>
                    </span>
                    <span>
                      <small>Location</small>
                      <strong>{selectedItem.location || "Not set"}</strong>
                    </span>
                  </div>
                )}

                <div className="form-grid">
                  <label>
                    Movement
                    <select
                      value={movementForm.movementType}
                      onChange={(event) =>
                        updateMovementField("movementType", event.target.value as InventoryMovementType)
                      }
                    >
                      {movementOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      value={movementForm.quantityChange}
                      onChange={(event) => updateMovementField("quantityChange", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Issued to
                    <input
                      value={movementForm.issuedTo}
                      onChange={(event) => updateMovementField("issuedTo", event.target.value)}
                      placeholder="Ward, staff, unit"
                    />
                  </label>
                  <label>
                    Destination
                    <input
                      value={movementForm.destination}
                      onChange={(event) => updateMovementField("destination", event.target.value)}
                      placeholder="Store, department, theatre"
                    />
                  </label>
                </div>

                <label>
                  Reason
                  <input
                    value={movementForm.reason}
                    onChange={(event) => updateMovementField("reason", event.target.value)}
                    placeholder="Reason for this movement"
                  />
                </label>

                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={movementForm.notes}
                    onChange={(event) => updateMovementField("notes", event.target.value)}
                    placeholder="Optional notes"
                  />
                </label>

                <button className="registration-submit" type="submit" disabled={saving || !canIssue}>
                  {saving ? "Saving..." : "Save Movement"}
                  <FiSave />
                </button>
              </form>

              <section className="setup-list-panel">
                <div className="panel-title">
                  <div>
                    <h2>Stock Watch</h2>
                    <p>Items that need attention appear first.</p>
                  </div>
                  <FiArchive />
                </div>

                <div className="inventory-item-list compact">
                  {loading && <p className="muted-text">Loading inventory...</p>}
                  {!loading && items.length === 0 && <p className="muted-text">No inventory items found.</p>}
                  {items.slice(0, 10).map((item) => (
                    <article key={item.id} className={`inventory-item-card ${stockState(item)}`}>
                      <div className="inventory-item-icon">
                        {item.isConsumable ? <FiBox /> : <FiPackage />}
                      </div>
                      <div>
                        <div className="setup-provider-title">
                          <strong>{item.name}</strong>
                          <span className={`inventory-stock-badge ${stockState(item)}`}>{stockLabel(item)}</span>
                        </div>
                        <p>{item.category || "General"} | {item.location || "No location"}</p>
                        <small>{item.code || "No code"} | Reorder at {item.reorderLevel}</small>
                      </div>
                      <div className="inventory-card-side">
                        <strong>{item.currentStock}</strong>
                        <small>{item.unit}</small>
                      </div>
                      {canIssue && (
                        <button type="button" className="icon-text-btn" onClick={() => startMovement(item)}>
                          <FiTruck />
                          Move
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            </section>
          )}

          {activeTab === "catalog" && (
            <section className="billing-layout inventory-catalog-layout">
              <form className="setup-form" onSubmit={handleItemSubmit}>
                <div className="panel-title">
                  <div>
                    <h2>{editingItem ? "Edit Item" : "Add Item"}</h2>
                    <p>{editingItem ? editingItem.name : "Create a material or equipment record."}</p>
                  </div>
                  <FiPlus />
                </div>

                <div className="form-grid">
                  <label>
                    Item name
                    <input
                      value={itemForm.name}
                      onChange={(event) => updateItemField("name", event.target.value)}
                      placeholder="Examination gloves"
                      required
                    />
                  </label>
                  <label>
                    Code
                    <input
                      value={itemForm.code}
                      onChange={(event) => updateItemField("code", event.target.value.toUpperCase())}
                      placeholder="INV-001"
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={itemForm.category}
                      onChange={(event) => updateItemField("category", event.target.value)}
                      placeholder="Consumables"
                    />
                  </label>
                  <label>
                    Type
                    <input
                      value={itemForm.itemType}
                      onChange={(event) => updateItemField("itemType", event.target.value)}
                      placeholder="Medical supply"
                    />
                  </label>
                  <label>
                    Unit
                    <input
                      value={itemForm.unit}
                      onChange={(event) => updateItemField("unit", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Location
                    <input
                      value={itemForm.location}
                      onChange={(event) => updateItemField("location", event.target.value)}
                      placeholder="Main store"
                    />
                  </label>
                  <label>
                    Department
                    <input
                      value={itemForm.department}
                      onChange={(event) => updateItemField("department", event.target.value)}
                      placeholder="OPD"
                    />
                  </label>
                  <label>
                    Supplier
                    <input
                      value={itemForm.supplier}
                      onChange={(event) => updateItemField("supplier", event.target.value)}
                      placeholder="Supplier name"
                    />
                  </label>
                  <label>
                    Serial number
                    <input
                      value={itemForm.serialNumber}
                      onChange={(event) => updateItemField("serialNumber", event.target.value)}
                    />
                  </label>
                  <label>
                    Batch number
                    <input
                      value={itemForm.batchNumber}
                      onChange={(event) => updateItemField("batchNumber", event.target.value)}
                    />
                  </label>
                  <label>
                    Cost price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemForm.costPrice}
                      onChange={(event) => updateItemField("costPrice", event.target.value)}
                    />
                  </label>
                  <label>
                    Opening stock
                    <input
                      type="number"
                      min="0"
                      value={itemForm.currentStock}
                      onChange={(event) => updateItemField("currentStock", event.target.value)}
                    />
                  </label>
                  <label>
                    Reorder level
                    <input
                      type="number"
                      min="0"
                      value={itemForm.reorderLevel}
                      onChange={(event) => updateItemField("reorderLevel", event.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Description
                  <textarea
                    rows={3}
                    value={itemForm.description}
                    onChange={(event) => updateItemField("description", event.target.value)}
                    placeholder="Short description"
                  />
                </label>

                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={itemForm.notes}
                    onChange={(event) => updateItemField("notes", event.target.value)}
                    placeholder="Optional notes"
                  />
                </label>

                <label className="setup-toggle">
                  <input
                    type="checkbox"
                    checked={itemForm.isConsumable}
                    onChange={(event) => updateItemField("isConsumable", event.target.checked)}
                  />
                  Consumable item
                </label>

                <label className="setup-toggle">
                  <input
                    type="checkbox"
                    checked={itemForm.isActive}
                    onChange={(event) => updateItemField("isActive", event.target.checked)}
                  />
                  Active item
                </label>

                <div className="setup-actions">
                  {editingItem && (
                    <button type="button" className="icon-text-btn" onClick={resetItemForm}>
                      Cancel
                    </button>
                  )}
                  <button
                    className="registration-submit"
                    type="submit"
                    disabled={saving || (editingItem ? !canUpdate : !canCreate)}
                  >
                    {saving ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
                    <FiSave />
                  </button>
                </div>
              </form>

              <section className="setup-list-panel">
                <div className="setup-list-header inventory-filter-bar">
                  <div className="patient-search-control">
                    <FiSearch />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void loadData();
                      }}
                      placeholder="Search item, code, location"
                    />
                  </div>
                  <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as InventoryStockStatus)}>
                    <option value="all">All stock</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out of stock</option>
                  </select>
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    <option value="">All categories</option>
                    {summary.categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <button type="button" className="icon-text-btn" onClick={loadData}>
                    <FiRefreshCw />
                    Search
                  </button>
                </div>

                <div className="inventory-item-list">
                  {loading && <p className="muted-text">Loading inventory...</p>}
                  {!loading && items.length === 0 && <p className="muted-text">No inventory items found.</p>}
                  {items.map((item) => (
                    <article key={item.id} className={`inventory-item-card ${stockState(item)}`}>
                      <div className="inventory-item-icon">
                        {item.isConsumable ? <FiBox /> : <FiPackage />}
                      </div>
                      <div>
                        <div className="setup-provider-title">
                          <strong>{item.name}</strong>
                          <span className={`inventory-stock-badge ${stockState(item)}`}>{stockLabel(item)}</span>
                          {!item.isActive && <span className="patient-status-badge inactive">Inactive</span>}
                        </div>
                        <p>{item.description || item.category || "Hospital material"}</p>
                        <div className="setup-provider-meta">
                          <span>{item.code || "No code"}</span>
                          <span>{item.category || "General"}</span>
                          <span>{item.location || "No location"}</span>
                          <span>{money(item.costPrice)}</span>
                        </div>
                      </div>
                      <div className="inventory-card-side">
                        <strong>{item.currentStock}</strong>
                        <small>{item.unit}</small>
                      </div>
                      <div className="patient-row-actions">
                        {canUpdate && (
                          <button type="button" className="icon-text-btn" onClick={() => startEdit(item)}>
                            <FiEdit3 />
                            Edit
                          </button>
                        )}
                        {canIssue && (
                          <button type="button" className="icon-text-btn" onClick={() => startMovement(item)}>
                            <FiTruck />
                            Move
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          )}

          {activeTab === "history" && (
            <section className="setup-list-panel">
              <div className="panel-title">
                <div>
                  <h2>Movement History</h2>
                  <p>Every stock action is kept for review and monthly accountability.</p>
                </div>
                <FiClipboard />
              </div>

              <div className="inventory-movement-list">
                {movements.length === 0 && <p className="muted-text">No inventory movements yet.</p>}
                {movements.map((movement) => (
                  <article className="inventory-movement-card" key={movement.id}>
                    <div className="inventory-item-icon">
                      {movement.quantity >= 0 ? <FiPlus /> : <FiArchive />}
                    </div>
                    <div>
                      <div className="setup-provider-title">
                        <strong>{movement.item.name}</strong>
                        <span className="inventory-stock-badge">{displayMovementType(movement.movementType)}</span>
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
                    <div className="inventory-movement-destination">
                      <span>{movement.destination || "No destination"}</span>
                      <small>{movement.issuedTo || "No recipient"}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
