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
  FiSliders,
  FiAlertTriangle,
  FiPlus,
  FiCheck,
  FiX,
  FiSlash,
  FiRotateCcw,
  FiVolume2,
  FiVolumeX,
  FiShare2,
} from "react-icons/fi";
import { FaFlask, FaPhoneSlash } from "react-icons/fa";
import PatientSearchSelect from "../../components/common/PatientSearchSelect";
import TestSearchSelect from "../../components/common/TestSearchSelect";
import AdminLayout from "../../layouts/AdminLayout";
import { WorkspaceHeader, WorkspaceKpiGrid } from "../../components/dashboard/WorkspacePrimitives";
import { useOfflineQueueCount } from "../../hooks/useOfflineSync";
import { flushOfflineQueue } from "../../utils/offlineQueue";
import LaboratoryPrintModal from "../../components/laboratory/LaboratoryPrintModal";
import ShareLabResultModal from "../../components/laboratory/ShareLabResultModal";
import "../../styles/laboratory-studio.css";
import { fetchPatients } from "../../services/patients/patientService";
import {
  completeLaboratoryRequest,
  createLaboratoryRequests,
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
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "in_progress" | "completed" | "cancelled">("all");
  const [templatePicker, setTemplatePicker] = useState("");
  const [templateCategory, setTemplateCategory] = useState("All");
  const [patientSelectionMode, setPatientSelectionMode] = useState<"registered" | "manual">("registered");
  const [requestForm, setRequestForm] = useState<LaboratoryRequestFormValues>(emptyRequestForm);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [activeResult, setActiveResult] = useState<LaboratoryRequest | null>(null);
  const [resultForm, setResultForm] = useState<LaboratoryResultFormValues>(emptyResultForm);
  const activeResultRef = useRef<LaboratoryRequest | null>(null);
  activeResultRef.current = activeResult;
  const [printModalRequest, setPrintModalRequest] = useState<LaboratoryRequest | null>(null);
  const [printModalDocType, setPrintModalDocType] = useState<"result" | "request">("result");
  const [shareModalRequest, setShareModalRequest] = useState<LaboratoryRequest | null>(null);
  const [skipTargetRequest, setSkipTargetRequest] = useState<LaboratoryRequest | null>(null);
  const [skipReason, setSkipReason] = useState<string>("Patient declined investigation");
  const [skipCustomNote, setSkipCustomNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live incoming laboratory telephone alert ring state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mutedRequestIds, setMutedRequestIds] = useState<Set<string>>(new Set());

  const pendingCollectionCount = summary.pending ?? requests.filter((r) => r.status === "pending").length;
  const inProgressCount = (summary.sample_collected ?? 0) + (summary.in_progress ?? 0);
  const completedCount = summary.completed ?? requests.filter((r) => r.status === "completed").length;
  const cancelledCount = summary.cancelled ?? requests.filter((r) => r.status === "cancelled").length;

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
    setSelectedTemplateIds((current) => {
      const next = current.includes(template.id)
        ? current.filter((id) => id !== template.id)
        : [...current, template.id];
      setRequestForm((form) => ({ ...form, templateId: next[0] ?? "" }));
      return next;
    });
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

    if (selectedTemplateIds.length === 0) {
      setError("Choose at least one diagnostic test.");
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

    const result = await createLaboratoryRequests({ ...submissionPayload, templateIds: selectedTemplateIds });
    setSaving(false);

    if (!result.requests || result.requests.length === 0) {
      setError(result.error ?? "Unable to create laboratory test orders.");
      return;
    }

    const createdPatName = patientName(result.requests[0].patient);
    setSuccess(
      result.queued
        ? `✓ ${result.requests.length} test orders saved offline for ${createdPatName}.`
        : `✓ ${result.requests.length} test orders created for ${createdPatName}.`
    );

    setRequestForm(emptyRequestForm);
    setSelectedTemplateIds([]);
    setTemplatePicker("");

    handleOpenPrint(result.requests[0], "request");
    setActiveTab("queue");
    await loadData();
  };

  const openResultForm = (request: LaboratoryRequest) => {
    const nowIso = new Date().toISOString();
    const collectedRequest: LaboratoryRequest =
      request.status === "pending"
        ? {
            ...request,
            status: "sample_collected",
            sampleCollectedAt: request.sampleCollectedAt || nowIso,
          }
        : {
            ...request,
            sampleCollectedAt: request.sampleCollectedAt || nowIso,
          };

    if (request.status === "pending" && canUpdate) {
      void updateLaboratoryRequestStatus(request.id, "sample_collected");
      setRequests((prev) =>
        prev.map((item) => (item.id === request.id ? collectedRequest : item))
      );
    }

    setActiveResult(collectedRequest);
    setResultForm(requestToResultForm(collectedRequest));
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
      const nowIso = new Date().toISOString();
      const offlineCompleted: LaboratoryRequest = result.request ?? {
        ...activeResult,
        status: "completed",
        resultValues: resultForm.resultValues,
        interpretation: resultForm.interpretation,
        technicianNote: resultForm.technicianNote,
        sampleCollectedAt: activeResult.sampleCollectedAt || nowIso,
        completedAt: nowIso,
      };
      setSuccess("✓ Result saved on this device. It will sync automatically when online.");
      handleOpenPrint(offlineCompleted, "result");
      setActiveTab("completed");
      await loadData();
      return;
    }

    if (!result.request) {
      setError(result.error ?? "Unable to record and complete result.");
      return;
    }

    const completedWithSample: LaboratoryRequest = {
      ...result.request,
      sampleCollectedAt:
        result.request.sampleCollectedAt ||
        activeResult.sampleCollectedAt ||
        result.request.completedAt ||
        result.request.createdAt,
    };

    setSuccess(`✓ Test results for ${completedWithSample.requestNumber} authorized and ready to print!`);
    handleOpenPrint(completedWithSample, "result");
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
        : status === "cancelled"
        ? `✓ Test marked as skipped.`
        : status === "pending"
        ? `✓ Test restored to pending queue.`
        : `✓ Sample collected and marked as ${statusLabel(status)}.`
    );
    await loadData();
  };

  const handleConfirmSkipTest = async () => {
    if (!skipTargetRequest) return;
    const finalReason = skipCustomNote.trim()
      ? `${skipReason}: ${skipCustomNote.trim()}`
      : skipReason;
    const noteToSave = skipTargetRequest.clinicalNotes
      ? `${skipTargetRequest.clinicalNotes} | [SKIPPED]: ${finalReason}`
      : `[SKIPPED]: ${finalReason}`;

    setSaving(true);
    setError(null);
    const result = await updateLaboratoryRequestStatus(skipTargetRequest.id, "cancelled", noteToSave);
    setSaving(false);
    const skippedName = requestDisplayName(skipTargetRequest);
    const skippedId = skipTargetRequest.id;
    setSkipTargetRequest(null);
    setSkipCustomNote("");

    if (!result.request && !result.queued) {
      setError(result.error ?? "Unable to skip request.");
      return;
    }

    setSuccess(
      result.queued
        ? `Test "${skippedName}" marked as skipped offline.`
        : `✓ Investigation "${skippedName}" has been skipped.`
    );
    if (activeResult?.id === skippedId) {
      setActiveResult(null);
    }
    await loadData();
  };

  const handleRestoreTest = async (request: LaboratoryRequest) => {
    setSaving(true);
    setError(null);
    const result = await updateLaboratoryRequestStatus(request.id, "pending");
    setSaving(false);

    if (!result.request && !result.queued) {
      setError(result.error ?? "Unable to restore request.");
      return;
    }

    setSuccess(`✓ Investigation "${requestDisplayName(request)}" restored to active queue.`);
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
      } else if (queueFilter === "cancelled") {
        list = list.filter((r) => r.status === "cancelled");
      } else {
        // "all" - show all active (non-cancelled) investigations
        list = list.filter((r) => r.status !== "cancelled");
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

  const completedRequestGroups = useMemo(() => {
    const groups = new Map<string, { patient: Patient; requests: LaboratoryRequest[] }>();
    for (const request of visibleRequests.filter((item) => item.status === "completed")) {
      const group = groups.get(request.patientId) ?? { patient: request.patient, requests: [] };
      group.requests.push(request);
      groups.set(request.patientId, group);
    }
    return Array.from(groups.values()).sort((left, right) =>
      patientName(left.patient).localeCompare(patientName(right.patient))
    );
  }, [visibleRequests]);

  // Tests that are awaiting result recording
  const testsAwaitingResults = useMemo(() => {
    return requests.filter((r) => r.status !== "completed" && r.status !== "cancelled");
  }, [requests]);

  return (
    <AdminLayout>
      <div className="lab-simple-page">
        {/* 1. CLEAN UNIFIED WORKSPACE HEADER */}
        <WorkspaceHeader
          eyebrow="Diagnostic Laboratory"
          title="Medical Laboratory"
          subtitle={`${user?.firstName ?? ""} ${user?.lastName ?? ""} • Manage test requests, sample collection, and diagnostic reports`}
          actions={
            <>
              <button
                type="button"
                className={`ws-btn ${soundEnabled ? "primary" : ""}`}
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
                <Link to="/laboratory/templates" className="ws-btn" title="Manage test templates">
                  <FiSliders />
                  <span>Test Panels</span>
                </Link>
              )}

              <button
                type="button"
                className="ws-btn"
                disabled={loading}
                onClick={() => void loadData()}
                title="Refresh laboratory records"
              >
                <FiRefreshCw className={loading ? "spin" : ""} />
                <span>Refresh</span>
              </button>
            </>
          }
        />

        {/* OFFLINE QUEUE BAR IF ITEMS ARE PENDING */}
        {offlinePendingCount > 0 && (
          <div className="lab-offline-sync-bar">
            <span>
              {offlinePendingCount} laboratory operation{offlinePendingCount === 1 ? "" : "s"} queued offline
              {!isBrowserOnline ? " (Waiting for network)" : ""}
            </span>
            <button
              type="button"
              className="lab-sync-btn"
              disabled={!isBrowserOnline || syncing}
              onClick={handleManualSync}
            >
              <FiRefreshCw className={syncing ? "spin" : ""} />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        )}

        {/* REUSABLE 4-CARD KPI STRIP */}
        <WorkspaceKpiGrid
          items={[
            {
              id: "pending",
              label: "Awaiting Sample",
              value: pendingCollectionCount,
              badge: "Queue",
              subtext: "New orders waiting for sample collection",
              tone: "amber",
              icon: <FiClock />,
              onClick: () => {
                setActiveTab("queue");
                setQueueFilter("pending");
              },
            },
            {
              id: "testing",
              label: "In Testing",
              value: inProgressCount,
              badge: "Processing",
              subtext: "Samples collected & awaiting results",
              tone: "blue",
              icon: <FaFlask />,
              onClick: () => {
                setActiveTab("queue");
                setQueueFilter("in_progress");
              },
            },
            {
              id: "completed",
              label: "Results Completed",
              value: completedCount,
              badge: "Authorized",
              subtext: "Verified diagnostic reports ready",
              tone: "teal",
              icon: <FiCheckCircle />,
              onClick: () => setActiveTab("completed"),
            },
            {
              id: "templates",
              label: "Active Test Panels",
              value: activeTemplates.length,
              badge: "Catalog",
              subtext: "Configured laboratory investigations",
              tone: "purple",
              icon: <FiLayers />,
              onClick: () => setActiveTab("order"),
            },
          ]}
        />

        {/* 2. INCOMING DOCTOR ORDER ALERT BANNER */}
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
                DOCTOR ORDERED LAB TEST • IMMEDIATE ACTION
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

        {/* 4. ENTERPRISE WORKFLOW NAVIGATION TABS */}
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
                  <span className="lab-tab-badge urgent">{pendingCollectionCount} Awaiting Sample</span>
                ) : (
                  `${requests.filter((r) => r.status !== "completed" && r.status !== "cancelled").length} Active Orders`
                )}
              </small>
            </div>
          </button>

          <button
            type="button"
            className={`lab-tab-btn ${activeTab === "results" ? "active" : ""}`}
            onClick={() => {
              if (!activeResultRef.current && testsAwaitingResults.length > 0) {
                openResultForm(testsAwaitingResults[0]);
              } else {
                setActiveTab("results");
              }
            }}
          >
            <div className="lab-tab-icon results"><FiEdit3 /></div>
            <div className="lab-tab-text">
              <strong>Enter Test Results</strong>
              <small>
                {activeResult ? requestDisplayName(activeResult) : `${testsAwaitingResults.length} Ready for Entry`}
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
              <strong>Completed Reports</strong>
              <small>{completedCount} Authorized Reports</small>
            </div>
          </button>
        </nav>

        {/* ====================================================================
            TAB 1: ACTIVE TESTS QUEUE (ENTERPRISE LIS CARDS, FULL TEXT FIT)
            ==================================================================== */}
        {activeTab === "queue" && (
          <section className="lab-workspace-card">
            {/* Filter Pills & Search */}
            <div className="lab-filter-row">
              <div className="lab-search-box">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search test by patient name, MRN, order number, or test panel..."
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
                  All Active ({requests.filter((r) => r.status !== "cancelled").length})
                </button>
                <button
                  type="button"
                  className={`lab-filter-pill ${queueFilter === "pending" ? "active" : ""}`}
                  onClick={() => setQueueFilter("pending")}
                >
                  Awaiting Sample ({pendingCollectionCount})
                </button>
                <button
                  type="button"
                  className={`lab-filter-pill ${queueFilter === "in_progress" ? "active" : ""}`}
                  onClick={() => setQueueFilter("in_progress")}
                >
                  In Testing ({inProgressCount})
                </button>
                <button
                  type="button"
                  className={`lab-filter-pill ${queueFilter === "completed" ? "active" : ""}`}
                  onClick={() => setQueueFilter("completed")}
                >
                  Completed ({completedCount})
                </button>
                <button
                  type="button"
                  className={`lab-filter-pill skipped-pill ${queueFilter === "cancelled" ? "active" : ""}`}
                  onClick={() => setQueueFilter("cancelled")}
                >
                  <FiSlash style={{ marginRight: "4px" }} /> Skipped ({cancelledCount})
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
              <div className="lab-cards-grid">
                {visibleRequests.map((request) => {
                  const isCompleted = request.status === "completed";
                  const isPending = request.status === "pending";

                  return (
                    <article key={request.id} className={`lab-request-card ${request.status}`}>
                      {/* Tier 1: Status & Order Number */}
                      <div className="lab-card-meta-bar">
                        <span className={`lab-badge-status ${request.status}`}>
                          {statusLabel(request.status)}
                        </span>
                        <span className="lab-card-order-no">{request.requestNumber}</span>
                      </div>

                      {/* Tier 2: Full-Width Investigation Title & Specimen */}
                      <div className="lab-card-test-block">
                        <h3 className="lab-test-title">{requestDisplayName(request)}</h3>
                        <div className="lab-card-tags-row">
                          <span className="lab-specimen-pill">
                            Specimen: <strong>{request.template.specimen || "Standard Specimen"}</strong>
                          </span>
                          {request.template.category && (
                            <span className="lab-category-pill-tag">{request.template.category}</span>
                          )}
                        </div>
                      </div>

                      {/* Tier 3: Dedicated Patient Strip */}
                      <div className="lab-card-patient-strip">
                        <div className="lab-patient-avatar-sm">
                          <FiUser />
                        </div>
                        <div className="lab-patient-strip-info">
                          <strong className="lab-patient-name">{patientName(request.patient)}</strong>
                          <span className="lab-patient-sub">
                            MRN: <strong>{request.patient?.mrn || "Walk-in"}</strong> • {formatDate(request.createdAt)}
                          </span>
                        </div>
                      </div>

                      {request.clinicalNotes && (
                        <div className="lab-notes-box">
                          <strong>Clinical Note:</strong> "{request.clinicalNotes}"
                        </div>
                      )}

                      {/* Tier 4: Balanced 2-Column Enterprise Action Grid */}
                      <div className="lab-card-actions-row">
                        {/* Primary Workflow Actions */}
                        {isPending && canUpdate && (
                          <button
                            type="button"
                            className="lab-action-btn primary collect"
                            disabled={saving}
                            onClick={() => updateStatus(request, "sample_collected")}
                          >
                            <FiCheck /> Collect Sample
                          </button>
                        )}

                        {!isCompleted && request.status !== "cancelled" && canComplete && (
                          <button
                            type="button"
                            className="lab-action-btn primary results"
                            onClick={() => openResultForm(request)}
                          >
                            <FiEdit3 /> Enter Results
                          </button>
                        )}

                        {isCompleted && (
                          <>
                            <button
                              type="button"
                              className="lab-action-btn primary report"
                              onClick={() => handleOpenPrint(request, "result")}
                            >
                              <FiPrinter /> Official Report
                            </button>
                            <button
                              type="button"
                              className="lab-action-btn share"
                              onClick={() => setShareModalRequest(request)}
                              title="Share test result via WhatsApp, Email, SMS, or Link"
                            >
                              <FiShare2 /> Share Result
                            </button>
                          </>
                        )}

                        {/* Secondary Support Actions */}
                        <button
                          type="button"
                          className="lab-action-btn secondary"
                          onClick={() => handleOpenPrint(request, "request")}
                          title="Print Test Requisition & QR Slip"
                        >
                          <FiFileText /> Tracking Slip
                        </button>

                        {request.status === "cancelled" ? (
                          canUpdate && (
                            <button
                              type="button"
                              className="lab-action-btn secondary restore"
                              disabled={saving}
                              onClick={() => handleRestoreTest(request)}
                              title="Restore test to pending queue"
                            >
                              <FiRotateCcw /> Restore Test
                            </button>
                          )
                        ) : (
                          !isCompleted && canUpdate && (
                            <button
                              type="button"
                              className="lab-action-btn secondary skip"
                              disabled={saving}
                              onClick={() => {
                                setSkipTargetRequest(request);
                                setSkipReason("Patient declined investigation");
                                setSkipCustomNote("");
                              }}
                              title="Skip or discontinue this investigation"
                            >
                              <FiSlash /> Skip Test
                            </button>
                          )
                        )}
                      </div>
                    </article>
                  );
                })}
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
                      onClick={() => openResultForm(req)}
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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span className={`lab-badge-status ${activeResult.status === "pending" ? "sample_collected" : activeResult.status}`}>
                          {statusLabel(activeResult.status === "pending" ? "sample_collected" : activeResult.status)}
                        </span>
                        {canUpdate && activeResult.status !== "completed" && activeResult.status !== "cancelled" && (
                          <button
                            type="button"
                            className="lab-skip-banner-btn"
                            onClick={() => {
                              setSkipTargetRequest(activeResult);
                              setSkipReason("Patient declined investigation");
                              setSkipCustomNote("");
                            }}
                            title="Skip this test"
                          >
                            <FiSlash /> Skip Test
                          </button>
                        )}
                      </div>
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
                  {canUpdate && activeResult.status !== "completed" && activeResult.status !== "cancelled" && (
                    <button
                      type="button"
                      className="lab-secondary-action-btn skip"
                      onClick={() => {
                        setSkipTargetRequest(activeResult);
                        setSkipReason("Patient declined investigation");
                        setSkipCustomNote("");
                      }}
                      disabled={saving}
                      title="Discontinue or skip this test"
                    >
                      <FiSlash /> Skip This Test
                    </button>
                  )}
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
                      />
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
                <TestSearchSelect
                  label="Diagnostic Tests"
                  templates={activeTemplates}
                  multiSelect
                  selectedTemplateIds={selectedTemplateIds}
                  onToggleTemplate={handleTemplateSelect}
                  onSelectTemplate={(t: LaboratoryTemplate | null) => {
                    if (!t) {
                      setRequestForm((cur) => ({ ...cur, templateId: "" }));
                      setSelectedTemplateIds([]);
                      setTemplatePicker("");
                    }
                  }}
                  placeholder="Search and add multiple tests for this patient..."
                />

                <p className="lab-batch-hint">Selected tests: {selectedTemplateIds.length}. Choose another test to add it; select a chosen test again to remove it.</p>
                {selectedTemplateIds.length > 0 && (
                  <div className="lab-selected-test-list">
                    {selectedTemplateIds.map((templateId) => {
                      const template = activeTemplates.find((item) => item.id === templateId);
                      if (!template) return null;
                      return (
                        <button key={templateId} type="button" onClick={() => handleTemplateSelect(template)}>
                          <span>{template.name}<small>{template.specimen || "Standard specimen"}</small></span>
                          <FiX aria-label="Remove test" />
                        </button>
                      );
                    })}
                  </div>
                )}

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
                      className={`lab-template-btn ${selectedTemplateIds.includes(template.id) ? "active" : ""}`}
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
                  <span>{saving ? "Creating Test Orders..." : `✓ Create ${selectedTemplateIds.length || "Test"} Order(s) & Print Tracking Slip`}</span>
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
              <div className="lab-patient-record-groups">
                {completedRequestGroups.map((group) => (
                  <details className="lab-patient-record-group" key={group.patient.id} open>
                    <summary>
                      <span>
                        <strong>{patientName(group.patient)}</strong>
                        <small>MRN: {group.patient.mrn || "Walk-in"}</small>
                      </span>
                      <b>{group.requests.length} completed test{group.requests.length === 1 ? "" : "s"}</b>
                    </summary>
                    <div className="lab-cards-grid">
                      {group.requests.map((request) => (
                        <article key={request.id} className="lab-request-card completed">
                          {/* Tier 1: Status & Order Number */}
                          <div className="lab-card-meta-bar">
                            <span className="lab-badge-status completed">
                              ✓ COMPLETED & AUTHORIZED
                            </span>
                            <span className="lab-card-order-no">{request.requestNumber}</span>
                          </div>

                          {/* Tier 2: Full-Width Investigation Title & Specimen */}
                          <div className="lab-card-test-block">
                            <h3 className="lab-test-title">{requestDisplayName(request)}</h3>
                            <div className="lab-card-tags-row">
                              <span className="lab-specimen-pill">
                                Specimen: <strong>{request.template.specimen || "Standard"}</strong>
                              </span>
                              {request.template.category && (
                                <span className="lab-category-pill-tag">{request.template.category}</span>
                              )}
                            </div>
                          </div>

                          {/* Tier 3: Dedicated Patient Strip */}
                          <div className="lab-card-patient-strip">
                            <div className="lab-patient-avatar-sm">
                              <FiUser />
                            </div>
                            <div className="lab-patient-strip-info">
                              <strong className="lab-patient-name">{patientName(request.patient)}</strong>
                              <span className="lab-patient-sub">
                                MRN: <strong>{request.patient?.mrn || "Walk-in"}</strong> • {formatDate(request.createdAt)}
                              </span>
                            </div>
                          </div>

                          {request.interpretation && (
                            <div className="lab-notes-box">
                              <strong>Impression:</strong> "{request.interpretation}"
                            </div>
                          )}

                          <div className="lab-card-actions-row">
                            <button
                              type="button"
                              className="lab-action-btn primary report"
                              onClick={() => handleOpenPrint(request, "result")}
                            >
                              <FiPrinter /> Official Report
                            </button>

                            <button
                              type="button"
                              className="lab-action-btn share"
                              onClick={() => setShareModalRequest(request)}
                              title="Share test result via WhatsApp, Email, SMS, or Link"
                            >
                              <FiShare2 /> Share Result
                            </button>

                            <button
                              type="button"
                              className="lab-action-btn secondary"
                              onClick={() => handleOpenPrint(request, "request")}
                            >
                              <FiFileText /> Tracking Slip
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </details>
                ))}
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

        {/* 5B. SHARE LAB RESULT MODAL */}
        {shareModalRequest && (
          <ShareLabResultModal
            request={shareModalRequest}
            onClose={() => setShareModalRequest(null)}
          />
        )}

        {/* 6. SKIP / CANCEL INVESTIGATION MODAL */}
        {skipTargetRequest && (
          <div className="lab-modal-overlay" onClick={() => setSkipTargetRequest(null)}>
            <div className="lab-modal-content skip-modal" onClick={(e) => e.stopPropagation()}>
              <div className="lab-modal-header">
                <div className="lab-modal-header-title">
                  <div className="lab-modal-icon-badge danger">
                    <FiSlash />
                  </div>
                  <div>
                    <h3>Skip Laboratory Investigation</h3>
                    <p>Discontinue or cancel this test from the laboratory work queue.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="lab-modal-close-btn"
                  onClick={() => setSkipTargetRequest(null)}
                  title="Close modal"
                >
                  <FiX />
                </button>
              </div>

              <div className="lab-skip-modal-body">
                <div className="lab-skip-test-summary">
                  <div>
                    <label>Test Panel</label>
                    <strong>{requestDisplayName(skipTargetRequest)}</strong>
                  </div>
                  <div>
                    <label>Patient</label>
                    <strong>{patientName(skipTargetRequest.patient)}</strong>
                  </div>
                  <div>
                    <label>Order #</label>
                    <span>{skipTargetRequest.requestNumber}</span>
                  </div>
                  <div>
                    <label>Specimen</label>
                    <span>{skipTargetRequest.template.specimen || "Standard Specimen"}</span>
                  </div>
                </div>

                <div className="lab-skip-reason-section">
                  <label className="lab-field-label">
                    Reason for Skipping <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div className="lab-skip-presets-grid">
                    {[
                      "Patient declined investigation",
                      "Sample insufficient / hemolyzed",
                      "Contraindicated / duplicate order",
                      "Reagent / analyzer unavailable",
                      "Cancelled by requesting doctor",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`lab-skip-preset-chip ${skipReason === preset ? "active" : ""}`}
                        onClick={() => setSkipReason(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: "12px" }}>
                    <label className="lab-field-label">Additional Technician Remarks (Optional)</label>
                    <textarea
                      rows={2}
                      value={skipCustomNote}
                      onChange={(e) => setSkipCustomNote(e.target.value)}
                      placeholder="e.g. Patient refused venous puncture, doctor notified at 11:30 AM..."
                      className="lab-skip-textarea"
                    />
                  </div>
                </div>
              </div>

              <div className="lab-modal-footer">
                <button
                  type="button"
                  className="lab-modal-btn cancel"
                  onClick={() => setSkipTargetRequest(null)}
                  disabled={saving}
                >
                  Keep in Queue
                </button>
                <button
                  type="button"
                  className="lab-modal-btn confirm-skip"
                  onClick={handleConfirmSkipTest}
                  disabled={saving}
                >
                  <FiSlash /> {saving ? "Skipping..." : "Confirm Skip Test"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
