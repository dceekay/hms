import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArchive,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiFilter,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import QRCode from "qrcode";
import mdsLogo from "../../assets/optimized/logo.png";
import { createSemsasTransfer, fetchSemsasTransfers, fileSemsasMonth } from "../../services/semsasService";
import { fetchPatients } from "../../services/patients/patientService";
import { useAuthStore } from "../../store/authStore";
import { SemsasTransfer, SemsasTransferFormValues, SemsasTransferType } from "../../types/semsas";
import type { Patient } from "../../types/patient";
import PatientSearchSelect from "../../components/common/PatientSearchSelect";
import { confirmImportantAction, showErrorAlert, showSuccessWithSound } from "../../utils/sweetAlert";
import "../../styles/semsas.css";

const transferTypesMeta: Record<
  SemsasTransferType,
  { label: string; desc: string; icon: typeof FiTruck; routeTag: string; badgeClass: string }
> = {
  hospital_ambulance_to_other_hospital: {
    label: "MDS Ambulance to Another Hospital",
    desc: "MDS ambulance dispatched to transport patient outbound to another hospital",
    icon: FiArrowUpRight,
    routeTag: "Outbound Dispatch",
    badgeClass: "blue",
  },
  hospital_ambulance_to_this_hospital: {
    label: "MDS Ambulance Retrieval to MDS",
    desc: "MDS ambulance dispatched to retrieve patient inbound to MDS Hospital",
    icon: FiArrowDownLeft,
    routeTag: "Inbound Retrieval",
    badgeClass: "teal",
  },
  external_ambulance_to_this_hospital: {
    label: "External Ambulance to MDS",
    desc: "State SEMSAS or third-party ambulance bringing incoming patient to MDS Hospital",
    icon: FiTruck,
    routeTag: "External Arrival",
    badgeClass: "amber",
  },
};

const FACILITY_PRESETS = [
  "MDS Specialist Hospital Kano",
  "Aminu Kano Teaching Hospital (AKTH)",
  "Murtala Muhammad Specialist Hospital",
  "National Orthopaedic Hospital Dala",
  "Abdullahi Wase Specialist Hospital",
];

