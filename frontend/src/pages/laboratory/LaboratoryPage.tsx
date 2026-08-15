import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiClipboard,
  FiEdit3,
  FiFileText,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
} from "react-icons/fi";
import { FaFlask } from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import { useOfflineQueueCount } from "../../hooks/useOfflineSync";
import mdsLogo from "../../assets/optimized/logo.png";
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

const emptyRequestForm: LaboratoryRequestFormValues = {
  patientId: "",
  templateId: "",
  clinicalNotes: "",
};

const emptyResultForm: LaboratoryResultFormValues = {
  resultValues: {},
  interpretation: "",
  technicianNote: "",
};

function patientName(patient: Patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function patientOptionLabel(patient: Patient) {
  return `${patientName(patient)}${patient.mrn ? ` | ${patient.mrn}` : ""}${patient.phone ? ` | ${patient.phone}` : ""}`;
}

function templateLabel(template: LaboratoryTemplate) {
  return `${template.name}${template.code ? ` | ${template.code}` : ""}${template.specimen ? ` | ${template.specimen}` : ""}`;
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
  return status.replace("_", " ");
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
  const [activeTab, setActiveTab] = useState<"requests" | "results">("requests");
  const [requestSearch, setRequestSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LaboratoryRequestStatus | "all">("all");
  const [patientPicker, setPatientPicker] = useState("");
  const [templatePicker, setTemplatePicker] = useState("");
  const [requestForm, setRequestForm] = useState<LaboratoryRequestFormValues>(emptyRequestForm);
  const [activeResult, setActiveResult] = useState<LaboratoryRequest | null>(null);
  const [resultForm, setResultForm] = useState<LaboratoryResultFormValues>(emptyResultForm);
  const [selectedReport, setSelectedReport] = useState<LaboratoryRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pendingCount = (summary.pending ?? 0) + (summary.sample_collected ?? 0) + (summary.in_progress ?? 0);
  const completedCount = summary.completed ?? 0;

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === requestForm.templateId),
    [requestForm.templateId, templates]
  );

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === requestForm.patientId),
    [patients, requestForm.patientId]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [patientResult, templateResult, requestResult] = await Promise.all([
      fetchPatients({ status: "active" }),
      fetchLaboratoryTemplates("", false),
      fetchLaboratoryRequests({ search: requestSearch, status: statusFilter }),
    ]);

    setLoading(false);

    if (!patientResult || !templateResult.result || !requestResult.result) {
      setError(templateResult.error ?? requestResult.error ?? "Unable to load laboratory workspace.");
      return;
    }

    setPatients(patientResult);
    setTemplates(templateResult.result.items);
    setRequests(requestResult.result.items);
    setSummary(requestResult.result.summary);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const refresh = () => {
      void loadData();
    };

    window.addEventListener(HMS_DATA_MUTATED_EVENT, refresh);
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, refresh);
    window.addEventListener("online", refresh);

    const timer = window.setInterval(refresh, 20000);

    return () => {
      window.removeEventListener(HMS_DATA_MUTATED_EVENT, refresh);
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, refresh);
      window.removeEventListener("online", refresh);
      window.clearInterval(timer);
    };
  }, [requestSearch, statusFilter]);

  const handlePatientPick = (value: string) => {
    setPatientPicker(value);
    const patient = patients.find((item) => patientOptionLabel(item) === value);
    setRequestForm((current) => ({ ...current, patientId: patient?.id ?? "" }));
  };

  const handleTemplatePick = (value: string) => {
    setTemplatePicker(value);
    const template = templates.find((item) => templateLabel(item) === value);
    setRequestForm((current) => ({ ...current, templateId: template?.id ?? "" }));
  };

  const handleRequestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await createLaboratoryRequest(requestForm);
    setSaving(false);

    if (!result.request) {
      setError(result.error ?? "Unable to create laboratory request.");
      return;
    }

    setSuccess(`Request ${result.request.requestNumber} created.`);
    setRequestForm(emptyRequestForm);
    setPatientPicker("");
    setTemplatePicker("");
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

    if (!activeResult) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await completeLaboratoryRequest(activeResult.id, resultForm);
    setSaving(false);

    if (result.queued) {
      setSuccess("Result saved offline. It will sync automatically when internet returns.");
      setActiveResult(null);
      setResultForm(emptyResultForm);
      return;
    }

    if (!result.request) {
      setError(result.error ?? "Unable to complete result.");
      return;
    }

    setSuccess(`${result.request.requestNumber} completed.`);
    setActiveResult(null);
    setResultForm(emptyResultForm);
    setSelectedReport(result.request);
    await loadData();
  };

  const updateStatus = async (request: LaboratoryRequest, status: LaboratoryRequestStatus) => {
    setSaving(true);
    setError(null);
    const result = await updateLaboratoryRequestStatus(request.id, status);
    setSaving(false);

    if (!result.request) {
      setError(result.error ?? "Unable to update request.");
      return;
    }

    setSuccess(`Request marked as ${statusLabel(status)}.`);
    await loadData();
  };

  const printReport = (request: LaboratoryRequest) => {
    setSelectedReport(request);
    window.setTimeout(() => window.print(), 80);
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="laboratory-page">
          <section className="setup-hero laboratory-hero">
            <div>
              <p className="eyebrow">Laboratory</p>
              <h1>Tests & Results</h1>
              <p>Create lab requests, complete template-based reports, and print results.</p>
            </div>
            <div className="billing-summary-grid laboratory-summary-grid">
              <span>
                <strong>{requests.length}</strong>
                <small>Total requests</small>
              </span>
              <span>
                <strong>{pendingCount}</strong>
                <small>In progress</small>
              </span>
              <span>
                <strong>{completedCount}</strong>
                <small>Completed</small>
              </span>
              <span>
                <strong>{templates.length}</strong>
                <small>Templates</small>
              </span>
            </div>
          </section>

          <div className="pharmacy-tabs laboratory-tabs">
            {[
              { id: "requests", label: "Requests", icon: <FiClipboard /> },
              { id: "results", label: "Results", icon: <FiCheckCircle /> },
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
            {canManageTemplates && (
              <Link to="/laboratory/templates">
                <FiFileText />
                Manage templates
              </Link>
            )}
            <button type="button" onClick={loadData}>
              <FiRefreshCw />
              Refresh
            </button>
          </div>

          {error && <p className="registration-error">{error}</p>}
          {success && <p className="security-success">{success}</p>}
          {offlinePendingCount > 0 && (
            <p className={`sync-inline-notice ${isBrowserOnline ? "online" : "offline"}`}>
              {offlinePendingCount} offline item{offlinePendingCount === 1 ? "" : "s"} waiting to sync.
            </p>
          )}

          {activeTab === "requests" && (
            <section className="laboratory-request-layout">
              <form className="setup-form laboratory-request-form" onSubmit={handleRequestSubmit}>
                <div className="panel-title">
                  <div>
                    <h2>New Request</h2>
                    <p>Choose a patient and test template.</p>
                  </div>
                  <FaFlask />
                </div>

                <label>
                  Patient
                  <input
                    list="lab-patient-options"
                    value={patientPicker}
                    onChange={(event) => handlePatientPick(event.target.value)}
                    placeholder="Search patient by name, MRN or phone"
                    required
                  />
                  <datalist id="lab-patient-options">
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

                <label>
                  Test template
                  <input
                    list="lab-template-options"
                    value={templatePicker}
                    onChange={(event) => handleTemplatePick(event.target.value)}
                    placeholder="Search test template"
                    required
                  />
                  <datalist id="lab-template-options">
                    {templates.filter((template) => template.isActive).map((template) => (
                      <option key={template.id} value={templateLabel(template)} />
                    ))}
                  </datalist>
                </label>

                {selectedTemplate && (
                  <div className="laboratory-template-preview">
                    <strong>{selectedTemplate.reportTitle || selectedTemplate.name}</strong>
                    <small>{selectedTemplate.fields.length} result field(s) | {selectedTemplate.specimen || "Specimen not set"}</small>
                  </div>
                )}

                <label>
                  Clinical notes
                  <textarea
                    rows={3}
                    value={requestForm.clinicalNotes}
                    onChange={(event) => setRequestForm((current) => ({ ...current, clinicalNotes: event.target.value }))}
                    placeholder="Symptoms, doctor request, or sample note"
                  />
                </label>

                <button className="registration-submit" type="submit" disabled={saving || !canCreate}>
                  {saving ? "Saving..." : "Create Request"}
                  <FiSave />
                </button>
              </form>

              <section className="setup-list-panel">
                <div className="setup-list-header laboratory-filter-bar">
                  <div className="patient-search-control">
                    <FiSearch />
                    <input
                      value={requestSearch}
                      onChange={(event) => setRequestSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void loadData();
                      }}
                      placeholder="Search request, patient, MRN, test"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as LaboratoryRequestStatus | "all")}
                  >
                    <option value="all">All status</option>
                    <option value="pending">Pending</option>
                    <option value="sample_collected">Sample collected</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="button" className="icon-text-btn" onClick={loadData}>
                    <FiRefreshCw />
                    Search
                  </button>
                </div>

                {loading && <p className="muted-text">Loading laboratory requests...</p>}
                <div className="laboratory-request-list">
                  {requests.length === 0 && <p className="muted-text">No lab requests yet.</p>}
                  {requests.map((request) => (
                    <article className="laboratory-request-card" key={request.id}>
                      <div className="laboratory-card-main">
                        <div className="setup-provider-title">
                          <strong>{request.template.name}</strong>
                          <span className={`laboratory-status-badge ${request.status}`}>
                            {statusLabel(request.status)}
                          </span>
                        </div>
                        <p>{patientName(request.patient)} | {request.patient.mrn || "No MRN"}</p>
                        <small>{request.requestNumber} | {formatDate(request.createdAt)}</small>
                      </div>
                      <div className="laboratory-card-side">
                        <small>Specimen</small>
                        <strong>{request.template.specimen || "N/A"}</strong>
                      </div>
                      <div className="patient-row-actions laboratory-actions">
                        {request.status === "pending" && canUpdate && (
                          <button type="button" className="icon-text-btn" disabled={saving} onClick={() => updateStatus(request, "sample_collected")}>
                            Sample
                          </button>
                        )}
                        {request.status !== "completed" && request.status !== "cancelled" && canComplete && (
                          <button type="button" className="icon-text-btn" onClick={() => openResultForm(request)}>
                            <FiEdit3 />
                            Result
                          </button>
                        )}
                        {request.status === "completed" && (
                          <button type="button" className="icon-text-btn" onClick={() => printReport(request)}>
                            <FiPrinter />
                            Print
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          )}

          {activeTab === "results" && (
            <section className="laboratory-result-layout">
              <form className="setup-form laboratory-result-form" onSubmit={handleCompleteResult}>
                <div className="panel-title">
                  <div>
                    <h2>{activeResult ? activeResult.template.name : "Result Entry"}</h2>
                    <p>{activeResult ? `${patientName(activeResult.patient)} | ${activeResult.requestNumber}` : "Select a request to enter results."}</p>
                  </div>
                  <FiCheckCircle />
                </div>

                {!activeResult && <p className="muted-text">Open a request from the list to fill its template.</p>}

                {activeResult && (
                  <>
                    <div className="laboratory-result-grid">
                      {activeResult.template.fields.map((field) => (
                        <label key={field.key}>
                          {field.label}
                          {field.type === "textarea" ? (
                            <textarea
                              rows={3}
                              value={resultForm.resultValues[field.key] ?? ""}
                              onChange={(event) => handleResultValueChange(field.key, event.target.value)}
                              required={field.required}
                            />
                          ) : field.type === "select" ? (
                            <select
                              value={resultForm.resultValues[field.key] ?? ""}
                              onChange={(event) => handleResultValueChange(field.key, event.target.value)}
                              required={field.required}
                            >
                              <option value="">Select value</option>
                              {(field.options ?? []).map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type === "number" ? "number" : "text"}
                              value={resultForm.resultValues[field.key] ?? ""}
                              onChange={(event) => handleResultValueChange(field.key, event.target.value)}
                              required={field.required}
                            />
                          )}
                          {(field.unit || field.referenceRange) && (
                            <small>{field.unit ? `Unit: ${field.unit}` : ""}{field.unit && field.referenceRange ? " | " : ""}{field.referenceRange ? `Ref: ${field.referenceRange}` : ""}</small>
                          )}
                        </label>
                      ))}
                    </div>

                    <label>
                      Interpretation
                      <textarea
                        rows={3}
                        value={resultForm.interpretation}
                        onChange={(event) => setResultForm((current) => ({ ...current, interpretation: event.target.value }))}
                        placeholder="Clinical interpretation or summary"
                      />
                    </label>

                    <label>
                      Technician note
                      <textarea
                        rows={3}
                        value={resultForm.technicianNote}
                        onChange={(event) => setResultForm((current) => ({ ...current, technicianNote: event.target.value }))}
                        placeholder="Internal lab note"
                      />
                    </label>

                    <div className="setup-actions">
                      <button type="button" className="icon-text-btn" onClick={() => setActiveResult(null)}>
                        Cancel
                      </button>
                      <button className="registration-submit" type="submit" disabled={saving || !canComplete}>
                        {saving ? "Saving..." : "Complete Result"}
                        <FiSave />
                      </button>
                    </div>
                  </>
                )}
              </form>

              <section className="setup-list-panel">
                <div className="panel-title">
                  <div>
                    <h2>Ready Queue</h2>
                    <p>Pending and in-progress tests.</p>
                  </div>
                  <FiClipboard />
                </div>
                <div className="laboratory-request-list compact">
                  {requests.filter((request) => request.status !== "completed" && request.status !== "cancelled").map((request) => (
                    <button className="laboratory-queue-item" type="button" key={request.id} onClick={() => openResultForm(request)}>
                      <span>
                        <strong>{request.template.name}</strong>
                        <small>{patientName(request.patient)} | {request.requestNumber}</small>
                      </span>
                      <b>{statusLabel(request.status)}</b>
                    </button>
                  ))}
                </div>
              </section>
            </section>
          )}

          {selectedReport && (
            <section className="laboratory-print-template" aria-label="Printable laboratory report">
              <div className="laboratory-print-header">
                <img src={mdsLogo} alt="MDS Hospital" />
                <div>
                  <h2>MDS Hospital</h2>
                  <p>{selectedReport.template.reportTitle || selectedReport.template.name}</p>
                </div>
                <span>{selectedReport.requestNumber}</span>
              </div>

              <div className="laboratory-print-meta">
                <span><small>Patient</small><strong>{patientName(selectedReport.patient)}</strong></span>
                <span><small>MRN</small><strong>{selectedReport.patient.mrn || "N/A"}</strong></span>
                <span><small>Specimen</small><strong>{selectedReport.template.specimen || "N/A"}</strong></span>
                <span><small>Completed</small><strong>{formatDate(selectedReport.completedAt)}</strong></span>
              </div>

              <table className="laboratory-print-table">
                <thead>
                  <tr>
                    <th>Test parameter</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.template.fields.map((field) => (
                    <tr key={field.key}>
                      <td>{field.label}</td>
                      <td>{String(selectedReport.resultValues?.[field.key] ?? "")}</td>
                      <td>{field.unit || ""}</td>
                      <td>{field.referenceRange || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="laboratory-print-notes">
                <span>
                  <small>Interpretation</small>
                  <strong>{selectedReport.interpretation || "Not provided"}</strong>
                </span>
                <span>
                  <small>Technician</small>
                  <strong>
                    {selectedReport.completedBy
                      ? `${selectedReport.completedBy.firstName} ${selectedReport.completedBy.lastName}`
                      : "Laboratory"}
                  </strong>
                </span>
              </div>

              <p className="pharmacy-print-footer">
                This report is valid only with MDS Hospital authorization.
              </p>
            </section>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
