import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiClipboard,
  FiEdit3,
  FiFileText,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiLayers,
  FiClock,
  FiActivity,
  FiSliders,
  FiWifi,
  FiWifiOff,
  FiAlertTriangle,
  FiPlus,
  FiCheck,
  FiX,
  FiVolume2,
  FiVolumeX,
  FiExternalLink,
  FiCopy,
} from "react-icons/fi";
import { FaFlask, FaPhoneSlash } from "react-icons/fa";
import QRCode from "qrcode";
import { getAppUrl } from "../../utils/appUrl";
import PatientSearchSelect from "../../components/common/PatientSearchSelect";
import AdminLayout from "../../layouts/AdminLayout";
import { useOfflineQueueCount } from "../../hooks/useOfflineSync";
import { flushOfflineQueue } from "../../utils/offlineQueue";
import LaboratoryPrintModal from "../../components/laboratory/LaboratoryPrintModal";
import "../../styles/laboratory-studio.css";
import { fetchPatients } from "../../services/patients/patientService";
import {
  completeLaboratoryRequest,
  createLaboratoryRequest,
  fetchLaboratoryRequests,
  fetchLaboratoryTemplates,
  updateLaboratoryRequestStatus,
} from "../../services/laboratoryService";
import { useAuthStore } from "../../store/authStore";
import type { Patient } from "../../types/patient";
import type {
  LaboratoryRequest,
  LaboratoryRequestFormValues,
  LaboratoryRequestStatus,
  LaboratoryResultFormValues,
  LaboratoryTemplate,
  LaboratorySummary,
} from "../../types/laboratory";
import {
  HMS_DATA_MUTATED_EVENT,
  HMS_SYNC_FLUSHED_EVENT,
} from "../../utils/appEvents";
import {
  startContinuousPhoneRing,
  stopContinuousPhoneRing,
} from "../../utils/alertSound";

// 4 simple, uncluttered tabs for everyday laboratory work
type LabTab = "queue" | "results" | "order" | "completed";

const emptyRequestForm: LaboratoryRequestFormValues = {
  patientId: "",
  templateId: "",
  clinicalNotes: "",
  manualPatientName: "",
  manualPatientGender: "other",
  manualPatientPhone: "",
  manualPatientAge: "",
};

const emptyResultForm: LaboratoryResultFormValues = {
  resultValues: {},
  interpretation: "",
  technicianNote: "",
};

function patientName(patient?: Patient | null) {
  if (!patient) return "Walk-in Patient";
  return `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Unknown Patient";
}

function templateLabel(template: LaboratoryTemplate) {
  return `${template.name}${template.code ? ` | ${template.code}` : ""}${template.specimen ? ` | ${template.specimen}` : ""}`;
}

function stringResult(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requestDisplayName(request: LaboratoryRequest) {
  const customName = stringResult(request.resultValues?.test_name);
  return customName || request.template.name;
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

function statusLabel(status: LaboratoryRequestStatus) {
  return status.replace(/_/g, " ").toUpperCase();
}

function requestToResultForm(request: LaboratoryRequest): LaboratoryResultFormValues {
  const values = request.resultValues ?? {};

  return {
    resultValues: request.template.fields.reduce<Record<string, string>>((accumulator, field) => {
      accumulator[field.key] = String(values[field.key] ?? "");
      return accumulator;
    }, {}),
    interpretation: request.interpretation ?? "",
    technicianNote: request.technicianNote ?? "",
  };
}

// Live numeric/text flag evaluation for clinical analyte values
function evaluateLiveFlag(referenceRange?: string | null, value?: string) {
  if (!value || !value.trim() || !referenceRange) return null;
  const num = parseFloat(value.trim());

  if (!isNaN(num) && referenceRange.includes("-")) {
    const parts = referenceRange.split("-").map((p) => parseFloat(p.replace(/[^0-9.]/g, "")));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (num < parts[0]) return { status: "low", label: "LOW (BELOW NORMAL)" };
      if (num > parts[1]) return { status: "high", label: "HIGH (ABOVE NORMAL)" };
      return { status: "normal", label: "NORMAL" };
    }
  }

  const lowerRef = referenceRange.toLowerCase();
  const lowerVal = value.trim().toLowerCase();
  if (lowerRef.includes("negative") || lowerRef.includes("non-reactive") || lowerRef.includes("normal")) {
    if (lowerVal.includes("positive") || lowerVal.includes("reactive") || lowerVal.includes("3+") || lowerVal.includes("4+")) {
      return { status: "abnormal", label: "ABNORMAL / REACTIVE" };
    }
    if (lowerVal.includes("negative") || lowerVal.includes("non-reactive") || lowerVal.includes("normal")) {
      return { status: "normal", label: "NORMAL" };
    }
  }

  return null;
}

function LabQrThumbnail({
  request,
  onOpenQuickQr,
}: {
  request: LaboratoryRequest;
  onOpenQuickQr: (req: LaboratoryRequest) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const targetId = request.requestNumber || request.id;
  const verificationUrl = getAppUrl(`/verify/lab/${encodeURIComponent(targetId)}`);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(verificationUrl, {
      width: 72,
      margin: 1,
      color: { dark: "#092a5e", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [verificationUrl]);

  return (
    <div className="lab-table-qr-wrap" title="Scan with smartphone camera to view verified results">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR ${targetId}`}
          className="lab-table-qr-img"
          onClick={() => onOpenQuickQr(request)}
        />
      ) : (
        <div className="lab-table-qr-placeholder" onClick={() => onOpenQuickQr(request)}>
          QR
        </div>
      )}
      <button
        type="button"
        className="lab-table-qr-action-btn"
        onClick={() => onOpenQuickQr(request)}
      >
        Scan / Verify ↗
      </button>
    </div>
  );
}

