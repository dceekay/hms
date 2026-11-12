import { Link } from "react-router-dom";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  FiBriefcase,
  FiCamera,
  FiCheckCircle,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiTruck,
  FiUser,
  FiUsers,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import SecurityEntryLogList from "../../components/security/SecurityEntryLogList";
import {
  checkoutSecurityEntry,
  createSecurityEntry,
  fetchSecurityEntries,
} from "../../services/security/securityService";
import { lookupStaffByCardNumber } from "../../services/userService";
import { SecurityEntryFormValues, SecurityEntryLog } from "../../types/security";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { HMS_SYNC_FLUSHED_EVENT } from "../../utils/appEvents";

const initialForm: SecurityEntryFormValues = {
  personType: "patient",
  name: "",
  phone: "",
  patientId: "",
  staffIdCardNumber: "",
  purpose: "",
  destination: "",
  notes: "",
};

const personTypeOptions: Array<{
  value: SecurityEntryFormValues["personType"];
  label: string;
  hint: string;
  icon: typeof FiUser;
}> = [
  { value: "patient", label: "Patient", hint: "Coming for care", icon: FiUser },
  { value: "patient_relative", label: "Relative", hint: "Family / visitor", icon: FiUsers },
  { value: "staff", label: "Staff", hint: "Hospital worker", icon: FiBriefcase },
  { value: "guest", label: "Guest", hint: "Delivery / visitor", icon: FiTruck },
];

const quickDestinations = [
  "OPD / Reception",
  "Emergency / A&E",
  "Ward",
  "Pharmacy",
  "Lab",
  "Admin Office",
];

const quickPurposes: Record<SecurityEntryFormValues["personType"], string[]> = {
  patient: ["Clinic Visit", "Emergency Care", "Lab / Scan", "Drug Pickup"],
  patient_relative: ["Visiting Patient", "Bringing Food / Items", "Discharge Pickup"],
  staff: ["Duty / Shift", "Official Meeting", "On-Call"],
  guest: ["Delivery / Supply", "Official Visit", "Maintenance / Repair"],
};

type QuickFilter = "inside" | "all" | "checked_out";

function normalizeStaffId(value?: string) {
  return (value ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
}

function cleanPayload(values: SecurityEntryFormValues): SecurityEntryFormValues {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === "" ? undefined : value])
  ) as SecurityEntryFormValues;
}

async function compressImageToWebp(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSize = 640;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare image.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.72));

  if (!blob) {
    throw new Error("Unable to compress image.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read compressed image."));
    reader.readAsDataURL(blob);
  });

  bitmap.close();

  return {
    dataUrl,
    mimeType: "image/webp",
    sizeBytes: blob.size,
    width,
    height,
  };
}

