import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { FiCamera, FiCheckCircle, FiLogIn, FiLogOut, FiRefreshCw, FiSearch, FiShield, FiTrash2 } from "react-icons/fi";
import AdminLayout from "../../layouts/AdminLayout";
import {
  checkoutSecurityEntry,
  createSecurityEntry,
  fetchSecurityEntries,
} from "../../services/security/securityService";
import { SecurityEntryFormValues, SecurityEntryLog } from "../../types/security";

const initialForm: SecurityEntryFormValues = {
  personType: "guest",
  name: "",
  phone: "",
  patientId: "",
  staffIdCardNumber: "",
  purpose: "",
  destination: "",
  notes: "",
};

const personTypeLabels: Record<SecurityEntryFormValues["personType"], string> = {
  patient: "Patient",
  patient_relative: "Patient Relative",
  staff: "Staff",
  guest: "Guest",
};

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
  const [loading, setLoading] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requiresIdentity = form.personType !== "guest";
  const requiresStaffId = form.personType === "staff";
  const photoPreview = form.photoDataUrl;

  const activeCount = useMemo(
    () => entries.filter((entry) => !entry.checkedOutAt).length,
    [entries]
  );

  const update = (
  field: keyof SecurityEntryFormValues,
  value: string
    ) => {
      setForm((current) => ({
        ...current,
        [field]: value,

        ...(field === "personType" && value !== "staff"
          ? { staffIdCardNumber: "" }
          : {}),

        ...(field === "personType" && value !== "patient"
          ? { patientId: "" }
          : {}),
      }));
    };

  const loadEntries = async (searchTerm = search) => {
    setLoadingEntries(true);
    const response = await fetchSecurityEntries(searchTerm);
    setLoadingEntries(false);

    if (response) {
      setEntries(response);
    }
  };

  useEffect(() => {
    loadEntries("");
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
      setError("Unable to prepare photo. Try a smaller image.");
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (requiresIdentity && (!form.name || !form.phone)) {
      setError("Name and phone are required for this entry type.");
      return;
    }

    if (requiresStaffId && !form.staffIdCardNumber) {
      setError("Staff ID card number is required for staff entry.");
      return;
    }

    setLoading(true);
    const entry = await createSecurityEntry(cleanPayload(form));
    setLoading(false);

    if (!entry) {
      setError("Unable to record entry. Check required fields and try again.");
      return;
    }

    setSuccess("Entry recorded successfully.");
    setForm(initialForm);
    loadEntries("");
  };

  const handleCheckout = async (entry: SecurityEntryLog) => {
    const checkedOut = await checkoutSecurityEntry(entry.id);
    if (checkedOut) {
      setEntries((current) => current.filter((item) => item.id !== entry.id));
    }
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    loadEntries(search);
  };

  return (
    <AdminLayout>
      <div className="security-entry-page">
        <section className="security-hero">
          <div>
            <p className="eyebrow">Security desk</p>
            <h1>Record entry point movement.</h1>
            <p>
              Capture patients, relatives, staff, and guests with quick identity checks,
              optional photo evidence, and checkout tracking.
            </p>
          </div>
          <div className="security-live-count">
            <FiShield />
            <strong>{activeCount}</strong>
            <span>inside</span>
          </div>
        </section>

        <div className="security-layout">
          <form className="security-form" onSubmit={handleSubmit}>
            <div className="person-type-grid">
              {Object.entries(personTypeLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={form.personType === value ? "person-type active" : "person-type"}
                  onClick={() => update("personType", value)}
                >
                  <FiLogIn />
                  {label}
                </button>
              ))}
            </div>

            <div className="form-grid">
              <label>
                Name {requiresIdentity && <span>*</span>}
                <input value={form.name ?? ""} onChange={(event) => update("name", event.target.value)} />
              </label>
              <label>
                Phone {requiresIdentity && <span>*</span>}
                <input value={form.phone ?? ""} onChange={(event) => update("phone", event.target.value)} />
              </label>
              {form.personType === "patient" && (
                <label>
                  Patient ID or MRN
                  <input value={form.patientId ?? ""} onChange={(event) => update("patientId", event.target.value)} />
                </label>
              )}
              {requiresStaffId && (
                <label>
                  Staff ID card number <span>*</span>
                  <input
                    value={form.staffIdCardNumber ?? ""}
                    onChange={(event) => update("staffIdCardNumber", event.target.value)}
                  />
                </label>
              )}
              <label>
                Purpose
                <input value={form.purpose ?? ""} onChange={(event) => update("purpose", event.target.value)} />
              </label>
              <label>
                Destination
                <input value={form.destination ?? ""} onChange={(event) => update("destination", event.target.value)} />
              </label>
            </div>

            <label>
              Notes
              <textarea value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value)} rows={3} />
            </label>

            <div className="security-photo-row">
              <label className="photo-capture">
                <FiCamera />
                <span>{photoLoading ? "Preparing photo..." : "Capture / Upload Photo"}</span>
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
                  <button type="button" onClick={clearPhoto}>
                    <FiTrash2 />
                  </button>
                  <small>{Math.ceil((form.photoSizeBytes ?? 0) / 1024)}KB WebP</small>
                </div>
              )}
            </div>

            {error && <p className="registration-error">{error}</p>}
            {success && <p className="security-success">{success}</p>}

            <button className="registration-submit" type="submit" disabled={loading || photoLoading}>
              {loading ? "Recording entry..." : "Record Entry"}
              <FiCheckCircle />
            </button>
          </form>

          <aside className="security-log-panel">
            <div className="panel-title">
              <div>
                <h2>Active Entry Log</h2>
                <p>People currently checked in.</p>
              </div>
              <FiRefreshCw />
            </div>

            <form className="security-search" onSubmit={handleSearch}>
              <FiSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, staff ID"
              />
              <button type="submit">Search</button>
            </form>

            {loadingEntries && <p>Loading entries...</p>}

            <div className="security-entry-list">
              {entries.map((entry) => (
                <article className="security-entry-card" key={entry.id}>
                  {entry.photoDataUrl ? <img src={entry.photoDataUrl} alt="" /> : <span className="entry-avatar" />}
                  <div>
                    <strong>{entry.name || personTypeLabels[entry.personType]}</strong>
                    <small>
                      {personTypeLabels[entry.personType]} {entry.phone ? `- ${entry.phone}` : ""}
                    </small>
                    {entry.staffIdCardNumber && <code>{entry.staffIdCardNumber}</code>}
                  </div>
                  <button type="button" onClick={() => handleCheckout(entry)}>
                    <FiLogOut />
                  </button>
                </article>
              ))}

              {!loadingEntries && entries.length === 0 && <p>No active security entries.</p>}
            </div>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
