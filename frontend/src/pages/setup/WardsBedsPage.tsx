import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiHome,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSlash,
  FiTool,
  FiUserPlus,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import { FaBed } from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import {
  assignPatientToBed,
  createWard,
  dischargeWardAssignment,
  fetchWardDashboard,
  updateWardBedStatus,
} from "../../services/wardService";
import {
  BedStatus,
  WardAdmissionRequest,
  WardAssignmentFormValues,
  WardBed,
  WardDashboard,
  WardFormValues,
} from "../../types/ward";
import { Patient } from "../../types/patient";
import { useAuthStore } from "../../store/authStore";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { HMS_SYNC_FLUSHED_EVENT } from "../../utils/appEvents";
import { confirmImportantAction } from "../../utils/sweetAlert";

const emptyForm: WardAssignmentFormValues = {
  patientId: "",
  bedId: "",
  doctorId: "",
  admissionRequestId: "",
  priority: "routine",
  diagnosis: "",
  reason: "",
  notes: "",
  expectedDischargeAt: "",
};

const emptyWardForm: WardFormValues = {
  name: "",
  code: "",
  department: "",
  building: "",
  floor: "",
  wardType: "",
  nurseStation: "",
  wardManager: "",
  contactNumber: "",
  description: "",
};

const statusLabels: Record<BedStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  blocked: "Blocked",
};

function patientName(patient?: Patient | null) {
  if (!patient) return "No patient";
  return `${patient.firstName} ${patient.lastName}`;
}