function LabQrLargeView({ requestNumber }: { requestNumber: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const verificationUrl = getAppUrl(`/verify/lab/${encodeURIComponent(requestNumber)}`);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#092a5e", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [verificationUrl]);

  if (!dataUrl) {
    return (
      <div style={{ width: 200, height: 200, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
        Generating QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`Verification QR ${requestNumber}`}
      style={{ width: "200px", height: "200px", display: "block" }}
    />
  );
}

export default function LaboratoryPage() {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];
  const roles = user?.roles ?? [];
  const isSuperAdmin = roles.some((role) => role.toLowerCase() === "super admin");
  const isLaboratoryRole = roles.some((role) => role.toLowerCase() === "laboratory");
  const canManageTemplates = isSuperAdmin || isLaboratoryRole;
  const canCreate = permissions.includes("laboratory.create");
  const canUpdate = permissions.includes("laboratory.update");
  const canComplete = permissions.includes("laboratory.result");

  const {
    pendingCount: offlinePendingCount,
    isBrowserOnline,
  } = useOfflineQueueCount();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<LaboratoryTemplate[]>([]);
  const [requests, setRequests] = useState<LaboratoryRequest[]>([]);
  const [summary, setSummary] = useState<LaboratorySummary>({});
  const [activeTab, setActiveTab] = useState<LabTab>("queue");
  const [requestSearch, setRequestSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [templatePicker, setTemplatePicker] = useState("");
  const [templateCategory, setTemplateCategory] = useState("All");
  const [patientSelectionMode, setPatientSelectionMode] = useState<"registered" | "manual">("registered");
  const [requestForm, setRequestForm] = useState<LaboratoryRequestFormValues>(emptyRequestForm);
  const [activeResult, setActiveResult] = useState<LaboratoryRequest | null>(null);
  const [resultForm, setResultForm] = useState<LaboratoryResultFormValues>(emptyResultForm);
  const activeResultRef = useRef<LaboratoryRequest | null>(null);
  activeResultRef.current = activeResult;
  const [printModalRequest, setPrintModalRequest] = useState<LaboratoryRequest | null>(null);
  const [printModalDocType, setPrintModalDocType] = useState<"result" | "request">("result");
  const [quickQrRequest, setQuickQrRequest] = useState<LaboratoryRequest | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live incoming laboratory telephone alert ring state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mutedRequestIds, setMutedRequestIds] = useState<Set<string>>(new Set());

  const pendingCollectionCount = summary.pending ?? 0;
  const inProgressCount = (summary.sample_collected ?? 0) + (summary.in_progress ?? 0);
  const completedCount = summary.completed ?? 0;

  // Unhandled / fresh incoming laboratory test orders
  const unhandledRequests = useMemo(() => {
    return requests.filter(
      (req) =>
        (req.status === "pending" || req.status === "sample_collected") &&
        !mutedRequestIds.has(req.id)
    );
  }, [requests, mutedRequestIds]);

  const shouldRing = soundEnabled && unhandledRequests.length > 0;

  // Continuous telephone ringing alert effect for new incoming lab requests
  useEffect(() => {
    if (shouldRing) {
      startContinuousPhoneRing();
    } else {
      stopContinuousPhoneRing();
    }

    return () => {
      stopContinuousPhoneRing();
    };
  }, [shouldRing]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === requestForm.templateId),
    [requestForm.templateId, templates]
  );

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === requestForm.patientId),
    [patients, requestForm.patientId]
  );

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.isActive),
    [templates]
  );

  const templateCategories = useMemo(
    () => ["All", ...Array.from(new Set(activeTemplates.map((template) => template.category || "General"))).sort()],
    [activeTemplates]
  );

  const visibleTemplates = useMemo(() => {
    const search = templatePicker.trim().toLowerCase();

    return activeTemplates
      .filter((template) => templateCategory === "All" || (template.category || "General") === templateCategory)
      .filter((template) =>
        !search ||
        template.name.toLowerCase().includes(search) ||
        (template.code ?? "").toLowerCase().includes(search) ||
        (template.specimen ?? "").toLowerCase().includes(search)
      )
      .slice(0, 16);
  }, [activeTemplates, templateCategory, templatePicker]);

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    const [patientResult, templateResult, requestResult] = await Promise.all([
      fetchPatients({ status: "active" }),
      fetchLaboratoryTemplates("", false),
      fetchLaboratoryRequests({ search: requestSearch }),
    ]);

    if (!silent) {
      setLoading(false);
    }

    if (patientResult) {
      setPatients(patientResult);
    }

    if (templateResult.result) {
      setTemplates(templateResult.result.items);
    }

    if (requestResult.result) {
      setRequests(requestResult.result.items);
      setSummary(requestResult.result.summary);

      // Only auto-select on initial user load (non-silent) if no test is currently active
      if (!silent && !activeResultRef.current) {
        const awaiting = requestResult.result.items.find(
          (r) => r.status === "sample_collected" || r.status === "in_progress" || r.status === "pending"
        );
        if (awaiting) {
          setActiveResult(awaiting);
          setResultForm(requestToResultForm(awaiting));
        }
      } else if (activeResultRef.current) {
        // Keep active test metadata fresh without touching the user's in-progress form inputs
        const currentId = activeResultRef.current.id;
        const fresh = requestResult.result.items.find((r) => r.id === currentId);
        if (fresh) {
          setActiveResult((prev) =>
            prev ? { ...prev, status: fresh.status, requestNumber: fresh.requestNumber } : fresh
          );
        }
      }
    } else if (requestResult.error && !silent) {
      setError(requestResult.error);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time background polling for incoming lab test orders
  useEffect(() => {
    const pollInterval = setInterval(() => {
      void loadData(true);
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [requestSearch]);

  useEffect(() => {
    const handleMutation = () => {
      void loadData(true);
    };

    window.addEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);

    return () => {
      window.removeEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, handleMutation);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const flushResult = await flushOfflineQueue();
      if (flushResult.synced > 0) {
        setSuccess(`Synchronized ${flushResult.synced} offline item(s) to server.`);
      }
      await loadData();
    } catch {
      setError("Unable to complete sync. Please verify internet connection.");
    } finally {
      setSyncing(false);
    }
  };

  const handleTemplateSelect = (template: LaboratoryTemplate) => {
    setTemplatePicker(templateLabel(template));
    setRequestForm((current) => ({ ...current, templateId: template.id }));
  };

  const handleTemplatePick = (value: string) => {
    setTemplatePicker(value);
    const template = templates.find((item) => templateLabel(item) === value);
    setRequestForm((current) => ({ ...current, templateId: template?.id ?? "" }));
  };

  const handleRequestSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (patientSelectionMode === "registered" && !requestForm.patientId) {
      setError("Please pick a registered hospital patient or switch to Walk-in mode.");
      return;
    }

    if (patientSelectionMode === "manual" && (!requestForm.manualPatientName || !requestForm.manualPatientName.trim())) {
      setError("Please type the patient's name.");
      return;
    }

    if (!requestForm.templateId) {
      setError("Please choose a diagnostic test template.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const submissionPayload: LaboratoryRequestFormValues = {
      ...requestForm,
      patientId: patientSelectionMode === "registered" ? requestForm.patientId : "",
      manualPatientName: patientSelectionMode === "manual" ? requestForm.manualPatientName?.trim() : undefined,
    };

    const result = await createLaboratoryRequest(submissionPayload);
    setSaving(false);

    if (!result.request) {
      setError(result.error ?? "Unable to create laboratory test order.");
      return;
    }

    const createdPatName = patientName(result.request.patient);
    setSuccess(
      result.queued
        ? `✓ Test order saved offline for ${createdPatName}. Tracking slip ready to print.`
        : `✓ Test order #${result.request.requestNumber} created for ${createdPatName}!`
    );

    setRequestForm(emptyRequestForm);
    setTemplatePicker("");

    // Open tracking slip print modal & switch to queue
    handleOpenPrint(result.request, "request");
    setActiveTab("queue");
    await loadData();
  };

  const openResultForm = (request: LaboratoryRequest) => {
    setActiveResult(request);
    setResultForm(requestToResultForm(request));
    setActiveTab("results");
  };

  const handleResultValueChange = (key: string, value: string) => {
    setResultForm((current) => ({
      ...current,
      resultValues: { ...current.resultValues, [key]: value },
    }));
  };

  const handleCompleteResult = async (event: FormEvent) => {
    event.preventDefault();

    if (!activeResult) {
      setError("Please choose a test from the list before entering results.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await completeLaboratoryRequest(activeResult.id, resultForm);
    setSaving(false);

    if (result.queued) {
      setSuccess("✓ Result saved on this device. It will sync automatically when online.");
      handleOpenPrint(activeResult, "result");
      setActiveTab("completed");
      await loadData();
      return;
    }

    if (!result.request) {
      setError(result.error ?? "Unable to record and complete result.");
      return;
    }

    setSuccess(`✓ Test results for ${result.request.requestNumber} authorized and ready to print!`);
    handleOpenPrint(result.request, "result");
    setActiveTab("completed");
    await loadData();
  };

  const updateStatus = async (request: LaboratoryRequest, status: LaboratoryRequestStatus) => {
    setSaving(true);
    setError(null);
    const result = await updateLaboratoryRequestStatus(request.id, status);
    setSaving(false);

    if (!result.request && !result.queued) {
      setError(result.error ?? "Unable to update request status.");
      return;
    }

    setSuccess(
      result.queued
        ? `Status updated offline to ${statusLabel(status)}.`
        : `✓ Sample collected and marked as ${statusLabel(status)}.`
    );
    await loadData();
  };

  const handleOpenPrint = (request: LaboratoryRequest, docType?: "result" | "request") => {
    setPrintModalRequest(request);
    setPrintModalDocType(docType || (request.status === "completed" ? "result" : "request"));
  };

  // Filtered requests according to search and active queue filter
  const visibleRequests = useMemo(() => {
    let list = requests;

    if (activeTab === "completed") {
      list = list.filter((r) => r.status === "completed");
    } else if (activeTab === "queue") {
      if (queueFilter === "pending") {
        list = list.filter((r) => r.status === "pending");
      } else if (queueFilter === "in_progress") {
        list = list.filter((r) => r.status === "sample_collected" || r.status === "in_progress");
      } else if (queueFilter === "completed") {
        list = list.filter((r) => r.status === "completed");
      }
    }

    const term = requestSearch.trim().toLowerCase();
    if (!term) return list;

    return list.filter((r) =>
      [
        requestDisplayName(r),
        r.patient?.firstName,
        r.patient?.lastName,
        r.patient?.mrn,
        r.requestNumber,
        r.template.specimen,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [requests, activeTab, queueFilter, requestSearch]);

  // Tests that are awaiting result recording
  const testsAwaitingResults = useMemo(() => {
    return requests.filter((r) => r.status !== "completed" && r.status !== "cancelled");
  }, [requests]);

  return (
    <AdminLayout>
      <div className="lab-simple-page">
        {/* 1. FRIENDLY LAB STATION HEADER */}
        <header className="lab-simple-header">
          <div className="lab-header-left">
            <div className="lab-header-avatar">
              <FaFlask />
            </div>
            <div>
              <div className="lab-greeting-row">
                <h1>Medical Laboratory</h1>
                <span className="lab-status-badge on-duty">
                  <span className="lab-status-dot" /> On Duty
                </span>
                {isBrowserOnline ? (
                  <span className="lab-status-badge online"><FiWifi /> Cloud Connected</span>
                ) : (
                  <span className="lab-status-badge offline"><FiWifiOff /> Offline Mode</span>
                )}
              </div>
              <p className="lab-greeting-sub">
                Welcome, <strong>{user?.firstName} {user?.lastName}</strong> • MDS Diagnostic Laboratory, Kano
              </p>
            </div>
          </div>

          <div className="lab-header-actions">
            <button
              type="button"
              className={`lab-pill-btn ${soundEnabled ? "alert-on" : "muted"}`}
              onClick={() => {
                if (soundEnabled) stopContinuousPhoneRing();
                setSoundEnabled(!soundEnabled);
              }}
              title={soundEnabled ? "Mute test alert ring chime" : "Enable test alert ring chime"}
            >
              {soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
              <span>{soundEnabled ? "Chime On" : "Chime Muted"}</span>
            </button>

            {canManageTemplates && (
              <Link to="/laboratory/templates" className="lab-pill-btn templates" title="Manage test templates">
                <FiSliders />
                <span>Test Panels</span>
              </Link>
            )}

            <button
              type="button"
              className="lab-pill-btn refresh"
              disabled={loading}
              onClick={() => void loadData()}
              title="Refresh laboratory records"
            >
              <FiRefreshCw className={loading ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* 2. INCOMING DOCTOR ORDER LIVE ALERT BANNER */}
        {shouldRing && unhandledRequests.length > 0 && (
          <aside className="lab-call-alert-banner" role="alert">
            <div className="lab-alert-pulse-wrap">
              <div className="lab-alert-ripple" />
              <div className="lab-alert-icon">
                <FaFlask />
              </div>
            </div>
            <div className="lab-alert-details">
              <div className="lab-alert-tag">
                <span className="lab-live-dot" /> DOCTOR ORDERED LAB TEST • IMMEDIATE ACTION
              </div>
              <strong className="lab-alert-patient">
                {patientName(unhandledRequests[0].patient)}
              </strong>
              <div className="lab-alert-meta">
                <span>Card/MRN: <strong>{unhandledRequests[0].patient?.physicalFileNumber || unhandledRequests[0].patient?.mrn || "Pending"}</strong></span>
                <span>•</span>
                <span>Test: <strong>{requestDisplayName(unhandledRequests[0])}</strong></span>
                {unhandledRequests[0].clinicalNotes && (
                  <>
                    <span>•</span>
                    <span>Note: "{unhandledRequests[0].clinicalNotes}"</span>
                  </>
                )}
                {unhandledRequests.length > 1 && (
                  <span className="lab-alert-badge">+{unhandledRequests.length - 1} more waiting</span>
                )}
              </div>
            </div>
            <div className="lab-alert-actions">
              <button
                type="button"
                className="lab-accept-btn"
                onClick={async () => {
                  stopContinuousPhoneRing();
                  setMutedRequestIds((prev) => new Set(prev).add(unhandledRequests[0].id));
                  await updateLaboratoryRequestStatus(unhandledRequests[0].id, "sample_collected");
                  void loadData(true);
                }}
              >
                <FiCheck /> Collect Sample
              </button>
              <button
                type="button"
                className="lab-process-btn"
                onClick={() => {
                  stopContinuousPhoneRing();
                  setMutedRequestIds((prev) => new Set(prev).add(unhandledRequests[0].id));
                  openResultForm(unhandledRequests[0]);
                }}
              >
                <FiEdit3 /> Enter Result
              </button>
              <button
                type="button"
                className="lab-mute-btn"
                onClick={() => {
                  stopContinuousPhoneRing();
                  setMutedRequestIds((prev) => {
                    const next = new Set(prev);
                    unhandledRequests.forEach((req) => next.add(req.id));
                    return next;
                  });
                }}
                title="Silence ring for currently waiting requests"
              >
                <FaPhoneSlash /> Mute
              </button>
            </div>
          </aside>
        )}

        {/* 3. INSTANT FEEDBACK NOTIFICATIONS */}
        {success && (
          <div className="lab-alert-banner success">
            <FiCheckCircle />
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess(null)}><FiX /></button>
          </div>
        )}
        {error && (
          <div className="lab-alert-banner error">
            <FiAlertTriangle />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}><FiX /></button>
          </div>
        )}

        {/* Offline Queue Sync Bar */}
        {offlinePendingCount > 0 && (
          <div className="lab-offline-sync-bar">
            <span><FiWifiOff /> You have <strong>{offlinePendingCount}</strong> offline test records saved on this device.</span>
            {isBrowserOnline && (
              <button type="button" onClick={handleManualSync} disabled={syncing} className="lab-sync-btn">
                <FiRefreshCw className={syncing ? "spin" : ""} /> {syncing ? "Syncing..." : "Sync Now to Cloud"}
              </button>
            )}
          </div>
        )}

        {/* 4. FEW MENUS: 4 LARGE, CRYSTAL-CLEAR NAVIGATION TABS */}
        <nav className="lab-simple-tabs" aria-label="Laboratory Station Navigation">
          <button
            type="button"
            className={`lab-tab-btn ${activeTab === "queue" ? "active" : ""}`}
            onClick={() => setActiveTab("queue")}
          >
            <div className="lab-tab-icon queue"><FiClipboard /></div>
            <div className="lab-tab-text">
              <strong>Active Tests Queue</strong>
              <small>
                {pendingCollectionCount > 0 ? (
                  <span className="lab-tab-badge urgent">{pendingCollectionCount} Needs Sample</span>
                ) : (
                  `${requests.filter((r) => r.status !== "completed").length} Active Tests`
                )}
              </small>
            </div>
          </button>

          <button
            type="button"
            className={`lab-tab-btn ${activeTab === "results" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("results");
              if (!activeResultRef.current && testsAwaitingResults.length > 0) {
                const firstAwaiting = testsAwaitingResults[0];
                setActiveResult(firstAwaiting);
                setResultForm(requestToResultForm(firstAwaiting));
              }
            }}
          >
            <div className="lab-tab-icon results"><FiEdit3 /></div>
            <div className="lab-tab-text">
              <strong>Enter Test Results</strong>
              <small>
                {activeResult ? `Active: ${requestDisplayName(activeResult)}` : `${testsAwaitingResults.length} Ready for Results`}
              </small>
            </div>
          </button>

          <button
            type="button"
            className={`lab-tab-btn ${activeTab === "order" ? "active" : ""}`}
            onClick={() => setActiveTab("order")}
          >
            <div className="lab-tab-icon order"><FiPlus /></div>
            <div className="lab-tab-text">
              <strong>Order New Test</strong>
              <small>Walk-in or Doctor Order</small>
            </div>
          </button>

          <button
            type="button"
            className={`lab-tab-btn ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            <div className="lab-tab-icon reports"><FiPrinter /></div>
            <div className="lab-tab-text">
              <strong>Completed & Reports</strong>
              <small>{completedCount} Reports Authorized</small>
            </div>
          </button>
        </nav>

        {/* ====================================================================
            TAB 1: ACTIVE TESTS QUEUE (CLEAN, SPACIOUS, 1-CLICK ACTIONS)
            ==================================================================== */}
        {activeTab === "queue" && (
          <section className="lab-workspace-card">
            {/* Filter Pills & Search */}
            <div className="lab-filter-row">
              <div className="lab-search-box">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search test by patient name, MRN, or test panel..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="lab-search-input"
                />
                {requestSearch && (
                  <button type="button" onClick={() => setRequestSearch("")} className="search-clear-btn">
                    <FiX />
                  </button>
                )}
              </div>

              <div className="lab-quick-filter-pills">
                <button
                  type="button"
                  className={`lab-filter-pill ${queueFilter === "all" ? "active" : ""}`}
                  onClick={() => setQueueFilter("all")}
                >
                  All ({requests.length})
                </button>
                <button
                  type="button"
                  className={`lab-filter-pill ${queueFilter === "pending" ? "active" : ""}`}
                  onClick={() => setQueueFilter("pending")}
                >
                  ⚠️ Waiting for Sample ({pendingCollectionCount})
                </button>
                <button
                  type="button"
                  className={`lab-filter-pill ${queueFilter === "in_progress" ? "active" : ""}`}
                  onClick={() => setQueueFilter("in_progress")}
                >
                  🔬 In Testing ({inProgressCount})
                </button>
                <button
                  type="button"
                  className={`lab-filter-pill ${queueFilter === "completed" ? "active" : ""}`}
                  onClick={() => setQueueFilter("completed")}
                >
                  ✓ Results Ready ({completedCount})
                </button>
              </div>
            </div>

            {/* Empty State */}
            {visibleRequests.length === 0 ? (
              <div className="lab-empty-state">
                <FiClipboard />
                <h3>No laboratory investigations found</h3>
                <p>There are no test requests matching your search or filter.</p>
              </div>
            ) : (
              <div className="lab-table-responsive-wrapper">
                <table className="lab-requests-table">
                  <thead>
                    <tr>
                      <th style={{ width: "13%" }}>Status</th>
                      <th className="hide-mobile" style={{ width: "12%" }}>Track / QR</th>
                      <th style={{ width: "32%" }}>Patient (Full Name & Card)</th>
                      <th style={{ width: "24%" }}>Investigation & Specimen</th>
                      <th className="hide-mobile" style={{ width: "13%" }}>Ordered</th>
                      <th style={{ width: "18%", textAlign: "right" }}>1-Tap Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRequests.map((request) => {
                      const isCompleted = request.status === "completed";
                      const isPending = request.status === "pending";
                      const mrn = request.patient?.mrn || request.patient?.physicalFileNumber || "Walk-in";
                      const phone = request.patient?.phone;
                      const gender = request.patient?.gender;
                      const age =
                        (request.patient as any)?.age ||
                        (request.patient?.dateOfBirth
                          ? `${Math.max(0, new Date().getFullYear() - new Date(request.patient.dateOfBirth).getFullYear())}`
                          : null);

                      return (
                        <tr key={request.id} className={`lab-table-row ${request.status}`}>
                          {/* 1. Status Column */}
                          <td className="lab-td-status">
                            <span className={`lab-badge-status ${request.status}`}>
                              {statusLabel(request.status)}
                            </span>
                          </td>

                          {/* 2. Track & QR Preview */}
                          <td className="lab-td-track hide-mobile">
                            <strong className="lab-track-number">{request.requestNumber}</strong>
                            <div>
                              <button
                                type="button"
                                className="lab-table-mini-qr-btn"
                                onClick={() => setQuickQrRequest(request)}
                                title="View verification QR code & tracking link"
                              >
                                <FiExternalLink /> Live QR
                              </button>
                            </div>
                          </td>

                          {/* 3. Patient Demographics - Fully Horizontal */}
                          <td className="lab-td-patient">
                            <div className="lab-table-patient-horizontal">
                              <div className="lab-table-patient-name">
                                <FiUser className="lab-patient-icon" />
                                <strong>{patientName(request.patient)}</strong>
                              </div>
                              <div className="lab-table-patient-chips">
                                <span className="lab-chip mrn">MRN: <strong>{mrn}</strong></span>
                                {gender && <span className="lab-chip gender">{gender.toUpperCase()}</span>}
                                {age && <span className="lab-chip age">{age} yrs</span>}
                                {phone && <span className="lab-chip phone">📞 {phone}</span>}
                              </div>
                            </div>
                          </td>

                          {/* 4. Investigation & Specimen */}
                          <td className="lab-td-test">
                            <strong className="lab-table-test-name">{requestDisplayName(request)}</strong>
                            <div className="lab-table-test-meta">
                              <span className="lab-specimen-pill">
                                🩸 {request.template.specimen || "Standard"}
                              </span>
                              {request.template.category && (
                                <span className="lab-category-pill">{request.template.category}</span>
                              )}
                            </div>
                            {request.clinicalNotes && (
                              <div className="lab-table-notes-snippet" title={request.clinicalNotes}>
                                <strong>Note:</strong> {request.clinicalNotes}
                              </div>
                            )}
                          </td>

                          {/* 5. Ordered Time */}
                          <td className="lab-td-time hide-mobile">
                            <span className="lab-date-primary">{formatDate(request.createdAt)}</span>
                          </td>

                          {/* 6. Actions */}
                          <td className="lab-td-actions" style={{ textAlign: "right" }}>
                            <div className="lab-table-action-group">
                              <button
                                type="button"
                                className="lab-btn-sm secondary"
                                onClick={() => handleOpenPrint(request, "request")}
                                title="Print Test Requisition & QR Tracking Slip"
                              >
                                <FiFileText /> Slip
                              </button>

                              {isPending && canUpdate && (
                                <button
                                  type="button"
                                  className="lab-btn-sm primary collect"
                                  disabled={saving}
                                  onClick={() => updateStatus(request, "sample_collected")}
                                  title="Confirm specimen sample collected"
                                >
                                  <FiCheck /> Collect
                                </button>
                              )}

                              {!isCompleted && canComplete && (
                                <button
                                  type="button"
                                  className="lab-btn-sm primary results"
                                  onClick={() => openResultForm(request)}
                                  title="Enter analyte test findings"
                                >
                                  <FiEdit3 /> Result
                                </button>
                              )}

                              {isCompleted && (
                                <button
                                  type="button"
                                  className="lab-btn-sm primary report highlight-print"
                                  onClick={() => handleOpenPrint(request, "result")}
                                  title="Print official validated laboratory report"
                                >
                                  <FiPrinter /> Print
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ====================================================================
            TAB 2: ENTER TEST RESULTS (FOCUSED, BEAUTIFUL WORKBENCH)
            ==================================================================== */}
        {activeTab === "results" && (
          <section className="lab-workspace-card">
            {/* Quick Test Switcher Chips */}
            <div className="lab-quick-pick-tests">
              <span className="lab-quick-pick-title"><FiClipboard /> Choose Test to Enter Results:</span>
              <div className="lab-quick-pick-scroll">
                {testsAwaitingResults.map((req) => {
                  const isSelected = activeResult?.id === req.id;
                  return (
                    <button
                      key={req.id}
                      type="button"
                      className={`lab-quick-pick-chip ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setActiveResult(req);
                        setResultForm(requestToResultForm(req));
                      }}
                    >
                      <strong>{requestDisplayName(req)}</strong>
                      <span>{patientName(req.patient)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!activeResult ? (
              <div className="lab-empty-state">
                <FiEdit3 />
                <h3>No test selected</h3>
                <p>Pick any test from the top bar or from the queue to start entering findings.</p>
              </div>
            ) : (
              <form onSubmit={handleCompleteResult} className="lab-result-form">
                {/* Active Patient & Test Banner */}
                <div className="lab-selected-banner">
                  <div className="banner-avatar">
                    <FaFlask />
                  </div>
                  <div className="banner-details">
                    <div className="banner-title-line">
                      <h2>{requestDisplayName(activeResult)}</h2>
                      <span className={`lab-badge-status ${activeResult.status}`}>
                        {statusLabel(activeResult.status)}
                      </span>
                    </div>
                    <p className="banner-sub-line">
                      <span><strong>Patient:</strong> {patientName(activeResult.patient)}</span>
                      <span>•</span>
                      <span><strong>MRN:</strong> {activeResult.patient?.mrn || "Walk-in"}</span>
                      <span>•</span>
                      <span><strong>Specimen:</strong> {activeResult.template.specimen || "Standard Specimen"}</span>
                      <span>•</span>
                      <span><strong>Order #:</strong> {activeResult.requestNumber}</span>
                    </p>
                  </div>
                </div>

                {/* Analyte Inputs with Real-Time Feedback */}
                <div className="lab-analytes-section">
                  <h3>Analyte Observations & Test Findings ({activeResult.template.fields.length} Analytes)</h3>
                  <div className="lab-analytes-grid">
                    {activeResult.template.fields.map((field) => {
                      const currentVal = resultForm.resultValues[field.key] ?? "";
                      const flag = evaluateLiveFlag(field.referenceRange, currentVal);

                      return (
                        <div key={field.key} className="lab-analyte-card">
                          <div className="analyte-label-row">
                            <label className="analyte-name">
                              {field.label} {field.required && <span className="req">*</span>}
                            </label>
                            {flag && (
                              <span className={`analyte-flag-pill ${flag.status}`}>
                                {flag.label}
                              </span>
                            )}
                          </div>

                          <div className="analyte-input-wrap">
                            {field.type === "textarea" ? (
                              <textarea
                                rows={2}
                                value={currentVal}
                                onChange={(e) => handleResultValueChange(field.key, e.target.value)}
                                placeholder="Type observation..."
                                required={field.required}
                                className="analyte-big-textarea"
                              />
                            ) : field.type === "select" ? (
                              <select
                                value={currentVal}
                                onChange={(e) => handleResultValueChange(field.key, e.target.value)}
                                required={field.required}
                                className="analyte-big-select"
                              >
                                <option value="">Select finding...</option>
                                {(field.options ?? []).map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="analyte-input-with-unit">
                                <input
                                  type="text"
                                  inputMode={field.type === "number" ? "decimal" : undefined}
                                  value={currentVal}
                                  onChange={(e) => handleResultValueChange(field.key, e.target.value)}
                                  placeholder={field.referenceRange ? `e.g. (${field.referenceRange})` : "Enter observed value"}
                                  required={field.required}
                                  className="analyte-big-input"
                                />
                                {field.unit && <span className="analyte-unit">{field.unit}</span>}
                              </div>
                            )}
                          </div>

                          {field.referenceRange && (
                            <small className="analyte-ref-range">
                              Standard Normal: <strong>{field.referenceRange}</strong>
                            </small>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Clinical Interpretation & Technician Remarks */}
                <div className="lab-remarks-grid">
                  <div className="lab-input-box">
                    <label>Clinical Interpretation & Diagnostic Impression</label>
                    <textarea
                      rows={3}
                      value={resultForm.interpretation}
                      onChange={(e) => setResultForm((current) => ({ ...current, interpretation: e.target.value }))}
                      placeholder="e.g. Normal baseline blood count. No toxic granules or blasts observed..."
                      className="lab-textarea"
                    />
                  </div>

                  <div className="lab-input-box">
                    <label>Technician Notes & Specimen Remarks</label>
                    <textarea
                      rows={3}
                      value={resultForm.technicianNote}
                      onChange={(e) => setResultForm((current) => ({ ...current, technicianNote: e.target.value }))}
                      placeholder="e.g. Specimen non-hemolyzed. Verified on Mindray analyzer..."
                      className="lab-textarea"
                    />
                  </div>
                </div>

                {/* Big Action Submit Button */}
                <div className="lab-submit-row">
                  <button
                    type="submit"
                    disabled={saving || !canComplete}
                    className="lab-primary-action-btn"
                  >
                    <FiCheckCircle />
                    <span>{saving ? "Authorizing Result..." : "✓ Authorize & Release Official Report"}</span>
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* ====================================================================
            TAB 3: ORDER NEW TEST (DEDICATED, UNCLUTTERED WORKFLOW)
            ==================================================================== */}
        {activeTab === "order" && (
          <section className="lab-workspace-card">
            <div className="lab-card-header">
              <div className="lab-card-title">
                <FiPlus className="title-icon order" />
                <div>
                  <h2>Order Diagnostic Investigation</h2>
                  <p>Order a laboratory test panel for a hospital patient or walk-in client.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRequestSubmit} className="lab-order-form">
              {/* Patient Mode Selector */}
              <div className="lab-mode-toggle-row">
                <button
                  type="button"
                  className={`lab-mode-btn ${patientSelectionMode === "registered" ? "active" : ""}`}
                  onClick={() => {
                    setPatientSelectionMode("registered");
                    setRequestForm((curr) => ({ ...curr, manualPatientName: "" }));
                  }}
                >
                  <FiSearch /> 1. Registered Hospital Patient
                </button>
                <button
                  type="button"
                  className={`lab-mode-btn ${patientSelectionMode === "manual" ? "active" : ""}`}
                  onClick={() => {
                    setPatientSelectionMode("manual");
                    setRequestForm((curr) => ({ ...curr, patientId: "" }));
                  }}
                >
                  <FiUser /> 2. Walk-in Client (Type Name)
                </button>
              </div>

              {/* Patient Fields */}
              {patientSelectionMode === "registered" ? (
                <div className="lab-patient-picker-box">
                  <PatientSearchSelect
                    label="Search Registered Patient"
                    required={patientSelectionMode === "registered"}
                    patients={patients}
                    selectedPatientId={requestForm.patientId}
                    onSelectPatient={(p) => {
                      setRequestForm((current) => ({
                        ...current,
                        patientId: p?.id ?? "",
                      }));
                    }}
                    placeholder="Type patient name, phone number, or MRN..."
                  />

                  {selectedPatient && (
                    <div className="lab-selected-patient-badge">
                      <strong>✓ Selected: {patientName(selectedPatient)}</strong>
                      <span>MRN: {selectedPatient.mrn || "N/A"} • Gender: {selectedPatient.gender?.toUpperCase()} • Phone: {selectedPatient.phone || "No phone"}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="lab-manual-patient-card">
                  <h3>Walk-in Client Details</h3>
                  <div className="lab-manual-grid">
                    <div className="lab-input-box">
                      <label>Patient Full Name <span className="req">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Ibrahim Abubakar"
                        value={requestForm.manualPatientName || ""}
                        onChange={(e) => setRequestForm({ ...requestForm, manualPatientName: e.target.value })}
                        className="lab-text-input"
                        required={patientSelectionMode === "manual"}
                      />
                    </div>

                    <div className="lab-input-box">
                      <label>Gender</label>
                      <select
                        value={requestForm.manualPatientGender || "other"}
                        onChange={(e) => setRequestForm({ ...requestForm, manualPatientGender: e.target.value as any })}
                        className="lab-text-input"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other / Unspecified</option>
                      </select>
                    </div>

                    <div className="lab-input-box">
                      <label>Age (Years)</label>
                      <input
                        type="number"
                        min="0"
                        max="130"
                        placeholder="e.g. 32"
                        value={requestForm.manualPatientAge || ""}
                        onChange={(e) => setRequestForm({ ...requestForm, manualPatientAge: e.target.value })}
                        className="lab-text-input"
                      >
                      </input>
                    </div>

                    <div className="lab-input-box">
                      <label>Phone Number (Optional)</label>
                      <input
                        type="tel"
                        placeholder="e.g. 08012345678"
                        value={requestForm.manualPatientPhone || ""}
                        onChange={(e) => setRequestForm({ ...requestForm, manualPatientPhone: e.target.value })}
                        className="lab-text-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Template Picker */}
              <div className="lab-template-section">
                <label className="lab-section-title">Diagnostic Test Template <span className="req">*</span></label>
                <input
                  list="lab-templates-datalist"
                  value={templatePicker}
                  onChange={(e) => handleTemplatePick(e.target.value)}
                  placeholder="Type to search test panels (e.g. Full Blood Count, Malaria, Lipid Profile...)"
                  className="lab-text-input big"
                  required
                />
                <datalist id="lab-templates-datalist">
                  {activeTemplates.map((t) => (
                    <option key={t.id} value={templateLabel(t)} />
                  ))}
                </datalist>

                {/* Category Chips & Quick List */}
                <div className="lab-category-chips-row">
                  {templateCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`lab-category-chip ${templateCategory === cat ? "active" : ""}`}
                      onClick={() => setTemplateCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="lab-templates-quick-grid">
                  {visibleTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={`lab-template-btn ${requestForm.templateId === template.id ? "active" : ""}`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <strong>{template.name}</strong>
                      <small>{template.specimen || "Standard Specimen"}</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* Clinical Indication / Notes */}
              <div className="lab-input-box full">
                <label>Clinical Notes / Doctor Indication (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient experiencing 3-day high fever, fatigue, and suspected malaria..."
                  value={requestForm.clinicalNotes}
                  onChange={(e) => setRequestForm({ ...requestForm, clinicalNotes: e.target.value })}
                  className="lab-textarea"
                />
              </div>

              {/* Submit Button */}
              <div className="lab-submit-row">
                <button
                  type="submit"
                  disabled={saving || !canCreate}
                  className="lab-primary-action-btn"
                >
                  <FiPlus />
                  <span>{saving ? "Creating Test Order..." : "✓ Create Test Order & Print Tracking Slip"}</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ====================================================================
            TAB 4: COMPLETED & REPORTS ARCHIVE
            ==================================================================== */}
        {activeTab === "completed" && (
          <section className="lab-workspace-card">
            <div className="lab-card-header">
              <div className="lab-card-title">
                <FiPrinter className="title-icon reports" />
                <div>
                  <h2>Authorized Laboratory Reports</h2>
                  <p>View finished tests, print official signed reports, and verify QR codes.</p>
                </div>
              </div>
            </div>

            {visibleRequests.length === 0 ? (
              <div className="lab-empty-state">
                <FiPrinter />
                <h3>No completed reports yet</h3>
                <p>Completed investigations will appear here for 1-click printing.</p>
              </div>
            ) : (
              <div className="lab-table-responsive-wrapper">
                <table className="lab-requests-table completed-table">
                  <thead>
                    <tr>
                      <th className="hide-mobile" style={{ width: "11%", textAlign: "center" }}>Verified QR</th>
                      <th className="hide-mobile" style={{ width: "13%" }}>Track No. & Date</th>
                      <th style={{ width: "36%" }}>Patient Name & Demographics</th>
                      <th style={{ width: "32%" }}>Test Panel & Specimen</th>
                      <th className="hide-mobile" style={{ width: "16%" }}>Clinical Impression</th>
                      <th style={{ width: "21%", textAlign: "right" }}>1-Tap Print & Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRequests.map((request) => {
                      const mrn = request.patient?.mrn || request.patient?.physicalFileNumber || "Walk-in";
                      const phone = request.patient?.phone;
                      const gender = request.patient?.gender;
                      const age =
                        (request.patient as any)?.age ||
                        (request.patient?.dateOfBirth
                          ? `${Math.max(0, new Date().getFullYear() - new Date(request.patient.dateOfBirth).getFullYear())}`
                          : null);

                      return (
                        <tr key={request.id} className="lab-table-row completed">
                          {/* 1. Live Scannable QR Code */}
                          <td className="lab-td-qr hide-mobile" style={{ textAlign: "center" }}>
                            <LabQrThumbnail request={request} onOpenQuickQr={setQuickQrRequest} />
                          </td>

                          {/* 2. Track & Date */}
                          <td className="lab-td-track hide-mobile">
                            <strong className="lab-track-number">{request.requestNumber}</strong>
                            <div className="lab-date-primary">{formatDate(request.completedAt || request.createdAt)}</div>
                            <span className="lab-badge-status completed">✓ AUTHORIZED</span>
                          </td>

                          {/* 3. Patient Demographics (Fully Horizontal) */}
                          <td className="lab-td-patient">
                            <div className="lab-table-patient-horizontal">
                              <div className="lab-table-patient-name">
                                <FiUser className="lab-patient-icon" />
                                <strong>{patientName(request.patient)}</strong>
                              </div>
                              <div className="lab-table-patient-chips">
                                <span className="lab-chip mrn">MRN: <strong>{mrn}</strong></span>
                                {gender && <span className="lab-chip gender">{gender.toUpperCase()}</span>}
                                {age && <span className="lab-chip age">{age} yrs</span>}
                                {phone && <span className="lab-chip phone">📞 {phone}</span>}
                              </div>
                            </div>
                          </td>

                          {/* 4. Test Panel */}
                          <td className="lab-td-test">
                            <strong className="lab-table-test-name">{requestDisplayName(request)}</strong>
                            <div className="lab-table-test-meta">
                              <span className="lab-specimen-pill">🩸 {request.template.specimen || "Standard"}</span>
                              {request.template.category && <span className="lab-category-pill">{request.template.category}</span>}
                            </div>
                          </td>

                          {/* 5. Impression */}
                          <td className="lab-td-notes hide-mobile">
                            {request.interpretation ? (
                              <div className="lab-table-notes-snippet impression" title={request.interpretation}>
                                <strong>Impression:</strong> {request.interpretation}
                              </div>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Report completed & signed</span>
                            )}
                          </td>

                          {/* 6. 1-Tap Actions */}
                          <td className="lab-td-actions" style={{ textAlign: "right" }}>
                            <div className="lab-table-action-group">
                              <button
                                type="button"
                                className="lab-btn-sm primary report highlight-print"
                                onClick={() => handleOpenPrint(request, "result")}
                                title="Print Official Report with MDS logo, Kano location, signature, and stamp"
                              >
                                <FiPrinter /> Print Report
                              </button>
                              <button
                                type="button"
                                className="lab-btn-sm secondary"
                                onClick={() => handleOpenPrint(request, "request")}
                                title="Print Tracking Slip"
                              >
                                <FiFileText /> Slip
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* 5. PRINT MODAL WITH SCANNABLE QR CODE */}
        {printModalRequest && (
          <LaboratoryPrintModal
            request={printModalRequest}
            onClose={() => setPrintModalRequest(null)}
            initialDocumentType={printModalDocType}
          />
        )}

        {/* 6. EXPANDED QUICK QR VERIFICATION MODAL */}
        {quickQrRequest && (
          <div className="lab-modal-overlay" onClick={() => setQuickQrRequest(null)}>
            <div
              className="lab-modal-container"
              style={{ maxWidth: "480px", textAlign: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lab-modal-header" style={{ justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-strong, #092a5e)" }}>
                    Live Diagnostic QR Verification
                  </h3>
                  <small style={{ color: "var(--muted)" }}>{quickQrRequest.requestNumber}</small>
                </div>
                <button
                  type="button"
                  className="lab-icon-btn"
                  onClick={() => setQuickQrRequest(null)}
                >
                  <FiX />
                </button>
              </div>

              <div style={{ padding: "1.5rem 1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                {/* Large QR Display */}
                <div style={{ padding: "14px", background: "#ffffff", borderRadius: "14px", border: "2px solid #cbd5e1", boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
                  <LabQrLargeView requestNumber={quickQrRequest.requestNumber || quickQrRequest.id} />
                </div>

                <div style={{ marginTop: "4px" }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: "1.05rem", color: "var(--text-strong, #092a5e)" }}>
                    {patientName(quickQrRequest.patient)}
                  </h4>
                  <div style={{ fontSize: "0.86rem", color: "var(--muted)" }}>
                    Test: <strong>{requestDisplayName(quickQrRequest)}</strong>
                  </div>
                  <div style={{ marginTop: "6px" }}>
                    <span className={`lab-badge-status ${quickQrRequest.status}`}>
                      {statusLabel(quickQrRequest.status)}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5, margin: "4px 0 0", maxWidth: "380px" }}>
                  Anyone can scan this QR code with their mobile phone camera to verify and view the authentic laboratory diagnostic result from anywhere.
                </p>

                {/* Link & Copy */}
                <div style={{ display: "flex", width: "100%", gap: "8px", marginTop: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={getAppUrl(`/verify/lab/${encodeURIComponent(quickQrRequest.requestNumber || quickQrRequest.id)}`)}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.78rem", background: "var(--surface, #f8fafc)", color: "var(--text-strong, #334155)" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = getAppUrl(`/verify/lab/${encodeURIComponent(quickQrRequest.requestNumber || quickQrRequest.id)}`);
                      navigator.clipboard.writeText(url).then(() => {
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      });
                    }}
                    style={{ padding: "8px 14px", borderRadius: "8px", background: "#0284c7", color: "#ffffff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "5px" }}
                  >
                    {copiedLink ? "✓ Copied" : <><FiCopy /> Copy</>}
                  </button>
                </div>

                {/* Bottom Action Buttons */}
                <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "10px" }}>
                  <a
                    href={getAppUrl(`/verify/lab/${encodeURIComponent(quickQrRequest.requestNumber || quickQrRequest.id)}`)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ flex: 1, textDecoration: "none", textAlign: "center", padding: "10px", borderRadius: "10px", background: "#0f766e", color: "#ffffff", fontWeight: 700, fontSize: "0.86rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <FiExternalLink /> Live Public Page
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const req = quickQrRequest;
                      setQuickQrRequest(null);
                      handleOpenPrint(req, req.status === "completed" ? "result" : "request");
                    }}
                    style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "#092a5e", color: "#ffffff", border: "none", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <FiPrinter /> Print Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