const emptyForm: SemsasTransferFormValues = {
  transferType: "hospital_ambulance_to_other_hospital",
  patientId: undefined,
  patientName: "",
  patientPhone: "",
  fromFacility: "MDS Specialist Hospital Kano",
  toFacility: "",
  ambulanceProvider: "MDS Emergency Fleet",
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
  return `NGN ${Number(value ?? 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  try {
    return new Date(value).toLocaleString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function SemsasPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("semsas.create");
  const canFile = permissions.includes("semsas.file");

  // Main UI state
  const [activeTab, setActiveTab] = useState<"register" | "create" | "filing" | "report">("register");
  const [transfers, setTransfers] = useState<SemsasTransfer[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientMode, setPatientMode] = useState<"registered" | "walkin">("registered");
  const [form, setForm] = useState<SemsasTransferFormValues>(emptyForm);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filingStatus, setFilingStatus] = useState<"" | "unfiled" | "filed">("");

  // Accounts Filing
  const [filingMonth, setFilingMonth] = useState(currentMonth());
  const [filingNotes, setFilingNotes] = useState("");

  // Modal Detail View
  const [selectedTransfer, setSelectedTransfer] = useState<SemsasTransfer | null>(null);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filing, setFiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [semsasQrDataUrl, setSemsasQrDataUrl] = useState<string>("");

  // Calculated totals
  const totals = useMemo(() => {
    const amount = transfers.reduce((sum, transfer) => sum + Number(transfer.feeAmount ?? 0), 0);
    const unfiledList = transfers.filter((transfer) => !transfer.filedAt);
    const filedList = transfers.filter((transfer) => transfer.filedAt);
    const unfiled = unfiledList.length;
    const filed = filedList.length;
    const filedAmount = filedList.reduce((sum, transfer) => sum + Number(transfer.feeAmount ?? 0), 0);
    const unfiledAmount = amount - filedAmount;

    return { amount, filed, filedAmount, unfiled, unfiledAmount, unfiledList };
  }, [transfers]);

  // Load Transfers from API
  const loadTransfers = async () => {
    setLoading(true);
    setError(null);
    const { transfers: result, error: fetchError } = await fetchSemsasTransfers({
      search,
      month: filterMonth,
      filingStatus,
    });
    setLoading(false);

    if (!result) {
      setError(fetchError ?? "Unable to load SEMSAS records.");
      return;
    }

    setTransfers(result);
  };

  // Load initial patients list for auto-complete
  useEffect(() => {
    let isMounted = true;
    fetchPatients({ status: "active", take: 100 })
      .then((res) => {
        if (isMounted && res) {
          setPatients(res);
        }
      })
      .catch((err) => console.warn("Could not preload patients:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Initial load
  useEffect(() => {
    void loadTransfers();
  }, [filterMonth, filingStatus]);

  // High-visibility verification QR code for official report
  useEffect(() => {
    let active = true;
    const qrData = JSON.stringify({
      hospital: "MDS Specialist Hospital Kano",
      document: "SEMSAS Ambulance Register & Filing Audit",
      month: filterMonth || "All Recorded Months",
      status: filingStatus || "All Statuses",
      records: transfers.length,
      totalAmount: totals.amount,
      filedAmount: totals.filedAmount,
      unfiledCount: totals.unfiled,
      verify: "https://mds01.vercel.app/operations/semsas",
    });

    QRCode.toDataURL(qrData, {
      margin: 1,
      width: 160,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (active) setSemsasQrDataUrl(dataUrl);
      })
      .catch((err) => console.error("SEMSAS QR error:", err));

    return () => {
      active = false;
    };
  }, [filterMonth, filingStatus, transfers.length, totals.amount, totals.filedAmount, totals.unfiled]);

  const updateField = (field: keyof SemsasTransferFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleTransferType = (transferType: SemsasTransferType) => {
    setForm((current) => ({
      ...current,
      transferType,
      fromFacility:
        transferType === "hospital_ambulance_to_other_hospital"
          ? "MDS Specialist Hospital Kano"
          : current.fromFacility === "MDS Specialist Hospital Kano"
          ? ""
          : current.fromFacility,
      toFacility:
        transferType === "hospital_ambulance_to_other_hospital"
          ? ""
          : "MDS Specialist Hospital Kano",
    }));
  };

  const handlePatientSelect = (patient: Patient | null) => {
    if (patient) {
      setSelectedPatientId(patient.id);
      const fullName = `${patient.firstName} ${patient.lastName}`.trim();
      setForm((prev) => ({
        ...prev,
        patientId: patient.id,
        patientName: fullName,
        patientPhone: patient.phone || prev.patientPhone,
      }));
    } else {
      setSelectedPatientId(null);
      setForm((prev) => ({
        ...prev,
        patientId: undefined,
      }));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.patientName.trim()) {
      setError("Please specify the patient name.");
      return;
    }
    if (!form.fromFacility.trim() || !form.toFacility.trim()) {
      setError("Both origin and destination facilities are required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const { transfer, error: saveError } = await createSemsasTransfer(form);
    setSaving(false);

    if (!transfer) {
      const msg = saveError ?? "Unable to save SEMSAS record.";
      setError(msg);
      await showErrorAlert({ title: "Failed to Save", text: msg });
      return;
    }

    await showSuccessWithSound({
      title: "Transfer Recorded",
      text: `Ambulance service for ${transfer.patientName} saved successfully.`,
    });

    setSuccess("SEMSAS ambulance service record saved.");
    setForm({
      ...emptyForm,
      transferDate: new Date().toISOString().slice(0, 16),
      fromFacility:
        form.transferType === "hospital_ambulance_to_other_hospital"
          ? "MDS Specialist Hospital Kano"
          : "",
      toFacility:
        form.transferType === "hospital_ambulance_to_other_hospital"
          ? ""
          : "MDS Specialist Hospital Kano",
    });
    setSelectedPatientId(null);
    setShowVehicleDetails(false);
    setActiveTab("register");
    await loadTransfers();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFileMonth = async () => {
    if (!filingMonth) {
      setError("Select a filing month before filing SEMSAS records.");
      return;
    }

    const unfiledForMonth = transfers.filter(
      (t) => !t.filedAt && (!t.transferDate || t.transferDate.startsWith(filingMonth))
    );

    const confirmed = await confirmImportantAction({
      title: `File ${filingMonth} to Accounts?`,
      text: `This will mark all eligible unfiled SEMSAS ambulance records for ${filingMonth} as submitted to Accounts.`,
      confirmButtonText: "Yes, File to Accounts",
      cancelButtonText: "Cancel",
      icon: "warning",
    });

    if (!confirmed) return;

    setFiling(true);
    setError(null);
    setSuccess(null);

    const { filing: result, error: filingError } = await fileSemsasMonth(filingMonth, filingNotes);
    setFiling(false);

    if (!result) {
      const msg = filingError ?? "Unable to file SEMSAS month.";
      setError(msg);
      await showErrorAlert({ title: "Filing Failed", text: msg });
      return;
    }

    await showSuccessWithSound({
      title: "Month Filed Successfully",
      text: `${result.count} SEMSAS record(s) filed for ${result.month}.`,
    });

    setSuccess(`${result.count} SEMSAS record(s) filed for ${result.month}.`);
    setFilingNotes("");
    await loadTransfers();
  };

  const setTimeNow = () => {
    setForm((prev) => ({
      ...prev,
      transferDate: new Date().toISOString().slice(0, 16),
    }));
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="semsas-page">
          {/* Hero Banner with Responsive KPI Cards */}
          <section className="semsas-hero-card">
            <div className="semsas-hero-header">
              <div className="semsas-hero-title-group">
                <span className="semsas-badge-pill">
                  <FiTruck /> Kano SEMSAS Operations
                </span>
                <h1>Ambulance Service Register & Filing</h1>
                <p>
                  Dispatch and log ambulance trips into or out of MDS Hospital, track patient movements,
                  and reconcile monthly records for Accounts.
                </p>
              </div>
              <div className="semsas-hero-actions">
                {canCreate && (
                  <button
                    type="button"
                    className="semsas-btn-primary"
                    onClick={() => setActiveTab("create")}
                  >
                    <FiPlus />
                    New Dispatch
                  </button>
                )}
                {canFile && (
                  <button
                    type="button"
                    className="semsas-btn-secondary"
                    onClick={() => setActiveTab("filing")}
                  >
                    <FiArchive />
                    File Month
                  </button>
                )}
                <button type="button" className="semsas-btn-secondary" onClick={handlePrint}>
                  <FiPrinter />
                  Print Report
                </button>
              </div>
            </div>

            <div className="semsas-kpi-grid">
              <div className="semsas-kpi-card">
                <div className="semsas-kpi-icon teal">
                  <FiTruck />
                </div>
                <div className="semsas-kpi-info">
                  <span className="semsas-kpi-label">Total Dispatches</span>
                  <strong className="semsas-kpi-value">{transfers.length}</strong>
                  <span className="semsas-kpi-sub">Registered movements</span>
                </div>
              </div>

              <div className="semsas-kpi-card">
                <div className={`semsas-kpi-icon ${totals.unfiled > 0 ? "amber" : "emerald"}`}>
                  <FiArchive />
                </div>
                <div className="semsas-kpi-info">
                  <span className="semsas-kpi-label">Pending Filing</span>
                  <strong className="semsas-kpi-value">{totals.unfiled}</strong>
                  <span className="semsas-kpi-sub">
                    {totals.unfiled > 0 ? `${money(totals.unfiledAmount)} awaiting` : "All records filed"}
                  </span>
                </div>
              </div>

              <div className="semsas-kpi-card">
                <div className="semsas-kpi-icon blue">
                  <FiDollarSign />
                </div>
                <div className="semsas-kpi-info">
                  <span className="semsas-kpi-label">Total Billed</span>
                  <strong className="semsas-kpi-value">{money(totals.amount)}</strong>
                  <span className="semsas-kpi-sub">Combined service fee</span>
                </div>
              </div>

              <div className="semsas-kpi-card">
                <div className="semsas-kpi-icon emerald">
                  <FiCheckCircle />
                </div>
                <div className="semsas-kpi-info">
                  <span className="semsas-kpi-label">Filed Revenue</span>
                  <strong className="semsas-kpi-value">{money(totals.filedAmount)}</strong>
                  <span className="semsas-kpi-sub">{totals.filed} trips filed</span>
                </div>
              </div>
            </div>
          </section>

          {/* Modern Responsive Tab Navigation Bar */}
          <div className="semsas-tabs-container">
            <div className="semsas-tabs">
              <button
                type="button"
                className={`semsas-tab-btn ${activeTab === "register" ? "active" : ""}`}
                onClick={() => setActiveTab("register")}
              >
                <FiTruck />
                Transfers Register
                <span className="semsas-tab-badge">{transfers.length}</span>
              </button>

              {canCreate && (
                <button
                  type="button"
                  className={`semsas-tab-btn ${activeTab === "create" ? "active" : ""}`}
                  onClick={() => setActiveTab("create")}
                >
                  <FiPlus />
                  Log New Transfer
                </button>
              )}

              <button
                type="button"
                className={`semsas-tab-btn ${activeTab === "filing" ? "active" : ""}`}
                onClick={() => setActiveTab("filing")}
              >
                <FiArchive />
                Accounts Filing
                {totals.unfiled > 0 && (
                  <span className="semsas-tab-badge warning">{totals.unfiled}</span>
                )}
              </button>

              <button
                type="button"
                className={`semsas-tab-btn ${activeTab === "report" ? "active" : ""}`}
                onClick={() => setActiveTab("report")}
              >
                <FiFileText />
                Official Report & QR
              </button>
            </div>

            <div className="semsas-tab-actions">
              <button
                type="button"
                className="semsas-btn-secondary"
                onClick={loadTransfers}
                disabled={loading}
                title="Refresh records"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
                <span className="hidden-mobile">Refresh</span>
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="registration-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="security-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FiCheckCircle />
              <span>{success}</span>
            </div>
          )}

          {/* TAB 1: TRANSFERS REGISTER */}
          {activeTab === "register" && (
            <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Responsive Search & Filter Bar */}
              <div className="semsas-toolbar">
                <div className="semsas-toolbar-top">
                  <div className="semsas-search-box">
                    <FiSearch />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void loadTransfers();
                      }}
                      placeholder="Search by patient, facility, plate, or driver..."
                    />
                    {search && (
                      <button
                        type="button"
                        className="semsas-clear-search-btn"
                        onClick={() => {
                          setSearch("");
                          void loadTransfers();
                        }}
                      >
                        <FiX />
                      </button>
                    )}
                  </div>

                  <div className="semsas-toolbar-controls">
                    <div className="semsas-month-picker">
                      <FiClock />
                      <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        title="Filter by month"
                      />
                      {filterMonth && (
                        <button
                          type="button"
                          className="semsas-clear-search-btn"
                          onClick={() => setFilterMonth("")}
                          title="Clear month"
                        >
                          <FiX />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="semsas-filter-chips">
                  <button
                    type="button"
                    className={`semsas-filter-chip ${filingStatus === "" ? "active" : ""}`}
                    onClick={() => setFilingStatus("")}
                  >
                    All Trips ({transfers.length})
                  </button>
                  <button
                    type="button"
                    className={`semsas-filter-chip ${filingStatus === "unfiled" ? "active" : ""}`}
                    onClick={() => setFilingStatus("unfiled")}
                  >
                    Pending Filing ({totals.unfiled})
                  </button>
                  <button
                    type="button"
                    className={`semsas-filter-chip ${filingStatus === "filed" ? "active" : ""}`}
                    onClick={() => setFilingStatus("filed")}
                  >
                    Filed ({totals.filed})
                  </button>
                </div>
              </div>

              {/* Transfers Card Grid */}
              {loading ? (
                <div className="semsas-empty-state">
                  <FiRefreshCw className="animate-spin semsas-empty-icon" />
                  <h3>Loading ambulance records...</h3>
                </div>
              ) : transfers.length === 0 ? (
                <div className="semsas-empty-state">
                  <div className="semsas-empty-icon">
                    <FiTruck />
                  </div>
                  <h3>No SEMSAS ambulance trips found</h3>
                  <p>
                    {search || filterMonth || filingStatus
                      ? "No records match your current search criteria. Try clearing some filters."
                      : "No ambulance transfers have been recorded yet. Click below to add the first movement."}
                  </p>
                  {search || filterMonth || filingStatus ? (
                    <button
                      type="button"
                      className="semsas-btn-secondary"
                      onClick={() => {
                        setSearch("");
                        setFilterMonth("");
                        setFilingStatus("");
                      }}
                    >
                      Clear All Filters
                    </button>
                  ) : canCreate ? (
                    <button
                      type="button"
                      className="semsas-btn-primary"
                      onClick={() => setActiveTab("create")}
                    >
                      <FiPlus /> Log First Transfer
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="semsas-register-grid">
                  {transfers.map((transfer) => {
                    const meta = transferTypesMeta[transfer.transferType];
                    const initials = transfer.patientName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <article key={transfer.id} className="semsas-card">
                        <div className="semsas-card-top">
                          <div className="semsas-card-patient">
                            <div className="semsas-patient-avatar">{initials}</div>
                            <div className="semsas-patient-text">
                              <strong>{transfer.patientName}</strong>
                              <span>{transfer.patientPhone || "No contact phone"}</span>
                            </div>
                          </div>
                          <span
                            className={`semsas-status-badge ${transfer.filedAt ? "filed" : "unfiled"}`}
                          >
                            {transfer.filedAt ? `Filed: ${transfer.filedMonth}` : "Pending Filing"}
                          </span>
                        </div>

                        {/* Visual Route Flow */}
                        <div className="semsas-route-block">
                          <span className="semsas-route-tag">
                            <meta.icon /> {meta.routeTag}
                          </span>
                          <div className="semsas-route-arrow-flow">
                            <span className="semsas-route-facility origin" title={transfer.fromFacility}>
                              {transfer.fromFacility}
                            </span>
                            <span className="semsas-route-arrow-icon">→</span>
                            <span className="semsas-route-facility" title={transfer.toFacility}>
                              {transfer.toFacility}
                            </span>
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="semsas-card-meta-grid">
                          <div className="semsas-card-meta-item">
                            <small>Date & Time</small>
                            <strong>{formatDate(transfer.transferDate)}</strong>
                          </div>
                          <div className="semsas-card-meta-item">
                            <small>Vehicle & Plate</small>
                            <strong title={transfer.ambulancePlateNumber || "N/A"}>
                              {transfer.ambulancePlateNumber || transfer.ambulanceProvider || "Fleet"}
                            </strong>
                          </div>
                          <div className="semsas-card-meta-item">
                            <small>Driver</small>
                            <strong title={transfer.driverName || "N/A"}>
                              {transfer.driverName || "Not assigned"}
                            </strong>
                          </div>
                          <div className="semsas-card-meta-item">
                            <small>Driver Phone</small>
                            <strong>
                              {transfer.driverPhone ? (
                                <a href={`tel:${transfer.driverPhone}`} className="semsas-tel-link">
                                  <FiPhone /> {transfer.driverPhone}
                                </a>
                              ) : (
                                "No phone"
                              )}
                            </strong>
                          </div>
                        </div>

                        {/* Footer Fee & Action */}
                        <div className="semsas-card-footer">
                          <div className="semsas-card-fee">
                            <small>Transfer Fee</small>
                            <strong>{money(transfer.feeAmount)}</strong>
                          </div>
                          <button
                            type="button"
                            className="semsas-card-action-btn"
                            onClick={() => setSelectedTransfer(transfer)}
                          >
                            <FiFileText /> Details
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 2: LOG NEW AMBULANCE TRANSFER */}
          {activeTab === "create" && (
            <div className="semsas-form-wrapper">
              <form className="semsas-form-card" onSubmit={handleSubmit}>
                <div className="semsas-form-section-title">
                  <FiTruck />
                  <span>1. Transfer Type & Direction</span>
                </div>

                <div className="semsas-direction-grid">
                  {(Object.keys(transferTypesMeta) as SemsasTransferType[]).map((type) => {
                    const meta = transferTypesMeta[type];
                    const active = form.transferType === type;
                    const Icon = meta.icon;

                    return (
                      <button
                        key={type}
                        type="button"
                        className={`semsas-direction-card ${active ? "active" : ""}`}
                        onClick={() => handleTransferType(type)}
                      >
                        <div className="semsas-direction-header">
                          <strong>{meta.label}</strong>
                          <div className="semsas-direction-icon">
                            <Icon />
                          </div>
                        </div>
                        <p className="semsas-direction-desc">{meta.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="semsas-form-section-title">
                  <FiUser />
                  <span>2. Patient Information</span>
                </div>

                <div className="semsas-patient-toggle">
                  <button
                    type="button"
                    className={`semsas-toggle-btn ${patientMode === "registered" ? "active" : ""}`}
                    onClick={() => setPatientMode("registered")}
                  >
                    <FiUser /> Existing Hospital Patient
                  </button>
                  <button
                    type="button"
                    className={`semsas-toggle-btn ${patientMode === "walkin" ? "active" : ""}`}
                    onClick={() => {
                      setPatientMode("walkin");
                      setSelectedPatientId(null);
                      setForm((prev) => ({ ...prev, patientId: undefined }));
                    }}
                  >
                    <FiPlus /> External / Emergency Walk-in
                  </button>
                </div>

                {patientMode === "registered" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--text-strong)" }}>
                      Search & Select Patient
                    </label>
                    <PatientSearchSelect
                      patients={patients}
                      selectedPatientId={selectedPatientId}
                      onSelectPatient={handlePatientSelect}
                      placeholder="Type name, phone number or MRN to select patient..."
                      allowClear
                    />
                    {form.patientName && (
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "var(--surface-strong)",
                          fontSize: "0.84rem",
                        }}
                      >
                        <span>
                          <strong>Selected:</strong> {form.patientName}
                        </span>
                        {form.patientPhone && (
                          <span>
                            <strong>Phone:</strong> {form.patientPhone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-grid">
                    <label>
                      Patient Full Name *
                      <input
                        value={form.patientName}
                        onChange={(e) => updateField("patientName", e.target.value)}
                        placeholder="e.g. Fatima Abubakar"
                        required
                      />
                    </label>
                    <label>
                      Patient Contact Phone
                      <input
                        value={form.patientPhone}
                        onChange={(e) => updateField("patientPhone", e.target.value)}
                        placeholder="e.g. 08012345678"
                      />
                    </label>
                  </div>
                )}

                <div className="semsas-form-section-title">
                  <FiMapPin />
                  <span>3. Route & Dispatch Schedule</span>
                </div>

                <div className="form-grid">
                  <label>
                    Origin / From Facility *
                    <input
                      value={form.fromFacility}
                      onChange={(e) => updateField("fromFacility", e.target.value)}
                      placeholder="e.g. MDS Specialist Hospital Kano"
                      required
                    />
                    <div className="semsas-preset-chips">
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Quick fill:</span>
                      {FACILITY_PRESETS.slice(0, 3).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="semsas-preset-chip"
                          onClick={() => updateField("fromFacility", f)}
                        >
                          {f.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label>
                    Destination / To Facility *
                    <input
                      value={form.toFacility}
                      onChange={(e) => updateField("toFacility", e.target.value)}
                      placeholder="e.g. Aminu Kano Teaching Hospital"
                      required
                    />
                    <div className="semsas-preset-chips">
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Quick fill:</span>
                      {FACILITY_PRESETS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="semsas-preset-chip"
                          onClick={() => updateField("toFacility", f)}
                        >
                          {f.includes("(") ? f.slice(f.indexOf("(") + 1, f.indexOf(")")) : f.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Transfer Date & Time *</span>
                      <button
                        type="button"
                        onClick={setTimeNow}
                        className="semsas-preset-chip"
                        style={{ borderStyle: "solid" }}
                      >
                        Set to Now
                      </button>
                    </div>
                    <input
                      type="datetime-local"
                      value={form.transferDate}
                      onChange={(e) => updateField("transferDate", e.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Ambulance Service Fee (NGN)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.feeAmount}
                      onChange={(e) => updateField("feeAmount", e.target.value)}
                      placeholder="0.00"
                    />
                  </label>
                </div>

                {/* Collapsible Vehicle & Crew Accordion */}
                <div className="semsas-accordion">
                  <div
                    className="semsas-accordion-summary"
                    onClick={() => setShowVehicleDetails(!showVehicleDetails)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FiTruck style={{ color: "#0f766e" }} />
                      <span>Vehicle, Driver & Location Details (Optional)</span>
                    </div>
                    {showVehicleDetails ? <FiChevronUp /> : <FiChevronDown />}
                  </div>

                  {showVehicleDetails && (
                    <div className="semsas-accordion-content">
                      <div className="form-grid">
                        <label>
                          Ambulance Provider
                          <input
                            value={form.ambulanceProvider}
                            onChange={(e) => updateField("ambulanceProvider", e.target.value)}
                            placeholder="e.g. MDS Emergency Fleet / Kano SEMSAS"
                          />
                        </label>
                        <label>
                          Ambulance Plate Number
                          <input
                            value={form.ambulancePlateNumber}
                            onChange={(e) => updateField("ambulancePlateNumber", e.target.value)}
                            placeholder="e.g. KAN-123-XA"
                          />
                        </label>
                        <label>
                          Driver Full Name
                          <input
                            value={form.driverName}
                            onChange={(e) => updateField("driverName", e.target.value)}
                            placeholder="e.g. Usman Danladi"
                          />
                        </label>
                        <label>
                          Driver Contact Phone
                          <input
                            value={form.driverPhone}
                            onChange={(e) => updateField("driverPhone", e.target.value)}
                            placeholder="e.g. 08034567890"
                          />
                        </label>
                        <label>
                          Pickup Street Address
                          <input
                            value={form.pickupAddress}
                            onChange={(e) => updateField("pickupAddress", e.target.value)}
                            placeholder="e.g. Ward 4 Emergency Gate, MDS Kano"
                          />
                        </label>
                        <label>
                          Destination Address
                          <input
                            value={form.destinationAddress}
                            onChange={(e) => updateField("destinationAddress", e.target.value)}
                            placeholder="e.g. Emergency Department, AKTH Zaria Road"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <label>
                  Operational & Clinical Notes
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={3}
                    placeholder="Provide any clinical details, oxygen support requirements, accompanying paramedic, or special instructions..."
                  />
                </label>

                <div className="semsas-form-actions">
                  <button
                    type="button"
                    className="semsas-btn-secondary"
                    onClick={() => {
                      setForm({
                        ...emptyForm,
                        transferDate: new Date().toISOString().slice(0, 16),
                      });
                      setSelectedPatientId(null);
                    }}
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    className="semsas-btn-primary"
                    disabled={saving || !canCreate}
                  >
                    <FiSave />
                    {saving ? "Saving Dispatch..." : "Save SEMSAS Record"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MONTHLY ACCOUNTS FILING */}
          {activeTab === "filing" && (
            <div className="semsas-filing-wrapper">
              <div className="semsas-filing-card">
                <div className="semsas-filing-header">
                  <div>
                    <h2>Monthly Accounts Reconciliation</h2>
                    <p>
                      Reconcile unfiled ambulance trips and submit the verified batch to the Hospital
                      Accounts department.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="semsas-btn-secondary"
                    onClick={loadTransfers}
                    disabled={loading}
                  >
                    <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh Status
                  </button>
                </div>

                <div
                  className={`semsas-filing-highlight-box ${totals.unfiled === 0 ? "clean" : ""}`}
                >
                  <div className="semsas-filing-highlight-text">
                    <strong>
                      {totals.unfiled === 0
                        ? "All ambulance dispatches are filed!"
                        : `${totals.unfiled} Unfiled Trip(s) Pending Accounts Submission`}
                    </strong>
                    <span>
                      {totals.unfiled === 0
                        ? "No pending unfiled transfers require accounts action right now."
                        : `Total unfiled value: ${money(totals.unfiledAmount)} across all registered trips.`}
                    </span>
                  </div>
                  <span
                    className={`semsas-status-badge ${totals.unfiled === 0 ? "filed" : "unfiled"}`}
                    style={{ fontSize: "0.85rem", padding: "6px 14px" }}
                  >
                    {totals.unfiled === 0 ? "Reconciled" : "Action Required"}
                  </span>
                </div>

                <div className="form-grid">
                  <label>
                    Target Filing Month *
                    <input
                      type="month"
                      value={filingMonth}
                      onChange={(e) => setFilingMonth(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Accounts Audit Notes
                    <input
                      value={filingNotes}
                      onChange={(e) => setFilingNotes(e.target.value)}
                      placeholder="e.g. Reconciled with Kano State SEMSAS remittance"
                    />
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    className="semsas-btn-primary"
                    disabled={filing || !canFile || totals.unfiled === 0}
                    onClick={handleFileMonth}
                  >
                    <FiArchive />
                    {filing ? "Submitting to Accounts..." : `File All Records for ${filingMonth}`}
                  </button>
                </div>
              </div>

              {/* Unfiled Records Preview Table */}
              <div className="semsas-filing-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-strong)" }}>
                    Trips Eligible for Filing ({totals.unfiledList.length})
                  </h3>
                  <span style={{ fontSize: "0.84rem", color: "var(--muted)" }}>
                    Value: {money(totals.unfiledAmount)}
                  </span>
                </div>

                {totals.unfiledList.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
                    No unfiled records pending submission.
                  </p>
                ) : (
                  <div className="semsas-print-table-container">
                    <table className="semsas-print-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Patient</th>
                          <th>Route</th>
                          <th>Ambulance</th>
                          <th>Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totals.unfiledList.map((trip) => (
                          <tr key={trip.id}>
                            <td>{formatDate(trip.transferDate)}</td>
                            <td>
                              <strong>{trip.patientName}</strong>
                              <small style={{ color: "var(--muted)" }}>{trip.patientPhone || "No phone"}</small>
                            </td>
                            <td>
                              {trip.fromFacility} → {trip.toFacility}
                            </td>
                            <td>{trip.ambulancePlateNumber || trip.ambulanceProvider || "Fleet"}</td>
                            <td>
                              <strong>{money(trip.feeAmount)}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PRINTABLE OFFICIAL REPORT & VERIFICATION PREVIEW */}
          {activeTab === "report" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--text-strong)" }}>
                    Official Kano SEMSAS Filing Report
                  </h2>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                    Live document preview with verifiable authentication QR code. Click Print to export.
                  </p>
                </div>
                <button type="button" className="semsas-btn-primary" onClick={handlePrint}>
                  <FiPrinter /> Print Official Document
                </button>
              </div>

              <div className="semsas-print-wrapper" aria-label="Official Kano SEMSAS Report">
                <div className="semsas-print-header-top">
                  <div className="semsas-print-brand">
                    <img src={mdsLogo} alt="MDS Specialist Hospital Logo" />
                    <div>
                      <p>MDS SPECIALIST HOSPITAL KANO</p>
                      <h2>SEMSAS Monthly Ambulance Filing & Audit Report</h2>
                      <span className="semsas-print-meta">
                        Reporting Month: {filterMonth || "All Recorded"} | Filing Filter:{" "}
                        {filingStatus ? filingStatus.toUpperCase() : "ALL RECORDS"} | Total Logs:{" "}
                        {transfers.length}
                      </span>
                    </div>
                  </div>

                  {semsasQrDataUrl && (
                    <div className="semsas-print-qr-box">
                      <img src={semsasQrDataUrl} alt="SEMSAS Verification QR" />
                      <small>Scan to Verify</small>
                    </div>
                  )}
                </div>

                <div className="semsas-print-summary-row">
                  <div className="semsas-print-summary-box">
                    <small>Total Movement Value</small>
                    <strong>{money(totals.amount)}</strong>
                  </div>
                  <div className="semsas-print-summary-box">
                    <small>Filed to Accounts</small>
                    <strong>
                      {totals.filed} trips ({money(totals.filedAmount)})
                    </strong>
                  </div>
                  <div className="semsas-print-summary-box">
                    <small>Unfiled Trips</small>
                    <strong>{totals.unfiled} trips</strong>
                  </div>
                  <div className="semsas-print-summary-box">
                    <small>Unfiled Revenue</small>
                    <strong>{money(totals.unfiledAmount)}</strong>
                  </div>
                </div>

                <div className="semsas-print-table-container">
                  <table className="semsas-print-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Patient</th>
                        <th>Origin & Destination</th>
                        <th>Ambulance & Plate</th>
                        <th>Status</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map((t) => (
                        <tr key={t.id}>
                          <td>{formatDate(t.transferDate)}</td>
                          <td>
                            <strong>{t.patientName}</strong>
                            <small>{t.patientPhone || "No phone"}</small>
                          </td>
                          <td>
                            <strong>{t.fromFacility}</strong>
                            <small>to {t.toFacility}</small>
                          </td>
                          <td>
                            <strong>{t.ambulanceProvider || "Fleet"}</strong>
                            <small>{t.ambulancePlateNumber || "No plate"}</small>
                          </td>
                          <td>
                            <span
                              className={`semsas-status-badge ${t.filedAt ? "filed" : "unfiled"}`}
                            >
                              {t.filedAt ? `Filed ${t.filedMonth}` : "Unfiled"}
                            </span>
                          </td>
                          <td>
                            <strong>{money(t.feeAmount)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 36,
                    paddingTop: 18,
                    borderTop: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                    color: "#64748b",
                  }}
                >
                  <div>
                    <span>Prepared by: MDS Emergency Dispatch & Front Desk</span>
                    <br />
                    <span>Generated on: {new Date().toLocaleString()}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span>Official Stamp / Accounts Audit Signature</span>
                    <div style={{ marginTop: 28, borderBottom: "1px solid #0f172a", width: 180 }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hidden Print Area Triggered by window.print() regardless of active tab */}
          {activeTab !== "report" && (
            <div className="semsas-print-wrapper" style={{ display: "none" }} aria-hidden="true">
              <div className="semsas-print-header-top">
                <div className="semsas-print-brand">
                  <img src={mdsLogo} alt="MDS Specialist Hospital Logo" />
                  <div>
                    <p>MDS SPECIALIST HOSPITAL KANO</p>
                    <h2>SEMSAS Monthly Ambulance Filing & Audit Report</h2>
                    <span className="semsas-print-meta">
                      Reporting Month: {filterMonth || "All Recorded"} | Filing Filter:{" "}
                      {filingStatus ? filingStatus.toUpperCase() : "ALL RECORDS"} | Total Logs:{" "}
                      {transfers.length}
                    </span>
                  </div>
                </div>

                {semsasQrDataUrl && (
                  <div className="semsas-print-qr-box">
                    <img src={semsasQrDataUrl} alt="SEMSAS Verification QR" />
                    <small>Scan to Verify</small>
                  </div>
                )}
              </div>

              <div className="semsas-print-summary-row">
                <div className="semsas-print-summary-box">
                  <small>Total Movement Value</small>
                  <strong>{money(totals.amount)}</strong>
                </div>
                <div className="semsas-print-summary-box">
                  <small>Filed to Accounts</small>
                  <strong>
                    {totals.filed} trips ({money(totals.filedAmount)})
                  </strong>
                </div>
                <div className="semsas-print-summary-box">
                  <small>Unfiled Trips</small>
                  <strong>{totals.unfiled} trips</strong>
                </div>
                <div className="semsas-print-summary-box">
                  <small>Unfiled Revenue</small>
                  <strong>{money(totals.unfiledAmount)}</strong>
                </div>
              </div>

              <div className="semsas-print-table-container">
                <table className="semsas-print-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Patient</th>
                      <th>Origin & Destination</th>
                      <th>Ambulance & Plate</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t) => (
                      <tr key={t.id}>
                        <td>{formatDate(t.transferDate)}</td>
                        <td>
                          <strong>{t.patientName}</strong>
                          <small>{t.patientPhone || "No phone"}</small>
                        </td>
                        <td>
                          <strong>{t.fromFacility}</strong>
                          <small>to {t.toFacility}</small>
                        </td>
                        <td>
                          <strong>{t.ambulanceProvider || "Fleet"}</strong>
                          <small>{t.ambulancePlateNumber || "No plate"}</small>
                        </td>
                        <td>{t.filedAt ? `Filed ${t.filedMonth}` : "Unfiled"}</td>
                        <td>{money(t.feeAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transfer Detail Modal */}
          {selectedTransfer && (
            <div className="semsas-modal-backdrop" onClick={() => setSelectedTransfer(null)}>
              <div className="semsas-modal-panel" onClick={(e) => e.stopPropagation()}>
                <div className="semsas-modal-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="semsas-patient-avatar">
                      {selectedTransfer.patientName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3>{selectedTransfer.patientName}</h3>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                        {selectedTransfer.patientPhone || "No phone provided"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="semsas-modal-close-btn"
                    onClick={() => setSelectedTransfer(null)}
                  >
                    <FiX />
                  </button>
                </div>

                {/* Status & Direction */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span
                    className={`semsas-status-badge ${selectedTransfer.filedAt ? "filed" : "unfiled"}`}
                  >
                    {selectedTransfer.filedAt
                      ? `Filed to Accounts: ${selectedTransfer.filedMonth}`
                      : "Pending Accounts Filing"}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#0f766e", fontWeight: 700 }}>
                    {transferTypesMeta[selectedTransfer.transferType]?.label}
                  </span>
                </div>

                {/* Section 1: Route & Timing */}
                <div className="semsas-modal-section">
                  <h4>Dispatch Route & Timing</h4>
                  <div className="semsas-modal-details-grid">
                    <div className="semsas-modal-item">
                      <small>From Facility</small>
                      <strong>{selectedTransfer.fromFacility}</strong>
                    </div>
                    <div className="semsas-modal-item">
                      <small>To Facility</small>
                      <strong>{selectedTransfer.toFacility}</strong>
                    </div>
                    <div className="semsas-modal-item">
                      <small>Scheduled Transfer Date</small>
                      <strong>{formatDate(selectedTransfer.transferDate)}</strong>
                    </div>
                    <div className="semsas-modal-item">
                      <small>Fee Amount</small>
                      <strong style={{ color: "#0f766e", fontSize: "1.05rem" }}>
                        {money(selectedTransfer.feeAmount)}
                      </strong>
                    </div>
                    {selectedTransfer.pickupAddress && (
                      <div className="semsas-modal-item" style={{ gridColumn: "1 / -1" }}>
                        <small>Pickup Address</small>
                        <strong>{selectedTransfer.pickupAddress}</strong>
                      </div>
                    )}
                    {selectedTransfer.destinationAddress && (
                      <div className="semsas-modal-item" style={{ gridColumn: "1 / -1" }}>
                        <small>Destination Address</small>
                        <strong>{selectedTransfer.destinationAddress}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Vehicle & Driver Crew */}
                <div className="semsas-modal-section">
                  <h4>Ambulance & Crew Details</h4>
                  <div className="semsas-modal-details-grid">
                    <div className="semsas-modal-item">
                      <small>Provider / Fleet</small>
                      <strong>{selectedTransfer.ambulanceProvider || "MDS Fleet"}</strong>
                    </div>
                    <div className="semsas-modal-item">
                      <small>Plate Number</small>
                      <strong>{selectedTransfer.ambulancePlateNumber || "Not recorded"}</strong>
                    </div>
                    <div className="semsas-modal-item">
                      <small>Driver Name</small>
                      <strong>{selectedTransfer.driverName || "Not recorded"}</strong>
                    </div>
                    <div className="semsas-modal-item">
                      <small>Driver Contact</small>
                      <strong>
                        {selectedTransfer.driverPhone ? (
                          <a href={`tel:${selectedTransfer.driverPhone}`} className="semsas-tel-link">
                            <FiPhone /> {selectedTransfer.driverPhone}
                          </a>
                        ) : (
                          "No phone recorded"
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Section 3: Notes & Audit */}
                {(selectedTransfer.notes || selectedTransfer.filingNotes) && (
                  <div className="semsas-modal-section">
                    <h4>Clinical & Audit Notes</h4>
                    {selectedTransfer.notes && (
                      <div className="semsas-modal-item">
                        <small>Operational Notes</small>
                        <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--text-strong)" }}>
                          {selectedTransfer.notes}
                        </p>
                      </div>
                    )}
                    {selectedTransfer.filingNotes && (
                      <div className="semsas-modal-item">
                        <small>Accounts Filing Notes</small>
                        <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--text-strong)" }}>
                          {selectedTransfer.filingNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    className="semsas-btn-secondary"
                    onClick={() => setSelectedTransfer(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