export default function SecurityEntryPage() {
  const [form, setForm] = useState<SecurityEntryFormValues>(initialForm);
  const [entries, setEntries] = useState<SecurityEntryLog[]>([]);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("inside");
  const [loading, setLoading] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [staffLookupState, setStaffLookupState] = useState<
    "idle" | "searching" | "found" | "not_found"
  >("idle");
  const [staffLookupMessage, setStaffLookupMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { pendingCount, isBrowserOnline, syncing, syncNow } = useOfflineSync();

  const requiresIdentity = form.personType === "patient_relative" || form.personType === "staff";
  const requiresStaffId = form.personType === "staff";
  const patientIdentityOptional = form.personType === "patient";
  const photoPreview = form.photoDataUrl;

  const activeCount = useMemo(
    () => entries.filter((entry) => !entry.checkedOutAt).length,
    [entries]
  );

  const visibleEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (quickFilter === "inside" && entry.checkedOutAt) return false;
      if (quickFilter === "checked_out" && !entry.checkedOutAt) return false;
      if (!term) return true;
      const haystack = [
        entry.name,
        entry.phone,
        entry.staffIdCardNumber,
        entry.patientId,
        entry.destination,
        entry.purpose,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [entries, quickFilter, search]);

  const update = (field: keyof SecurityEntryFormValues, value: string) => {
    const nextValue =
      field === "staffIdCardNumber" ? normalizeStaffId(value) : value;

    setForm((current) => ({
      ...current,
      [field]: nextValue,
      ...(field === "personType" && value !== "staff"
        ? { staffIdCardNumber: "" }
        : {}),
      ...(field === "personType" && value !== "patient"
        ? { patientId: "" }
        : {}),
    }));
  };

  useEffect(() => {
    if (form.personType !== "staff") {
      setStaffLookupState("idle");
      setStaffLookupMessage(null);
      return;
    }

    const staffId = normalizeStaffId(form.staffIdCardNumber);

    if (!staffId) {
      setStaffLookupState("idle");
      setStaffLookupMessage("Type or scan the staff ID card number.");
      return;
    }

    if (staffId.length < 15) {
      setStaffLookupState("idle");
      setStaffLookupMessage("Keep typing the full staff ID...");
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setStaffLookupState("searching");
      setStaffLookupMessage("Checking staff card...");

      void lookupStaffByCardNumber(staffId).then((staff) => {
        if (!active) return;

        if (!staff) {
          setStaffLookupState("not_found");
          setStaffLookupMessage(
            isBrowserOnline
              ? "Staff ID not found or inactive."
              : "Offline: staff ID not cached yet. You can type their name manually."
          );
          return;
        }

        setForm((current) => {
          if (
            current.personType !== "staff" ||
            normalizeStaffId(current.staffIdCardNumber) !== staff.staffId
          ) {
            return current;
          }

          return {
            ...current,
            staffIdCardNumber: staff.staffId,
            name: staff.fullName,
            phone: staff.phone ?? "",
            destination: staff.serviceArea?.name ?? current.destination,
            notes:
              current.notes ||
              `Verified staff: ${staff.roles.join(", ") || staff.username}`,
          };
        });

        setStaffLookupState("found");
        setStaffLookupMessage(
          `${staff.fullName} verified${staff.serviceArea?.name ? ` • ${staff.serviceArea.name}` : ""}.`
        );
      });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.personType, form.staffIdCardNumber, isBrowserOnline]);

  const loadEntries = async (searchTerm = "") => {
    setLoadingEntries(true);
    const response = await fetchSecurityEntries(searchTerm, { take: 80 });
    setLoadingEntries(false);

    if (response) {
      setEntries(response);
    }
  };

  useEffect(() => {
    void loadEntries("");

    const handleSynced = () => {
      void loadEntries("");
    };
    window.addEventListener(HMS_SYNC_FLUSHED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(HMS_SYNC_FLUSHED_EVENT, handleSynced);
    };
  }, []);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    setError(null);

    try {
      const photo = await compressImageToWebp(file);
      setForm((current) => ({
        ...current,
        photoDataUrl: photo.dataUrl,
        photoMimeType: photo.mimeType,
        photoSizeBytes: photo.sizeBytes,
        photoWidth: photo.width,
        photoHeight: photo.height,
      }));
    } catch {
      setError("Could not load that photo. Please try a smaller picture.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const clearPhoto = () => {
    setForm((current) => ({
      ...current,
      photoDataUrl: undefined,
      photoMimeType: undefined,
      photoSizeBytes: undefined,
      photoWidth: undefined,
      photoHeight: undefined,
    }));
  };

  const resetForm = () => {
    setForm({ ...initialForm, personType: form.personType });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (requiresIdentity && !form.name?.trim()) {
      setError(
        form.personType === "staff"
          ? "Please enter the staff name (or wait for Staff ID lookup)."
          : "Please enter the visitor's full name."
      );
      return;
    }

    if (form.personType === "patient_relative" && !form.phone?.trim()) {
      setError("Please enter a phone number for the patient relative.");
      return;
    }

    if (requiresStaffId && !form.staffIdCardNumber?.trim()) {
      setError("Please enter the Staff ID card number.");
      return;
    }

    setLoading(true);
    const entry = await createSecurityEntry(cleanPayload(form));
    setLoading(false);

    if (!entry) {
      setError("Could not save gate entry. Please check the fields and try again.");
      return;
    }

    setSuccess(
      entry.queued
        ? "Saved offline on this device. It will sync automatically once network is back."
        : "Gate check-in recorded!"
    );
    setForm({ ...initialForm, personType: form.personType });
    setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
  };

  const handleCheckout = async (entry: SecurityEntryLog) => {
    const checkedOut = await checkoutSecurityEntry(entry.id);
    if (checkedOut) {
      setEntries((current) =>
        current.map((item) => (item.id === entry.id ? checkedOut : item))
      );
    }
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    void loadEntries(search);
  };

  return (
    <AdminLayout>
      <div className="security-entry-page">
        <section className="security-hero">
          <div>
            <p className="eyebrow">Security & Gate Desk</p>
            <h1>Gate Check-In</h1>
            <p>
              Quickly log patients, relatives, staff, and visitors coming in or going out.
              Works even when the network goes off.
            </p>
          </div>

          <div className="security-hero-stats">
            <div className="security-live-count">
              <FiShield />
              <strong>{activeCount}</strong>
              <span>Inside Now</span>
            </div>
          </div>
        </section>

        <div className={`security-sync-bar ${isBrowserOnline ? "online" : "offline"}`}>
          <div className="security-sync-state">
            {isBrowserOnline ? <FiWifi /> : <FiWifiOff />}
            <div>
              <strong>
                {isBrowserOnline
                  ? "System Online"
                  : "Offline Mode — Saving on this device"}
              </strong>
              <small>
                {pendingCount > 0
                  ? `${pendingCount} record${pendingCount === 1 ? "" : "s"} waiting to sync to server`
                  : isBrowserOnline
                  ? "All gate records are up to date"
                  : "You can keep checking people in and out; everything will sync when network returns."}
              </small>
            </div>
          </div>

          {pendingCount > 0 && (
            <button
              type="button"
              className="security-sync-btn"
              onClick={() => void syncNow()}
              disabled={!isBrowserOnline || syncing}
            >
              <FiRefreshCw className={syncing ? "spin" : ""} />
              <span>{syncing ? "Syncing..." : isBrowserOnline ? "Sync Now" : "Waiting for Network"}</span>
            </button>
          )}
        </div>

        <div className="security-layout">
          <form className="security-form" onSubmit={handleSubmit}>
            <div className="security-section-head">
              <h2>1. Who is at the gate?</h2>
              <button type="button" className="security-reset-link" onClick={resetForm}>
                <FiRotateCcw />
                Clear form
              </button>
            </div>

            <div className="person-type-grid">
              {personTypeOptions.map(({ value, label, hint, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={form.personType === value ? "person-type active" : "person-type"}
                  onClick={() => update("personType", value)}
                >
                  <Icon />
                  <span>
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="security-section-head">
              <h2>2. Person details</h2>
            </div>

            <div className="form-grid">
              {requiresStaffId && (
                <label className="staff-lookup-field">
                  Staff ID Card Number <span>*</span>
                  <input
                    value={form.staffIdCardNumber ?? ""}
                    onChange={(event) => update("staffIdCardNumber", event.target.value)}
                    placeholder="e.g. MDS202600000001"
                    autoCapitalize="characters"
                  />
                  {staffLookupMessage && (
                    <small className={`staff-lookup-message ${staffLookupState}`}>
                      {staffLookupMessage}
                    </small>
                  )}
                </label>
              )}

              <label>
                Full Name {requiresIdentity && <span>*</span>}
                {patientIdentityOptional && <small>Optional if emergency patient</small>}
                <input
                  value={form.name ?? ""}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder={patientIdentityOptional ? "Enter name (or leave blank for emergency)" : "Enter full name"}
                />
              </label>

              <label>
                Phone Number {form.personType === "patient_relative" && <span>*</span>}
                {(patientIdentityOptional || form.personType === "staff") && (
                  <small>
                    {form.personType === "staff"
                      ? "Auto-filled from staff card when online"
                      : "Optional for emergency"}
                  </small>
                )}
                <input
                  value={form.phone ?? ""}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="e.g. 0803 123 4567"
                  inputMode="tel"
                />
              </label>

              {form.personType === "patient" && (
                <label>
                  Patient Folder / MRN (optional)
                  <input
                    value={form.patientId ?? ""}
                    onChange={(event) => update("patientId", event.target.value)}
                    placeholder="If patient has a hospital card"
                  />
                </label>
              )}
            </div>

            <div className="security-quick-group">
              <label>
                Where are they going? (Destination)
                <input
                  value={form.destination ?? ""}
                  onChange={(event) => update("destination", event.target.value)}
                  placeholder="Tap a quick option below or type..."
                />
              </label>
              <div className="security-chip-row">
                {quickDestinations.map((place) => (
                  <button
                    key={place}
                    type="button"
                    className={form.destination === place ? "security-chip active" : "security-chip"}
                    onClick={() => update("destination", place)}
                  >
                    {place}
                  </button>
                ))}
              </div>
            </div>

            <div className="security-quick-group">
              <label>
                Why are they here? (Purpose)
                <input
                  value={form.purpose ?? ""}
                  onChange={(event) => update("purpose", event.target.value)}
                  placeholder="Tap a quick option below or type..."
                />
              </label>
              <div className="security-chip-row">
                {quickPurposes[form.personType].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className={form.purpose === reason ? "security-chip active" : "security-chip"}
                    onClick={() => update("purpose", reason)}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <label>
              Extra Note (optional)
              <textarea
                value={form.notes ?? ""}
                onChange={(event) => update("notes", event.target.value)}
                rows={2}
                placeholder="e.g. Vehicle plate number, items carried, or emergency note"
              />
            </label>

            <div className="security-photo-row">
              <label className="photo-capture">
                <FiCamera />
                <span>{photoLoading ? "Preparing photo..." : "Take / Upload Photo (optional)"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  disabled={photoLoading}
                />
              </label>

              {photoPreview && (
                <div className="photo-preview">
                  <img src={photoPreview} alt="Entry preview" />
                  <button type="button" onClick={clearPhoto} title="Remove photo">
                    <FiTrash2 />
                  </button>
                  <small>{Math.ceil((form.photoSizeBytes ?? 0) / 1024)}KB</small>
                </div>
              )}
            </div>

            {error && <p className="registration-error">{error}</p>}
            {success && <p className="security-success">{success}</p>}

            <button className="registration-submit" type="submit" disabled={loading || photoLoading}>
              {loading ? "Saving..." : "Check In Now"}
              <FiCheckCircle />
            </button>
          </form>

          <aside className="security-log-panel">
            <div className="panel-title">
              <div>
                <h2>People at the Gate</h2>
                <p>Tap "Check Out" when someone leaves the compound.</p>
              </div>
              <Link className="icon-text-btn" to="/security/logs">
                All logs
              </Link>
            </div>

            <div className="security-filter-tabs" role="tablist" aria-label="Filter gate list">
              <button
                type="button"
                className={quickFilter === "inside" ? "active" : ""}
                onClick={() => setQuickFilter("inside")}
              >
                Still Inside ({activeCount})
              </button>
              <button
                type="button"
                className={quickFilter === "all" ? "active" : ""}
                onClick={() => setQuickFilter("all")}
              >
                All ({entries.length})
              </button>
              <button
                type="button"
                className={quickFilter === "checked_out" ? "active" : ""}
                onClick={() => setQuickFilter("checked_out")}
              >
                Checked Out
              </button>
            </div>

            <form className="security-search" onSubmit={handleSearch}>
              <FiSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, staff ID, place..."
              />
              <button type="submit" title="Refresh from server">
                <FiRefreshCw />
              </button>
            </form>

            <SecurityEntryLogList
              entries={visibleEntries}
              loading={loadingEntries}
              emptyMessage={
                quickFilter === "inside"
                  ? "No one is currently marked inside."
                  : "No gate records match your search."
              }
              onCheckout={handleCheckout}
            />
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
