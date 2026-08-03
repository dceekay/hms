import {
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  FiCamera,
  FiChevronDown,
  FiCreditCard,
  FiEdit3,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSlash,
  FiTrash2,
  FiUserCheck,
  FiX,
} from "react-icons/fi";

import { PatientIdCard } from "../../components/patients/PatientIdCard";
import { nigeriaStates } from "../../constants/nigeriaStates";
import AdminLayout from "../../layouts/AdminLayout";
import mdsLogo from "../../assets/logo.png";

import "../../styles/patient-list.css";

import {
  convertInvestigationPatient,
  deactivatePatient,
  fetchPatientInsuranceProviders,
  fetchPatientQr,
  fetchPatients,
  reactivatePatient,
  updatePatient,
  type PatientUpdatePayload,
} from "../../services/patients/patientService";

import { useAuthStore } from "../../store/authStore";

import {
  type Patient,
  type PatientFormValues,
  type PatientInsuranceProvider,
  type PatientQr,
  patientSchema,
} from "../../types/patient";
import { compressImageToWebp } from "../../utils/imageCompression";

const categoryLabels: Record<string, string> = {
  new_patient: "New patient",
  investigation_patient: "Investigation",
  old_patient: "Old patient",
};

function formatCategory(category?: string) {
  return (
    categoryLabels[category ?? "new_patient"] ??
    "New patient"
  );
}

function formatStatus(status?: string) {
  return status
    ? status.charAt(0).toUpperCase() +
        status.slice(1)
    : "Active";
}