function userName(user?: { firstName: string; lastName: string; username: string } | null) {
  if (!user) return "Not assigned";
  return `${user.firstName} ${user.lastName}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function patientAge(patient: Patient) {
  const birthDate = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
  if (!birthDate || Number.isNaN(birthDate.getTime())) return "Age n/a";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return `${age} yrs`;
}

function bedLabel(bed: WardBed) {
  const room = bed.room?.roomNumber ? ` - ${bed.room.roomNumber}` : "";
  const ward = bed.ward?.name ? ` - ${bed.ward.name}` : "";
  return `${bed.bedNumber}${room}${ward}`;
}

export default function WardsBedsPage() {
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const canManageWards = roles.some((role) => ["Super Admin", "Administrator"].includes(role));
  const [dashboard, setDashboard] = useState<WardDashboard | null>(null);
  const [form, setForm] = useState<WardAssignmentFormValues>(emptyForm);
  const [wardForm, setWardForm] = useState<WardFormValues>(emptyWardForm);
  const [search, setSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<BedStatus | "all">("all");
  const [showAddWard, setShowAddWard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWard, setSavingWard] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assignFormRef = useRef<HTMLFormElement | null>(null);
  const { pendingCount, isBrowserOnline, syncing, syncNow } = useOfflineSync();

  async function loadData() {
    setLoading(true);
    setError(null);
    const result = await fetchWardDashboard();
    setLoading(false);

    if (!result.dashboard) {
      setError(result.error ?? "Unable to load wards and beds.");
      return;
    }

    setDashboard(result.dashboard);
  }

  useEffect(() => {
    void loadData();

    const handleSynced = () => {
      void loadData();
    };
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, handleSynced);
    };
  }, []);

  const filteredPatients = useMemo(() => {
    const term = patientFilter.trim().toLowerCase();
    const list = dashboard?.patients ?? [];
    if (!term) return list;
    return list.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.mrn ?? ""} ${p.phone ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [dashboard?.patients, patientFilter]);

  const availableBeds = useMemo(
    () =>
      (dashboard?.wards ?? [])
        .flatMap((ward) => ward.beds)
        .filter((bed) => ["available", "reserved"].includes(bed.status)),
    [dashboard?.wards]
  );

  const filteredWards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (dashboard?.wards ?? []).map((ward) => ({
      ...ward,
      beds: ward.beds.filter((bed) => {
        const occupant = bed.currentAssignment?.patient;
        const haystack = [
          ward.name,
          ward.code ?? "",
          ward.department ?? "",
          ward.building ?? "",
          ward.floor ?? "",
          ward.wardType ?? "",
          ward.description ?? "",
          bed.bedNumber,
          bed.room?.roomNumber ?? "",
          occupant ? patientName(occupant) : "",
          occupant?.mrn ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return (
          (wardFilter === "all" || ward.id === wardFilter) &&
          (statusFilter === "all" || bed.status === statusFilter) &&
          (!query || haystack.includes(query))
        );
      }),
    })).filter((ward) => ward.beds.length > 0 || wardFilter === ward.id);
  }, [dashboard?.wards, search, statusFilter, wardFilter]);

  function updateField(field: keyof WardAssignmentFormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateWardField(field: keyof WardFormValues, value: string) {
    setWardForm((current) => ({ ...current, [field]: value }));
  }

  function useRequest(request: WardAdmissionRequest) {
    setForm({
      patientId: request.patientId,
      bedId: request.bedId ?? "",
      doctorId: request.doctorId,
      admissionRequestId: request.id,
      priority: request.priority,
      diagnosis: request.diagnosis ?? "",
      reason: request.reason,
      notes: request.notes ?? "",
      expectedDischargeAt: "",
    });
    setMessage("Admission request loaded into the assignment form.");
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await assignPatientToBed(form);
    setSaving(false);

    if (!result.assignment) {
      setError(result.error ?? "Unable to assign patient to bed.");
      return;
    }

    setForm(emptyForm);
    setMessage("Patient assigned. Bed is now occupied.");
    await loadData();
  }

  async function handleCreateWard(event: FormEvent) {
    event.preventDefault();
    setSavingWard(true);
    setError(null);
    setMessage(null);

    const result = await createWard(wardForm);
    setSavingWard(false);

    if (!result.ward) {
      setError(result.error ?? "Unable to create ward.");
      return;
    }

    setWardForm(emptyWardForm);
    setMessage("Ward created successfully.");
    await loadData();
  }

  async function handleDischarge(assignmentId: string, occupantName?: string) {
    const confirmed = await confirmImportantAction({
      title: "Discharge Patient?",
      text: `Discharge ${occupantName || "this patient"} and send the bed to cleaning?`,
      confirmButtonText: "Yes, Discharge",
      cancelButtonText: "Cancel",
      icon: "warning",
    });
    if (!confirmed) return;

    const result = await dischargeWardAssignment(assignmentId);

    if (!result.assignment) {
      setError(result.error ?? "Unable to discharge patient.");
      return;
    }

    setMessage(
      (result as { queued?: boolean }).queued
        ? "Discharge saved offline. It will sync automatically when network returns."
        : "Patient discharged. Bed moved to cleaning."
    );
    await loadData();
  }

  async function handleBedStatus(bed: WardBed, status: Exclude<BedStatus, "occupied">) {
    const result = await updateWardBedStatus(bed.id, status);

    if (!result.bed) {
      setError(result.error ?? "Unable to update bed status.");
      return;
    }

    setMessage(`Bed ${bed.bedNumber} marked ${statusLabels[status].toLowerCase()}.`);
    await loadData();
  }

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="ward-page">
          <section className="ward-hero">
            <div>
              <p className="eyebrow">Ward Care</p>
              <h1>Wards &amp; Beds</h1>
              <p>Admit patients to beds, track cleaning &amp; readiness, and manage discharges.</p>
            </div>
            <div className="ward-summary-grid">
              <span><strong>{dashboard?.summary.total ?? 0}</strong><small>Total Beds</small></span>
              <span><strong>{dashboard?.summary.available ?? 0}</strong><small>Available</small></span>
              <span><strong>{dashboard?.summary.occupied ?? 0}</strong><small>Occupied</small></span>
              <span><strong>{dashboard?.summary.occupancyRate ?? 0}%</strong><small>Occupancy</small></span>
            </div>
          </section>

          <div className={`security-sync-bar ${isBrowserOnline ? "online" : "offline"}`}>
            <div className="security-sync-state">
              {isBrowserOnline ? <FiWifi /> : <FiWifiOff />}
              <div>
                <strong>
                  {isBrowserOnline ? "System Online" : "Offline Mode — Saving ward changes on this device"}
                </strong>
                <small>
                  {pendingCount > 0
                    ? `${pendingCount} change${pendingCount === 1 ? "" : "s"} waiting to sync`
                    : "All ward & bed records are synced"}
                </small>
              </div>
            </div>
            <div className="ward-top-actions">
              {canManageWards && showAddWard && (
                <button
                  type="button"
                  className="icon-text-btn"
                  onClick={() => setShowAddWard((prev) => !prev)}
                >
                  <FiPlus />
                  {showAddWard ? "Hide Add Ward" : "Add New Ward"}
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  type="button"
                  className="security-sync-btn"
                  onClick={() => void syncNow()}
                  disabled={!isBrowserOnline || syncing}
                >
                  <FiRefreshCw className={syncing ? "spin" : ""} />
                  <span>{syncing ? "Syncing..." : "Sync Now"}</span>
                </button>
              )}
            </div>
          </div>

          {(message || error) && (
            <div className={error ? "registration-error" : "security-success"}>
              {error || message}
            </div>
          )}

          <section className="ward-layout">
            <form ref={assignFormRef} className="setup-form ward-assignment-form" onSubmit={handleAssign}>
              <div className="panel-title">
                <div>
                  <h2>Admit / Assign Patient</h2>
                  <p>Pick a patient, available bed, and reason for admission.</p>
                </div>
                <FiUserPlus />
              </div>

              <div className="form-grid">
                <label className="span-2">
                  Find Patient (type name or MRN to filter)
                  <input
                    value={patientFilter}
                    onChange={(event) => setPatientFilter(event.target.value)}
                    placeholder="Type patient name, MRN, or phone..."
                  />
                </label>
                <label>
                  Patient
                  <select value={form.patientId} onChange={(event) => updateField("patientId", event.target.value)} required>
                    <option value="">Select patient ({filteredPatients.length})</option>
                    {filteredPatients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patientName(patient)} {patient.mrn ? `- ${patient.mrn}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Bed
                  <select value={form.bedId} onChange={(event) => updateField("bedId", event.target.value)} required>
                    <option value="">Select available bed</option>
                    {availableBeds.map((bed) => (
                      <option key={bed.id} value={bed.id}>
                        {bedLabel(bed)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Doctor
                  <select value={form.doctorId} onChange={(event) => updateField("doctorId", event.target.value)}>
                    <option value="">No doctor selected</option>
                    {(dashboard?.doctors ?? []).map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {userName(doctor)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </label>
                <label>
                  Expected discharge
                  <input
                    type="datetime-local"
                    value={form.expectedDischargeAt}
                    onChange={(event) => updateField("expectedDischargeAt", event.target.value)}
                  />
                </label>
                <label>
                  Diagnosis
                  <input value={form.diagnosis} onChange={(event) => updateField("diagnosis", event.target.value)} />
                </label>
                <label className="span-2">
                  Reason
                  <textarea value={form.reason} onChange={(event) => updateField("reason", event.target.value)} required />
                </label>
                <label className="span-2">
                  Notes
                  <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
                </label>
              </div>

              <button className="registration-submit" type="submit" disabled={saving}>
                {saving ? "Assigning..." : "Assign Bed"}
                <FaBed />
              </button>
            </form>

            <section className="setup-list-panel ward-request-panel">
              <div className="setup-list-header">
                <h2>Doctor Requests</h2>
                <button className="icon-text-btn" type="button" onClick={loadData}>
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              {(dashboard?.admissionRequests ?? []).length === 0 && (
                <p className="muted-text">No pending admission requests.</p>
              )}

              <div className="ward-request-list">
                {(dashboard?.admissionRequests ?? []).map((request) => (
                  <article className="ward-request-card" key={request.id}>
                    <div>
                      <strong>{patientName(request.patient)}</strong>
                      <p>{request.requestNumber} - {request.reason}</p>
                      <small>
                        {request.ward?.name ?? "Any ward"} - {request.priority} - Dr. {userName(request.doctor)}
                      </small>
                    </div>
                    <button className="icon-text-btn" type="button" onClick={() => useRequest(request)}>
                      Use Request
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </section>

          {canManageWards && showAddWard && (
            <section className="setup-list-panel ward-admin-panel">
              <div className="panel-title">
                <div>
                  <h2>Add Ward</h2>
                  <p>Register ward details for bed planning.</p>
                </div>
                <FiHome />
              </div>

              <form className="ward-admin-form" onSubmit={handleCreateWard}>
                <div className="form-grid">
                  <label>
                    Ward name
                    <input value={wardForm.name} onChange={(event) => updateWardField("name", event.target.value)} required />
                  </label>
                  <label>
                    Ward code
                    <input value={wardForm.code} onChange={(event) => updateWardField("code", event.target.value)} placeholder="MED-A" />
                  </label>
                  <label>
                    Department
                    <input value={wardForm.department} onChange={(event) => updateWardField("department", event.target.value)} placeholder="Medical" />
                  </label>
                  <label>
                    Ward type
                    <input value={wardForm.wardType} onChange={(event) => updateWardField("wardType", event.target.value)} placeholder="General, ICU, Maternity" />
                  </label>
                  <label>
                    Building
                    <input value={wardForm.building} onChange={(event) => updateWardField("building", event.target.value)} />
                  </label>
                  <label>
                    Floor
                    <input value={wardForm.floor} onChange={(event) => updateWardField("floor", event.target.value)} />
                  </label>
                  <label>
                    Nurse station
                    <input value={wardForm.nurseStation} onChange={(event) => updateWardField("nurseStation", event.target.value)} />
                  </label>
                  <label>
                    Ward manager
                    <input value={wardForm.wardManager} onChange={(event) => updateWardField("wardManager", event.target.value)} />
                  </label>
                  <label>
                    Contact number
                    <input value={wardForm.contactNumber} onChange={(event) => updateWardField("contactNumber", event.target.value)} />
                  </label>
                  <label className="span-2">
                    Description
                    <textarea value={wardForm.description} onChange={(event) => updateWardField("description", event.target.value)} />
                  </label>
                </div>

                <button className="registration-submit" type="submit" disabled={savingWard}>
                  {savingWard ? "Saving..." : "Add Ward"}
                  <FiHome />
                </button>
              </form>
            </section>
          )}

          <section className="setup-list-panel ward-board-panel">
            <div className="smart-filter-pills" role="group" aria-label="Quick bed status filter">
              <button
                type="button"
                className={statusFilter === "all" ? "active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                All Beds
              </button>
              {Object.entries(statusLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={statusFilter === value ? "active" : ""}
                  onClick={() => setStatusFilter(value as BedStatus)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="setup-list-header">
              <div className="patient-search-control">
                <FiSearch />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, MRN, bed, room" />
              </div>
              <select value={wardFilter} onChange={(event) => setWardFilter(event.target.value)}>
                <option value="all">All wards</option>
                {(dashboard?.wards ?? []).map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BedStatus | "all")}>
                <option value="all">All statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            {loading && <p className="muted-text">Loading ward board...</p>}

            <div className="ward-board-list">
              {filteredWards.map((ward) => (
                <article className="ward-card" key={ward.id}>
                  <div className="ward-card-header">
                    <div>
                      <h2>{ward.name}</h2>
                      <p>
                        {[ward.code, ward.department, ward.wardType].filter(Boolean).join(" - ") ||
                          "General inpatient ward"}
                      </p>
                    </div>
                    <span>{ward.summary.occupied}/{ward.summary.total} occupied</span>
                  </div>

                  <div className="ward-detail-strip">
                    <span><small>Location</small><strong>{[ward.building, ward.floor].filter(Boolean).join(" - ") || "Not set"}</strong></span>
                    <span><small>Nurse Station</small><strong>{ward.nurseStation || "Not set"}</strong></span>
                    <span><small>Manager</small><strong>{ward.wardManager || "Not set"}</strong></span>
                    <span><small>Contact</small><strong>{ward.contactNumber || "Not set"}</strong></span>
                  </div>

                  <div className="ward-mini-stats">
                    <span><strong>{ward.summary.available}</strong><small>Available</small></span>
                    <span><strong>{ward.summary.cleaning}</strong><small>Cleaning</small></span>
                    <span><strong>{ward.summary.reserved}</strong><small>Reserved</small></span>
                    <span><strong>{ward.summary.maintenance + ward.summary.blocked}</strong><small>Unavailable</small></span>
                  </div>

                  <div className="bed-grid">
                    {ward.beds.map((bed) => {
                      const assignment = bed.currentAssignment;
                      return (
                        <article className={`bed-card ${bed.status}`} key={bed.id}>
                          <div className="bed-card-top">
                            <strong>{bed.bedNumber}</strong>
                            <span>{statusLabels[bed.status]}</span>
                          </div>
                          <p>{bed.room?.roomNumber || "No room"} {bed.room?.roomType ? `- ${bed.room.roomType}` : ""}</p>

                          {assignment ? (
                            <div className="bed-occupant">
                              <strong>{patientName(assignment.patient)}</strong>
                              <small>{assignment.patient.mrn || "No MRN"} - {patientAge(assignment.patient)} - {assignment.patient.gender}</small>
                              <small><FiClock /> In: {formatDateTime(assignment.admittedAt)}</small>
                              <small>Dr. {userName(assignment.doctor)}</small>
                              <button
                                className="icon-text-btn danger"
                                type="button"
                                onClick={() => void handleDischarge(assignment.id, patientName(assignment.patient))}
                              >
                                <FiSlash />
                                Discharge
                              </button>
                            </div>
                          ) : (
                            <div className="bed-actions">
                              {["available", "reserved"].includes(bed.status) && (
                                <button
                                  className="icon-text-btn primary"
                                  type="button"
                                  onClick={() => {
                                    updateField("bedId", bed.id);
                                    assignFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }}
                                >
                                  <FaBed />
                                  Admit Here
                                </button>
                              )}
                              {bed.status === "cleaning" && (
                                <button className="icon-text-btn" type="button" onClick={() => void handleBedStatus(bed, "available")}>
                                  <FiCheckCircle />
                                  Mark Ready
                                </button>
                              )}
                              {bed.status === "available" && (
                                <>
                                  <button className="icon-text-btn" type="button" onClick={() => void handleBedStatus(bed, "reserved")}>
                                    <FiFilter />
                                    Reserve
                                  </button>
                                  <button className="icon-text-btn" type="button" onClick={() => void handleBedStatus(bed, "maintenance")}>
                                    <FiTool />
                                    Maintenance
                                  </button>
                                </>
                              )}
                              {bed.status === "reserved" && (
                                <button className="icon-text-btn" type="button" onClick={() => void handleBedStatus(bed, "available")}>
                                  Release
                                </button>
                              )}
                              {(bed.status === "maintenance" || bed.status === "blocked") && (
                                <button className="icon-text-btn" type="button" onClick={() => void handleBedStatus(bed, "available")}>
                                  <FiCheckCircle />
                                  Mark Ready
                                </button>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