function dateToInput(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateAge(value?: string) {
  if (!value) {
    return "Age not set";
  }

  const birthDate = new Date(value);

  if (Number.isNaN(birthDate.getTime())) {
    return "Age not set";
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0
    ? `${age} yrs`
    : "Age not set";
}

function formatGender(value?: string) {
  if (!value) {
    return "Not set";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function getInitials(patient: Patient) {
  const first =
    patient.firstName
      ?.trim()
      .charAt(0) ?? "";

  const last =
    patient.lastName
      ?.trim()
      .charAt(0) ?? "";

  return (
    `${first}${last}`.toUpperCase() ||
    "PT"
  );
}

/*
 * Generates a stable colour from the insurance provider ID.
 *
 * The colour looks random, but the same provider always
 * receives the same colour.
 */
function hashToHue(value: string) {
  let hash = 0;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash =
      value.charCodeAt(index) +
      ((hash << 5) - hash);

    hash |= 0;
  }

  return Math.abs(hash) % 360;
}

type InsurancePillStyle =
  CSSProperties & {
    "--insurance-hue": string;
  };

function getInsurancePillStyle(
  value: string
): InsurancePillStyle {
  return {
    "--insurance-hue": String(
      hashToHue(value)
    ),
  };
}

/*
 * Empty optional fields are sent as null so old saved
 * values can be removed from the patient record.
 */
function cleanEditPayload(
  values: PatientFormValues
): PatientUpdatePayload {
  return Object.fromEntries(
    Object.entries(values).map(
      ([key, value]) => [
        key,
        value === "" ? null : value,
      ]
    )
  ) as PatientUpdatePayload;
}

function patientToForm(
  patient: Patient
): PatientFormValues {
  return {
    firstName:
      patient.firstName ?? "",

    lastName:
      patient.lastName ?? "",

    email:
      patient.email ?? "",

    phone:
      patient.phone ?? "",

    photoUrl:
      patient.photoUrl ?? "",

    photoDataUrl:
      patient.photoDataUrl ?? "",

    photoMimeType:
      patient.photoMimeType ?? "",

    photoSizeBytes:
      patient.photoSizeBytes ?? undefined,

    photoWidth:
      patient.photoWidth ?? undefined,

    photoHeight:
      patient.photoHeight ?? undefined,

    dateOfBirth:
      dateToInput(patient.dateOfBirth),

    gender:
      patient.gender as PatientFormValues["gender"],

    patientCategory:
      patient.patientCategory as PatientFormValues["patientCategory"],

    address:
      patient.address ?? "",

    city:
      patient.city ?? "",

    state:
      patient.state ?? "",

    country:
      patient.country ?? "Nigeria",

    emergencyContactName:
      patient.emergencyContactName ?? "",

    emergencyContactPhone:
      patient.emergencyContactPhone ?? "",

    emergencyContactRelationship:
      patient.emergencyContactRelationship ??
      "",

    bloodGroup:
      patient.bloodGroup ?? "",

    genotype:
      patient.genotype ?? "",

    allergies:
      patient.allergies ?? "",

    insuranceProviderId:
      patient.insuranceProviderId ?? "",

    insurancePolicyNumber:
      patient.insurancePolicyNumber ?? "",

    insuranceCoverageStatus:
      patient.insuranceCoverageStatus ??
      "",
  };
}

export function PatientListPage() {
  const permissions = useAuthStore(
    (state) =>
      state.user?.permissions ?? []
  );

  const canConvert =
    permissions.includes(
      "patients.convert"
    );

  const canReactivate =
    permissions.includes(
      "patients.reactivate"
    );

  const canUpdate =
    permissions.includes(
      "patients.update"
    );

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [
    insuranceProviders,
    setInsuranceProviders,
  ] = useState<
    PatientInsuranceProvider[]
  >([]);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("");

  const [
    selectedPatient,
    setSelectedPatient,
  ] = useState<Patient | null>(null);

  const [
    selectedQr,
    setSelectedQr,
  ] = useState<PatientQr | null>(null);

  const [
    editingPatient,
    setEditingPatient,
  ] = useState<Patient | null>(null);

  const [
    editForm,
    setEditForm,
  ] = useState<PatientFormValues | null>(
    null
  );

  const [loading, setLoading] =
    useState(false);

  const [loadingQr, setLoadingQr] =
    useState(false);

  const [
    loadingInsuranceProviders,
    setLoadingInsuranceProviders,
  ] = useState(false);

  const [
    savingPatient,
    setSavingPatient,
  ] = useState(false);

  const [
    photoLoading,
    setPhotoLoading,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [qrError, setQrError] =
    useState<string | null>(null);

  const [editError, setEditError] =
    useState<string | null>(null);

  const [
    insuranceProviderError,
    setInsuranceProviderError,
  ] = useState<string | null>(null);

  const loadPatients = async (
    filters = {
      searchTerm: search,
      status: statusFilter,
      category: categoryFilter,
    }
  ) => {
    setLoading(true);
    setError(null);

    const response =
      await fetchPatients({
        search: filters.searchTerm,
        status: filters.status,
        patientCategory:
          filters.category,
      });

    if (!response) {
      setError(
        "Unable to load patients. Please try again."
      );
    } else {
      setPatients(response);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadPatients({
      searchTerm: search,
      status: statusFilter,
      category: categoryFilter,
    });
  }, [
    statusFilter,
    categoryFilter,
  ]);

  useEffect(() => {
    let mounted = true;

    setLoadingInsuranceProviders(true);
    setInsuranceProviderError(null);

    void fetchPatientInsuranceProviders()
      .then(
        ({
          providers,
          error:
            providerLoadingError,
        }) => {
          if (!mounted) {
            return;
          }

          setInsuranceProviders(
            providers ?? []
          );

          setInsuranceProviderError(
            providers
              ? null
              : providerLoadingError ??
                  "Unable to load insurance providers."
          );

          setLoadingInsuranceProviders(
            false
          );
        }
      );

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearch = (
    event: FormEvent
  ) => {
    event.preventDefault();

    void loadPatients({
      searchTerm: search,
      status: statusFilter,
      category: categoryFilter,
    });
  };

  const clearSearch = () => {
    setSearch("");
    setStatusFilter("");
    setCategoryFilter("");

    void loadPatients({
      searchTerm: "",
      status: "",
      category: "",
    });
  };

  const handlePatientAction =
    async (
      patient: Patient,
      action:
        | "convert"
        | "reactivate"
        | "deactivate"
    ) => {
      setError(null);

      const result =
        action === "convert"
          ? await convertInvestigationPatient(
              patient.id
            )
          : action === "reactivate"
            ? await reactivatePatient(
                patient.id
              )
            : await deactivatePatient(
                patient.id
              );

      if (!result) {
        setError(
          "Unable to update patient. Please confirm your permission and try again."
        );

        return;
      }

      setPatients((current) =>
        current.map((item) =>
          item.id === result.id
            ? {
                ...item,
                ...result,
              }
            : item
        )
      );

      if (
        selectedPatient?.id ===
        result.id
      ) {
        setSelectedPatient({
          ...selectedPatient,
          ...result,
        });
      }
    };

  const handleViewIdCard =
    async (patient: Patient) => {
      setSelectedPatient(patient);
      setSelectedQr(null);
      setQrError(null);
      setLoadingQr(true);

      const qr =
        await fetchPatientQr(
          patient.id
        );

      setLoadingQr(false);

      if (!qr) {
        setQrError(
          "Unable to load this patient's ID card."
        );

        return;
      }

      setSelectedQr(qr);
    };

  const handlePrintIdCard = () => {
    window.print();
  };

  const openEditPatient = (
    patient: Patient
  ) => {
    setEditingPatient(patient);
    setEditForm(
      patientToForm(patient)
    );
    setEditError(null);
  };

  const closeEditPatient = () => {
    setEditingPatient(null);
    setEditForm(null);
    setEditError(null);
  };

  const updateEditField = (
    field: keyof PatientFormValues,
    value: string
  ) => {
    setEditForm((current) => {
      if (!current) {
        return current;
      }

      if (
        field ===
        "insuranceProviderId"
      ) {
        return {
          ...current,

          insuranceProviderId:
            value,

          ...(value
            ? {}
            : {
                insurancePolicyNumber:
                  "",

                insuranceCoverageStatus:
                  "",
              }),
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  };

  const handleEditPhotoChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setPhotoLoading(true);
    setEditError(null);

    try {
      const photo = await compressImageToWebp(file, 520, 0.76);

      setEditForm((current) =>
        current
          ? {
              ...current,
              photoUrl: "",
              photoDataUrl: photo.dataUrl,
              photoMimeType: photo.mimeType,
              photoSizeBytes: photo.sizeBytes,
              photoWidth: photo.width,
              photoHeight: photo.height,
            }
          : current
      );
    } catch {
      setEditError("Unable to prepare patient photo. Try a smaller image.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const removeEditPhoto = () => {
    setEditForm((current) =>
      current
        ? {
            ...current,
            photoUrl: "",
            photoDataUrl: "",
            photoMimeType: "",
            photoSizeBytes: undefined,
            photoWidth: undefined,
            photoHeight: undefined,
          }
        : current
    );
  };

  const handleSavePatient = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (
      !editingPatient ||
      !editForm
    ) {
      return;
    }

    setEditError(null);

    if (
      !editForm.email?.trim() &&
      !editForm.phone?.trim()
    ) {
      setEditError(
        "At least one contact method, email or phone, is required."
      );

      return;
    }

    const validation =
      patientSchema.safeParse(
        editForm
      );

    if (!validation.success) {
      setEditError(
        validation.error
          .issues[0]?.message ??
          "Please check the patient information and try again."
      );

      return;
    }

    setSavingPatient(true);

    const {
      patient,
      error: saveError,
    } = await updatePatient(
      editingPatient.id,
      cleanEditPayload(
        validation.data
      )
    );

    setSavingPatient(false);

    if (!patient) {
      setEditError(
        saveError ??
          "Unable to save patient changes."
      );

      return;
    }

    const selectedProvider =
      insuranceProviders.find(
        (provider) =>
          provider.id ===
          patient.insuranceProviderId
      );

    const updatedPatient: Patient = {
      ...patient,

      insuranceProvider:
        selectedProvider ??
        patient.insuranceProvider ??
        null,
    };

    setPatients((current) =>
      current.map((item) =>
        item.id ===
        updatedPatient.id
          ? updatedPatient
          : item
      )
    );

    if (
      selectedPatient?.id ===
      updatedPatient.id
    ) {
      setSelectedPatient(
        updatedPatient
      );
    }

    closeEditPatient();
  };

  return (
    <AdminLayout>
      <main className="page-container patient-list-page">
        <div className="card">
          <div className="page-header">
            <div className="patient-page-title">
              <img
                src={mdsLogo}
                alt="MDS Hospital"
                className="patient-page-logo"
              />

              <h1>Patients</h1>

              <p>
                Find patients, update
                their records, and print
                ID cards when needed.
              </p>
            </div>
          </div>

          <form
            className="patient-list-toolbar"
            onSubmit={handleSearch}
          >
            <label>
              Search patients

              <div className="patient-search-control">
                <FiSearch />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="MRN, name, phone, email or policy number"
                />
              </div>
            </label>

            <label>
              Category

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All categories
                </option>

                <option value="new_patient">
                  New patients
                </option>

                <option value="investigation_patient">
                  Investigation
                </option>

                <option value="old_patient">
                  Old patients
                </option>
              </select>
            </label>

            <label>
              Status

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All status
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>

                <option value="deceased">
                  Deceased
                </option>
              </select>
            </label>

            <button
              type="submit"
              className="icon-text-btn"
            >
              <FiSearch />
              Search
            </button>

            {(search ||
              statusFilter ||
              categoryFilter) && (
              <button
                type="button"
                className="icon-text-btn"
                onClick={clearSearch}
              >
                <FiX />
                Clear
              </button>
            )}
          </form>

          {loading && (
            <p>Loading patients...</p>
          )}

          {error && (
            <p className="error-text">
              {error}
            </p>
          )}

          {!loading &&
            !error &&
            patients.length === 0 && (
              <p>
                No patients found yet.
                Use Register Patient to
                add one.
              </p>
            )}

          {patients.length > 0 && (
            <section
              className="patient-compact-list"
              aria-label="Patient records"
            >
              {patients.map(
                (patient) => {
                  const provider =
                    patient.insuranceProvider ??
                    insuranceProviders.find(
                      (item) =>
                        item.id ===
                        patient.insuranceProviderId
                    ) ??
                    null;

                  const insuranceName =
                    provider?.name?.trim() ||
                    "No insurance";

                  const insuranceColorKey =
                    provider?.id ||
                    provider?.name ||
                    patient.insuranceProviderId ||
                    "uninsured";

                  return (
                    <article
                      className="patient-compact-card"
                      key={patient.id}
                    >
                      <div className="patient-compact-identity">
                        <span
                          className="patient-compact-avatar"
                          aria-hidden="true"
                        >
                          {getInitials(
                            patient
                          )}
                        </span>

                        <div className="patient-compact-name">
                          <div className="patient-compact-title-line">
                            <strong
                              title={`${patient.firstName} ${patient.lastName}`}
                            >
                              {
                                patient.firstName
                              }{" "}
                              {
                                patient.lastName
                              }
                            </strong>

                            <span
                              className={`patient-status-badge ${
                                patient.status ??
                                "active"
                              }`}
                            >
                              {formatStatus(
                                patient.status
                              )}
                            </span>
                          </div>

                          <div className="patient-compact-badges">
                            <span
                              className="mrn-pill"
                              title={
                                patient.mrn ??
                                undefined
                              }
                            >
                              {patient.mrn ||
                                "MRN pending"}
                            </span>

                            <span
                              className={`patient-category-badge ${
                                patient.patientCategory ??
                                "new_patient"
                              }`}
                            >
                              {formatCategory(
                                patient.patientCategory
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="patient-compact-detail patient-contact-detail">
                        <span className="patient-compact-label">
                          Contact
                        </span>

                        <strong
                          title={
                            patient.phone ??
                            undefined
                          }
                        >
                          {patient.phone ||
                            "No phone"}
                        </strong>

                        <small
                          title={
                            patient.email ??
                            undefined
                          }
                        >
                          {patient.email ||
                            "No email"}
                        </small>
                      </div>

                      <div className="patient-compact-detail patient-profile-detail">
                        <span className="patient-compact-label">
                          Profile
                        </span>

                        <strong>
                          {calculateAge(
                            patient.dateOfBirth
                          )}{" "}
                          ·{" "}
                          {formatGender(
                            patient.gender
                          )}
                        </strong>

                        <small>
                          DOB{" "}
                          {formatDate(
                            patient.dateOfBirth
                          )}
                        </small>
                      </div>

                      <div className="patient-compact-detail patient-insurance-detail">
                        <span className="patient-compact-label">
                          Insurance
                        </span>

                        <span
                          className={`insurance-pill ${
                            provider
                              ? "available"
                              : "unavailable"
                          }`}
                          style={
                            provider
                              ? getInsurancePillStyle(
                                  insuranceColorKey
                                )
                              : undefined
                          }
                          title={
                            insuranceName
                          }
                        >
                          {insuranceName}
                        </span>

                        <small>
                          {provider
                            ? patient.insurancePolicyNumber ||
                              "Policy number not set"
                            : "Self pay / not provided"}
                        </small>
                      </div>

                      <div className="patient-row-actions patient-compact-actions">
                        <button
                          type="button"
                          className="icon-text-btn"
                          aria-label="Open patient ID card"
                          onClick={() =>
                            handleViewIdCard(
                              patient
                            )
                          }
                          title="Open patient ID card"
                        >
                          <FiCreditCard />
                          <span className="patient-action-label">
                            ID
                          </span>
                        </button>

                        {canUpdate && (
                          <button
                            type="button"
                            className="icon-text-btn"
                            aria-label="Edit patient"
                            onClick={() =>
                              openEditPatient(
                                patient
                              )
                            }
                            title="Edit patient"
                          >
                            <FiEdit3 />
                            <span className="patient-action-label">
                              Edit
                            </span>
                          </button>
                        )}

                        {canConvert &&
                          patient.patientCategory ===
                            "investigation_patient" && (
                            <button
                              type="button"
                              className="icon-text-btn success"
                              aria-label="Convert investigation patient"
                              onClick={() =>
                                handlePatientAction(
                                  patient,
                                  "convert"
                                )
                              }
                              title="Convert investigation patient"
                            >
                              <FiUserCheck />
                              <span className="patient-action-label">
                                Convert
                              </span>
                            </button>
                          )}

                        {canReactivate &&
                          patient.status ===
                            "inactive" && (
                            <button
                              type="button"
                              className="icon-text-btn success"
                              aria-label="Reactivate patient"
                              onClick={() =>
                                handlePatientAction(
                                  patient,
                                  "reactivate"
                                )
                              }
                              title="Reactivate patient"
                            >
                              <FiRefreshCw />
                              <span className="patient-action-label">
                                Active
                              </span>
                            </button>
                          )}

                        {canUpdate &&
                          (patient.status ??
                            "active") ===
                            "active" && (
                            <button
                              type="button"
                              className="icon-text-btn danger"
                              aria-label="Mark patient inactive"
                              onClick={() =>
                                handlePatientAction(
                                  patient,
                                  "deactivate"
                                )
                              }
                              title="Mark patient inactive"
                            >
                              <FiSlash />
                              <span className="patient-action-label">
                                Inactive
                              </span>
                            </button>
                          )}
                      </div>
                    </article>
                  );
                }
              )}
            </section>
          )}

          {selectedPatient && (
            <div
              className="patient-id-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Patient ID card"
            >
              <div
                className="patient-id-modal-backdrop"
                onClick={() =>
                  setSelectedPatient(
                    null
                  )
                }
              />

              <section className="patient-id-modal-panel">
                <div className="modal-header">
                  <div>
                    <p className="eyebrow">
                      Patient ID
                    </p>

                    <h2>
                      {
                        selectedPatient.firstName
                      }{" "}
                      {
                        selectedPatient.lastName
                      }
                    </h2>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="icon-text-btn"
                      onClick={handlePrintIdCard}
                    >
                      <FiPrinter />
                      Print
                    </button>

                    <button
                      type="button"
                      className="icon-only-btn"
                      onClick={() =>
                        setSelectedPatient(
                          null
                        )
                      }
                      aria-label="Close patient ID card"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>

                {loadingQr && (
                  <div className="id-empty-state">
                    <FiSearch />

                    <p>
                      Loading patient ID
                      card...
                    </p>
                  </div>
                )}

                {qrError && (
                  <p className="registration-error">
                    {qrError}
                  </p>
                )}

                {!loadingQr &&
                  !qrError && (
                    <PatientIdCard
                      patient={
                        selectedPatient
                      }
                      patientQr={
                        selectedQr
                      }
                      emptyMessage="This patient does not have a QR lookup code yet."
                    />
                  )}
              </section>
            </div>
          )}

          {editingPatient &&
            editForm && (
              <div
                className="patient-id-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Edit patient information"
              >
                <div
                  className="patient-id-modal-backdrop"
                  onClick={
                    closeEditPatient
                  }
                />

                <section className="patient-id-modal-panel patient-edit-modal-panel">
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">
                        Edit patient
                      </p>

                      <h2>
                        {
                          editingPatient.firstName
                        }{" "}
                        {
                          editingPatient.lastName
                        }
                      </h2>
                    </div>

                    <button
                      type="button"
                      className="icon-only-btn"
                      onClick={
                        closeEditPatient
                      }
                      aria-label="Close edit patient form"
                    >
                      <FiX />
                    </button>
                  </div>

                  <form
                    className="patient-edit-form"
                    onSubmit={
                      handleSavePatient
                    }
                  >
                    <div className="form-section">
                      <h3>
                        Patient Details
                      </h3>

                      <div className="patient-photo-control">
                        <label className="photo-capture">
                          <FiCamera />
                          <span>
                            {photoLoading
                              ? "Preparing photo..."
                              : editForm.photoDataUrl || editForm.photoUrl
                                ? "Change patient photo"
                                : "Add patient photo"}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={
                              handleEditPhotoChange
                            }
                            disabled={
                              photoLoading
                            }
                          />
                        </label>

                        {(editForm.photoDataUrl ||
                          editForm.photoUrl) && (
                          <div className="photo-preview">
                            <img
                              src={
                                editForm.photoDataUrl ||
                                editForm.photoUrl ||
                                ""
                              }
                              alt="Patient preview"
                            />
                            <button
                              type="button"
                              onClick={
                                removeEditPhoto
                              }
                              aria-label="Remove patient photo"
                            >
                              <FiTrash2 />
                            </button>
                            <small>
                              {editForm.photoSizeBytes
                                ? `${Math.ceil(
                                    editForm.photoSizeBytes /
                                      1024
                                  )}KB WebP`
                                : "Photo attached"}
                            </small>
                          </div>
                        )}
                      </div>

                      <div className="form-grid">
                        <label>
                          First name

                          <input
                            value={
                              editForm.firstName
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "firstName",
                                event.target
                                  .value
                              )
                            }
                            required
                          />
                        </label>

                        <label>
                          Last name

                          <input
                            value={
                              editForm.lastName
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "lastName",
                                event.target
                                  .value
                              )
                            }
                            required
                          />
                        </label>

                        <label>
                          Date of birth

                          <input
                            type="date"
                            value={
                              editForm.dateOfBirth
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "dateOfBirth",
                                event.target
                                  .value
                              )
                            }
                            required
                          />
                        </label>

                        <label>
                          Gender

                          <select
                            value={
                              editForm.gender
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "gender",
                                event.target
                                  .value
                              )
                            }
                          >
                            <option value="female">
                              Female
                            </option>

                            <option value="male">
                              Male
                            </option>

                            <option value="other">
                              Other
                            </option>
                          </select>
                        </label>

                        <label>
                          Category

                          <select
                            value={
                              editForm.patientCategory ??
                              "new_patient"
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "patientCategory",
                                event.target
                                  .value
                              )
                            }
                          >
                            <option value="new_patient">
                              New patient
                            </option>

                            <option value="investigation_patient">
                              Investigation
                              patient
                            </option>

                            <option value="old_patient">
                              Old patient
                            </option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="form-section">
                      <h3>Contact</h3>

                      <div className="form-grid">
                        <label>
                          Email

                          <input
                            type="email"
                            value={
                              editForm.email ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "email",
                                event.target
                                  .value
                              )
                            }
                          />
                        </label>

                        <label>
                          Phone

                          <input
                            value={
                              editForm.phone ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "phone",
                                event.target
                                  .value
                              )
                            }
                          />
                        </label>

                        <label>
                          Address

                          <input
                            value={
                              editForm.address ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "address",
                                event.target
                                  .value
                              )
                            }
                          />
                        </label>

                        <label>
                          City

                          <input
                            value={
                              editForm.city ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "city",
                                event.target
                                  .value
                              )
                            }
                          />
                        </label>

                        <label>
                          State

                          <select
                            value={
                              editForm.state ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "state",
                                event.target
                                  .value
                              )
                            }
                          >
                            <option value="">
                              Select state
                            </option>

                            {nigeriaStates.map(
                              (state) => (
                                <option
                                  key={
                                    state
                                  }
                                  value={
                                    state
                                  }
                                >
                                  {state}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label>
                          Country

                          <input
                            value={
                              editForm.country ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditField(
                                "country",
                                event.target
                                  .value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <details
                      className="registration-details"
                      open
                    >
                      <summary>
                        Additional details
                        <FiChevronDown />
                      </summary>

                      <div className="form-section">
                        <h3>
                          Emergency Contact
                        </h3>

                        <div className="form-grid">
                          <label>
                            Contact name

                            <input
                              value={
                                editForm.emergencyContactName ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditField(
                                  "emergencyContactName",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </label>

                          <label>
                            Contact phone

                            <input
                              value={
                                editForm.emergencyContactPhone ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditField(
                                  "emergencyContactPhone",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </label>

                          <label>
                            Relationship

                            <input
                              value={
                                editForm.emergencyContactRelationship ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditField(
                                  "emergencyContactRelationship",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>

                      <div className="form-section">
                        <h3>
                          Medical &amp;
                          Insurance
                        </h3>

                        <div className="form-grid">
                          <label>
                            Blood group

                            <input
                              value={
                                editForm.bloodGroup ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditField(
                                  "bloodGroup",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </label>

                          <label>
                            Genotype

                            <input
                              value={
                                editForm.genotype ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditField(
                                  "genotype",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </label>

                          <label>
                            Allergies

                            <input
                              value={
                                editForm.allergies ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditField(
                                  "allergies",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </label>

                          <label>
                            Insurance
                            provider

                            <select
                              value={
                                editForm.insuranceProviderId ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditField(
                                  "insuranceProviderId",
                                  event
                                    .target
                                    .value
                                )
                              }
                              disabled={
                                loadingInsuranceProviders
                              }
                            >
                              <option value="">
                                {loadingInsuranceProviders
                                  ? "Loading providers..."
                                  : "No insurance / Self pay"}
                              </option>

                              {insuranceProviders.map(
                                (
                                  provider
                                ) => (
                                  <option
                                    key={
                                      provider.id
                                    }
                                    value={
                                      provider.id
                                    }
                                  >
                                    {
                                      provider.name
                                    }

                                    {provider.code
                                      ? ` (${provider.code})`
                                      : ""}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <label>
                            Insurance
                            policy number

                            {editForm.insuranceProviderId && (
                              <span>
                                {" "}
                                *
                              </span>
                            )}

                            <input
                              value={
                                editForm.insurancePolicyNumber ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditField(
                                  "insurancePolicyNumber",
                                  event.target.value.toUpperCase()
                                )
                              }
                              placeholder="Example: CXHP-0001"
                              disabled={
                                !editForm.insuranceProviderId
                              }
                              required={Boolean(
                                editForm.insuranceProviderId
                              )}
                              pattern="(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9/-]+"
                              title="Use at least one letter and one number. Hyphens and slashes are allowed."
                            />
                          </label>

                          <label>
                            Coverage status

                            <select
                              value={
                                editForm.insuranceCoverageStatus ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditField(
                                  "insuranceCoverageStatus",
                                  event
                                    .target
                                    .value
                                )
                              }
                              disabled={
                                !editForm.insuranceProviderId
                              }
                            >
                              <option value="">
                                Not provided
                              </option>

                              <option value="active">
                                Active
                              </option>

                              <option value="pending">
                                Pending
                                verification
                              </option>

                              <option value="inactive">
                                Inactive
                              </option>

                              <option value="expired">
                                Expired
                              </option>
                            </select>
                          </label>
                        </div>

                        {insuranceProviderError && (
                          <p className="registration-error">
                            {
                              insuranceProviderError
                            }
                          </p>
                        )}
                      </div>
                    </details>

                    {editError && (
                      <p className="registration-error">
                        {editError}
                      </p>
                    )}

                    <button
                      className="registration-submit"
                      type="submit"
                      disabled={
                        savingPatient ||
                        photoLoading
                      }
                    >
                      {savingPatient
                        ? "Saving..."
                        : photoLoading
                          ? "Preparing photo..."
                        : "Save Changes"}

                      <FiSave />
                    </button>
                  </form>
                </section>
              </div>
            )}
        </div>
      </main>
    </AdminLayout>
  );
}
