import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FiBell,
  FiCheckCircle,
  FiCalendar,
  FiClipboard,
  FiClock,
  FiFileText,
  FiHome,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSend,
  FiShare2,
  FiTrash2,
  FiUser,
  FiWifi,
  FiWifiOff,
  FiActivity,
  FiAlertTriangle,
  FiPlus,
  FiCheck,
  FiVolume2,
  FiVolumeX,
  FiArrowRight,
  FiX,
  FiFolder,
  FiUsers,
  FiEye,
} from "react-icons/fi";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaFlask,
  FaNotesMedical,
  FaPills,
  FaUserMd,
  FaBed,
  FaUserInjured,
  FaPhoneAlt,
  FaPhoneSlash,
} from "react-icons/fa";
import PatientSearchSelect from "../../components/common/PatientSearchSelect";
import TestSearchSelect from "../../components/common/TestSearchSelect";
import AdminLayout from "../../layouts/AdminLayout";
import mdsLogo from "../../assets/optimized/logo.png";
import LaboratoryPrintModal from "../../components/laboratory/LaboratoryPrintModal";
import {
  completeClinicalEncounter,
  createAdmissionRequest,
  createClinicalEncounter,
  createPrescription,
  createReferral,
  fetchClinicalEncounters,
  fetchDoctorWorkspace,
} from "../../services/clinicalService";
import {
  createLaboratoryRequest,
  fetchLaboratoryRequests,
  fetchLaboratoryTemplates,
} from "../../services/laboratoryService";
import { fetchPatients } from "../../services/patients/patientService";
import { updateAppointmentStatus } from "../../services/appointmentService";
import { useAuthStore } from "../../store/authStore";
import { useOfflineQueueCount } from "../../hooks/useOfflineSync";
import { flushOfflineQueue } from "../../utils/offlineQueue";
import { HMS_DATA_MUTATED_EVENT } from "../../utils/appEvents";
import { confirmImportantAction, showSuccessWithSound } from "../../utils/sweetAlert";
import type { Appointment, AppointmentStatus } from "../../types/appointment";
import type {
  AdmissionRequestFormValues,
  Bed,
  ClinicalAdmissionRequest,
  ClinicalEncounter,
  ClinicalEncounterFormValues,
  ClinicalRequestPriority,
  ClinicalReferral,
  ClinicalWorkspace,
  PrescriptionItemFormValues,
  ReferralFormValues,
  Ward,
} from "../../types/clinical";
import type { LaboratoryRequest, LaboratoryTemplate } from "../../types/laboratory";
import type { Patient } from "../../types/patient";
import type { Medication } from "../../types/pharmacy";
import {
  CLINICAL_ALERT_REPEAT_MS,
  playClinicalAlertSound,
  startContinuousPhoneRing,
  stopContinuousPhoneRing,
  isPhoneRinging,
} from "../../utils/alertSound";
import "../../styles/doctor.css";

type DeskMode = "queue" | "patient";
type PatientClinicalTab = "note" | "prescription" | "lab" | "admission" | "referral" | "history";
type QueueTab = "waiting" | "all_patients" | "labs" | "schedule";

type DoctorReminder = {
  id: string;
  title: string;
  dateTime: string;
  patientId?: string;
  patientName?: string;
  note?: string;
  notifiedAt?: string;
  lastAlertAt?: string;
};

type ReminderForm = {
  title: string;
  date: string;
  time: string;
  patientId: string;
  note: string;
};

const priorityOptions: ClinicalRequestPriority[] = ["routine", "urgent", "emergency"];

const visitTypePresets = [
  "General OPD Consultation",
  "Follow-up Review",
  "Antenatal Care (ANC)",
  "Emergency Triage & Review",
  "Post-Op Review",
  "Specialist Consultation",
];

const diagnosisPresets = [
  "Uncomplicated Malaria",
  "Severe Malaria",
  "Essential Hypertension",
  "Upper Respiratory Tract Infection (URTI)",
  "Enteric Fever / Typhoid",
  "Acute Gastroenteritis",
  "Type 2 Diabetes Mellitus",
  "Peptic Ulcer Disease (PUD)",
  "Urinary Tract Infection (UTI)",
  "Bronchial Asthma",
];

const dosagePresets = [
  { label: "1 tab BD x 5 days", dose: "1 tablet", frequency: "Twice daily (BD)", duration: "5 days" },
  { label: "2 caps TDS x 7 days", dose: "2 capsules", frequency: "Three times daily (TDS)", duration: "7 days" },
  { label: "1 tab daily x 30 days", dose: "1 tablet", frequency: "Once daily (OD)", duration: "30 days" },
  { label: "1 tab nocte x 30 days", dose: "1 tablet", frequency: "At night (Nocte)", duration: "30 days" },
  { label: "1 sachet TDS x 3 days", dose: "1 sachet", frequency: "Three times daily (TDS)", duration: "3 days" },
];

const emptyEncounterForm: ClinicalEncounterFormValues = {
  patientId: "",
  visitType: "General OPD Consultation",
  chiefComplaint: "",
  history: "",
  examination: "",
  diagnosis: "",
  remarks: "",
  plan: "",
};

function encounterToForm(encounter: ClinicalEncounter): ClinicalEncounterFormValues {
  return {
    patientId: encounter.patientId,
    visitType: encounter.visitType ?? "General OPD Consultation",
    chiefComplaint: encounter.chiefComplaint ?? "",
    history: encounter.history ?? "",
    examination: encounter.examination ?? "",
    diagnosis: encounter.diagnosis ?? "",
    remarks: encounter.remarks ?? "",
    plan: encounter.plan ?? "",
  };
}

const emptyPrescriptionDraft: PrescriptionItemFormValues = {
  medicationId: "",
  medicationName: "",
  strength: "",
  dosageForm: "",
  dose: "",
  frequency: "Twice daily (BD)",
  duration: "5 days",
  quantity: "1",
  instructions: "Take with food",
};

const emptyAdmissionForm: AdmissionRequestFormValues = {
  patientId: "",
  encounterId: "",
  wardId: "",
  bedId: "",
  priority: "routine",
  diagnosis: "",
  reason: "",
  notes: "",
};

const emptyReferralForm: ReferralFormValues = {
  patientId: "",
  encounterId: "",
  priority: "routine",
  destinationFacility: "",
  departmentOrSpecialty: "",
  reason: "",
  clinicalSummary: "",
  notes: "",
};

export interface SelectedLabOrder {
  templateId: string;
  templateName: string;
  category?: string;
  specimen?: string;
  notes?: string;
}

const COMMON_LAB_PANELS = [
  { label: "Full Blood Count (FBC)", keywords: ["fbc", "full blood count", "haematology", "cbc"] },
  { label: "Malaria Parasite (MP)", keywords: ["malaria", "mp", "rdt", "parasite"] },
  { label: "Widal Agglutination", keywords: ["widal", "typhoid", "enteric"] },
  { label: "Urinalysis (Routine)", keywords: ["urinalysis", "urine", "routine urine"] },
  { label: "E/U/Cr (Renal Profile)", keywords: ["electrolyte", "urea", "creatinine", "e/u/cr", "eucr", "renal"] },
  { label: "Liver Function (LFT)", keywords: ["liver function", "lft", "hepatic"] },
  { label: "Blood Glucose (FBS/RBS)", keywords: ["glucose", "fbs", "rbs", "blood sugar"] },
  { label: "Lipid Profile", keywords: ["lipid", "cholesterol"] },
  { label: "Stool Microscopy", keywords: ["stool", "microscopy", "stool analysis"] },
  { label: "Hepatitis B & C", keywords: ["hepatitis", "hbsag", "hcv"] },
  { label: "HIV Screening (RVS)", keywords: ["hiv", "retroviral", "rvs"] },
];

function evaluateLiveFlag(referenceRange?: string | null, value?: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const strVal = String(value).trim();
  if (!strVal || !referenceRange) return null;
  const num = parseFloat(strVal);

  if (!isNaN(num) && referenceRange.includes("-")) {
    const parts = referenceRange.split("-").map((p) => parseFloat(p.replace(/[^0-9.]/g, "")));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (num < parts[0]) return { status: "low", label: "LOW" };
      if (num > parts[1]) return { status: "high", label: "HIGH" };
      return { status: "normal", label: "NORMAL" };
    }
  }

  const lowerRef = referenceRange.toLowerCase();
  const lowerVal = strVal.toLowerCase();
  if (lowerRef.includes("negative") || lowerRef.includes("non-reactive") || lowerRef.includes("normal")) {
    if (lowerVal.includes("positive") || lowerVal.includes("reactive") || lowerVal.includes("3+") || lowerVal.includes("4+")) {
      return { status: "abnormal", label: "ABNORMAL" };
    }
    if (lowerVal.includes("negative") || lowerVal.includes("non-reactive") || lowerVal.includes("normal")) {
      return { status: "normal", label: "NORMAL" };
    }
  }

  return null;
}

function patientName(patient?: Patient | null) {
  if (!patient) return "Unknown Patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ");
}

function medicineLabel(medication: Medication) {
  return [medication.name, medication.strength, medication.dosageForm].filter(Boolean).join(" • ");
}

function formatDate(iso?: string | null) {
  if (!iso) return "Not recorded";
  return new Date(iso).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ageFromDob(dateOfBirth?: string | null) {
  if (!dateOfBirth) return "Age unknown";
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return "Age unknown";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years -= 1;
  }
  return years >= 0 ? `${years} yrs` : "Age unknown";
}

function normalizeWorkspace(data: ClinicalWorkspace): ClinicalWorkspace {
  return {
    ...data,
    patients: data.patients ?? [],
    assignedAppointments: data.assignedAppointments ?? [],
    recentEncounters: data.recentEncounters ?? [],
    recentPrescriptions: data.recentPrescriptions ?? [],
    pendingLabRequests: data.pendingLabRequests ?? [],
    completedLabRequests: data.completedLabRequests ?? [],
    admissionRequests: data.admissionRequests ?? [],
    referrals: data.referrals ?? [],
    wards: data.wards ?? [],
    availableBeds: data.availableBeds ?? [],
    medications: data.medications ?? [],
  };
}

function dateInputValue(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function timeInputValue(date: Date) {
  return date.toTimeString().slice(0, 5);
}

function defaultReminderForm(): ReminderForm {
  const nextSlot = new Date(Date.now() + 30 * 60 * 1000);
  return {
    title: "",
    date: dateInputValue(nextSlot),
    time: timeInputValue(nextSlot),
    patientId: "",
    note: "",
  };
}

function reminderStorageKey(userId?: string) {
  return `mds:doctor-reminders:${userId || "local"}`;
}

function createReminderId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export default function DoctorDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { view } = useParams();
  const user = useAuthStore((state) => state.user);
  const { pendingCount: offlinePendingCount, isBrowserOnline } = useOfflineQueueCount();

  // Mode: "queue" (Waiting Room & Folders) vs "patient" (Active Consultation Desk)
  const [deskMode, setDeskMode] = useState<DeskMode>("queue");
  const [patientTab, setPatientTab] = useState<PatientClinicalTab>("note");
  const [queueTab, setQueueTab] = useState<QueueTab>("waiting");

  // Synchronize URL view parameter with desk mode, queue tabs, and clinical tabs
  useEffect(() => {
    if (!view) return;
    const lower = view.toLowerCase();
    if (lower === "waiting" || lower === "queue") {
      setDeskMode("queue");
      setQueueTab("waiting");
    } else if (lower === "patients" || lower === "all_patients" || lower === "folders") {
      setDeskMode("queue");
      setQueueTab("all_patients");
    } else if (lower === "results" || lower === "labs" || lower === "lab") {
      setDeskMode("queue");
      setQueueTab("labs");
    } else if (lower === "reminders" || lower === "schedule") {
      setDeskMode("queue");
      setQueueTab("schedule");
    } else if (lower === "consultation" || lower === "desk") {
      setDeskMode("patient");
    } else if (["note", "notes", "prescription", "lab-order", "admission", "referral", "history"].includes(lower)) {
      setDeskMode("patient");
      if (lower === "notes" || lower === "note") setPatientTab("note");
      else if (lower === "lab-order") setPatientTab("lab");
      else setPatientTab(lower as PatientClinicalTab);
    }
  }, [view]);

  const userRoles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const isAdminOrSuperAdmin = useMemo(
    () =>
      userRoles.some((r) => {
        const lower = r.toLowerCase();
        return lower === "super admin" || lower === "administrator" || lower === "admin";
      }),
    [userRoles]
  );
  const isDoctorOrSuperAdmin = useMemo(
    () =>
      userRoles.some((r) => {
        const lower = r.toLowerCase();
        return lower === "doctor" || lower === "super admin" || lower === "administrator" || lower === "admin";
      }),
    [userRoles]
  );

  useEffect(() => {
    if (user && !isDoctorOrSuperAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isDoctorOrSuperAdmin, navigate]);

  const [workspace, setWorkspace] = useState<ClinicalWorkspace | null>(null);
  const [templates, setTemplates] = useState<LaboratoryTemplate[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patientHistory, setPatientHistory] = useState<ClinicalEncounter[]>([]);
  const [patientLabHistory, setPatientLabHistory] = useState<LaboratoryRequest[]>([]);
  const [encounterForm, setEncounterForm] = useState<ClinicalEncounterFormValues>(emptyEncounterForm);
  const [activeEncounter, setActiveEncounter] = useState<ClinicalEncounter | null>(null);
  const [prescriptionDraft, setPrescriptionDraft] = useState<PrescriptionItemFormValues>(emptyPrescriptionDraft);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemFormValues[]>([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [selectedLabOrders, setSelectedLabOrders] = useState<SelectedLabOrder[]>([]);
  const [labTemplateId, setLabTemplateId] = useState("");
  const [labNotes, setLabNotes] = useState("");
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [labCategoryFilter, setLabCategoryFilter] = useState("All");
  const [viewingLabResult, setViewingLabResult] = useState<LaboratoryRequest | null>(null);
  const [admissionForm, setAdmissionForm] = useState<AdmissionRequestFormValues>(emptyAdmissionForm);
  const [referralForm, setReferralForm] = useState<ReferralFormValues>(emptyReferralForm);
  const [reminderForm, setReminderForm] = useState<ReminderForm>(() => defaultReminderForm());
  const [reminders, setReminders] = useState<DoctorReminder[]>([]);
  const [remindersReady, setRemindersReady] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [printingEncounter, setPrintingEncounter] = useState<ClinicalEncounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [docPatientPage, setDocPatientPage] = useState(1);
  const docPageSize = 24;
  const patientWorkspaceRef = useRef<HTMLDivElement | null>(null);

  const [mutedQueueIds, setMutedQueueIds] = useState<Set<string>>(new Set());
  const [allHospitalPatients, setAllHospitalPatients] = useState<Patient[]>([]);
  const [showSwitchPatientModal, setShowSwitchPatientModal] = useState(false);

  // Reminders Local Storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(reminderStorageKey(user?.id));
      if (raw) {
        setReminders(JSON.parse(raw) as DoctorReminder[]);
      }
    } catch {
      setReminders([]);
    } finally {
      setRemindersReady(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!remindersReady || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(reminderStorageKey(user?.id), JSON.stringify(reminders));
    } catch (saveError) {
      console.error("Failed to save doctor reminders", saveError);
    }
  }, [reminders, remindersReady, user?.id]);

  const loadWorkspace = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) {
      setLoading(true);
    }
    setError(null);
    try {
      const [workspaceRes, templatesRes, allPatientsRes] = await Promise.all([
        fetchDoctorWorkspace(),
        fetchLaboratoryTemplates(),
        fetchPatients({ status: "active", take: 500 }).catch(() => [] as Patient[]),
      ]);

      if (Array.isArray(allPatientsRes) && allPatientsRes.length > 0) {
        setAllHospitalPatients(allPatientsRes);
      }

      if (workspaceRes.workspace) {
        const normalized = normalizeWorkspace(workspaceRes.workspace);
        setWorkspace(normalized);
        // Keep active patient reference updated or restore from session storage
        if (selectedPatient) {
          const matched = normalized.patients.find((p) => p.id === selectedPatient.id) ||
            allPatientsRes?.find((p) => p.id === selectedPatient.id);
          if (matched) setSelectedPatient(matched);
        } else if (typeof window !== "undefined") {
          const rawActive = window.sessionStorage.getItem("hms_doctor_active_patient");
          if (rawActive) {
            try {
              const parsed = JSON.parse(rawActive);
              const matched = normalized.patients.find((p) => p.id === parsed.id) ||
                allPatientsRes?.find((p) => p.id === parsed.id);
              if (matched) {
                setSelectedPatient(matched);
              }
            } catch {}
          }
        }
      } else if (workspaceRes.error && showLoadingSpinner) {
        setError(workspaceRes.error);
      }

      if (templatesRes.result?.items) {
        setTemplates(templatesRes.result.items.filter((t: LaboratoryTemplate) => t.isActive));
      }
    } catch (err: any) {
      console.error(err);
      if (showLoadingSpinner) {
        setError("Unable to load doctor workspace.");
      }
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadWorkspace(true);
  }, []);

  // Real-time polling and live data mutation listener so doctor immediately receives newly assigned patients
  useEffect(() => {
    const handleMutation = () => {
      void loadWorkspace(false);
    };
    window.addEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);

    const pollInterval = window.setInterval(() => {
      void loadWorkspace(false);
    }, 4000);

    return () => {
      window.removeEventListener(HMS_DATA_MUTATED_EVENT, handleMutation);
      window.clearInterval(pollInterval);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isBrowserOnline || syncing) return;
    setSyncing(true);
    try {
      const result = await flushOfflineQueue();
      if (result.synced > 0) {
        setMessage(`Synced ${result.synced} offline item(s) to the cloud.`);
        await loadWorkspace(false);
      }
    } catch {
      setError("Failed to sync offline items. Will retry automatically.");
    } finally {
      setSyncing(false);
    }
  };

  // Switch to a specific patient and open their dedicated consultation desk
  const openPatientDesk = async (patient: Patient, appointment?: Appointment) => {
    stopContinuousPhoneRing();
    setSelectedPatient(patient);
    if (appointment) {
      setSelectedAppointment(appointment);
      setMutedQueueIds((prev) => new Set([...prev, appointment.id]));
    }
    setDeskMode("patient");
    setPatientTab("note");

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "hms_doctor_active_patient",
        JSON.stringify({
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`,
          mrn: patient.mrn,
        })
      );
      window.dispatchEvent(
        new CustomEvent("hms:doctor-active-patient-changed", {
          detail: { patient },
        })
      );
    }
    navigate("/doctor/consultation");

    setEncounterForm((current) => ({
      ...current,
      patientId: patient.id,
      chiefComplaint: appointment?.reason || current.chiefComplaint || "",
    }));
    setAdmissionForm((current) => ({ ...current, patientId: patient.id }));
    setReferralForm((current) => ({ ...current, patientId: patient.id }));

    // Fetch patient encounter history and lab tests
    try {
      const [encountersRes, labRes] = await Promise.all([
        fetchClinicalEncounters({ patientId: patient.id }),
        fetchLaboratoryRequests({ patientId: patient.id }),
      ]);

      if (encountersRes.result?.items) {
        setPatientHistory(encountersRes.result.items);
        const openEncounter = encountersRes.result.items.find((e) => e.status !== "completed");
        if (openEncounter) {
          setActiveEncounter(openEncounter);
          setEncounterForm(encounterToForm(openEncounter));
        } else {
          setActiveEncounter(null);
        }
      }

      if (labRes.result?.items) {
        setPatientLabHistory(labRes.result.items);
      }
    } catch (fetchErr) {
      console.error(fetchErr);
    }
  };

  // Close active patient folder and return to waiting queue
  const closePatientDesk = () => {
    setDeskMode("queue");
    setSelectedPatient(null);
    setSelectedAppointment(null);
    setActiveEncounter(null);
    setEncounterForm(emptyEncounterForm);
    setPrescriptionItems([]);
    setPrescriptionDraft(emptyPrescriptionDraft);
    setSelectedLabOrders([]);
    setLabTemplateId("");
    setLabNotes("");

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("hms_doctor_active_patient");
      window.dispatchEvent(
        new CustomEvent("hms:doctor-active-patient-changed", {
          detail: null,
        })
      );
    }
    navigate("/doctor/waiting");
  };

  const handleAppointmentStatus = async (appointment: Appointment, nextStatus: AppointmentStatus) => {
    setSaving(true);
    setError(null);
    const { appointment: updated, error: updateError } = await updateAppointmentStatus(
      appointment.id,
      nextStatus,
      appointment.notes ?? ""
    );
    setSaving(false);

    if (!updated) {
      setError(updateError ?? "Unable to update appointment.");
      return;
    }

    setSelectedAppointment(updated.status === "completed" ? null : updated);
    setWorkspace((current) =>
      current
        ? {
            ...current,
            assignedAppointments:
              updated.status === "completed" || updated.status === "cancelled" || updated.status === "no_show"
                ? current.assignedAppointments.filter((item) => item.id !== updated.id)
                : current.assignedAppointments.map((item) =>
                    item.id === updated.id ? updated : item
                  ),
          }
        : current
    );
  };

  const handleSaveEncounter = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) {
      setError("No patient is currently active on desk.");
      return;
    }

    const confirmed = await confirmImportantAction({
      title: "Submit Clinical Encounter?",
      text: `Are you sure you want to record this clinical encounter note for ${patientName(selectedPatient)}?`,
      confirmButtonText: "Yes, Submit Note",
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const { encounter, error: saveError, queued } = await createClinicalEncounter({
      ...encounterForm,
      patientId: selectedPatient.id,
    });

    setSaving(false);

    if (!encounter) {
      setError(saveError ?? "Unable to save consultation note.");
      return;
    }

    setActiveEncounter(encounter);
    setEncounterForm(encounterToForm(encounter));
    setAdmissionForm((current) => ({ ...current, encounterId: current.encounterId || encounter.id }));
    setReferralForm((current) => ({ ...current, encounterId: current.encounterId || encounter.id }));
    setMessage(queued ? "Consultation note saved offline (will sync to cloud)." : "Consultation note saved successfully.");
    setPatientHistory((current) => [encounter, ...current.filter((item) => item.id !== encounter.id)]);
    void showSuccessWithSound({
      title: "Encounter Note Saved",
      text: queued ? "Encounter saved offline and queued for cloud sync." : `Consultation note recorded for ${patientName(selectedPatient)}.`,
    });
  };

  const handleCloseEncounter = async (encounter: ClinicalEncounter) => {
    setSaving(true);
    setError(null);
    const { encounter: updated, error: closeError } = await completeClinicalEncounter(encounter.id);
    setSaving(false);

    if (!updated) {
      setError(closeError ?? "Unable to close consultation.");
      return;
    }

    setActiveEncounter(updated);
    setPatientHistory((current) => current.map((item) => (item.id === updated.id ? updated : item)));

    if (selectedAppointment && selectedAppointment.status !== "completed") {
      await handleAppointmentStatus(selectedAppointment, "completed");
    }

    setMessage("Consultation completed and closed.");
    closePatientDesk();
  };

  const handleMedicationSelection = (value: string) => {
    const medication = (workspace?.medications ?? []).find((item) => medicineLabel(item) === value);
    if (!medication) {
      setPrescriptionDraft((prev) => ({ ...prev, medicationName: value, medicationId: "" }));
      return;
    }

    setPrescriptionDraft((prev) => ({
      ...prev,
      medicationId: medication.id,
      medicationName: medication.name,
      strength: medication.strength ?? "",
      dosageForm: medication.dosageForm ?? "",
    }));
  };

  const addPrescriptionItem = () => {
    if (!prescriptionDraft.medicationName.trim()) {
      setError("Please select or enter a medication name.");
      return;
    }

    setPrescriptionItems((prev) => [...prev, { ...prescriptionDraft }]);
    setPrescriptionDraft(emptyPrescriptionDraft);
    setError(null);
  };

  const handleSendPrescription = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) {
      setError("No patient is currently active on desk.");
      return;
    }

    if (prescriptionItems.length === 0) {
      setError("Please add at least one medication to the prescription list.");
      return;
    }

    const confirmed = await confirmImportantAction({
      title: "Send Prescription to Pharmacy?",
      text: `Are you sure you want to dispatch this prescription with ${prescriptionItems.length} medication(s) for ${patientName(selectedPatient)}?`,
      confirmButtonText: "Yes, Send Prescription",
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const { prescription, error: rxError, queued } = await createPrescription({
      patientId: selectedPatient.id,
      encounterId: activeEncounter?.id || "",
      notes: prescriptionNotes,
      items: prescriptionItems,
    });

    setSaving(false);

    if (!prescription) {
      setError(rxError ?? "Unable to dispatch prescription to pharmacy.");
      return;
    }

    setPrescriptionItems([]);
    setPrescriptionNotes("");
    setMessage(queued ? "Prescription queued offline for pharmacy." : "Prescription sent directly to pharmacy dispensary.");
    void showSuccessWithSound({
      title: "Prescription Dispatched",
      text: `Prescription sent to pharmacy for ${patientName(selectedPatient)}.`,
    });
    void loadWorkspace();
  };

  const handleToggleLabOrder = (tpl: LaboratoryTemplate) => {
    setSelectedLabOrders((prev) => {
      const exists = prev.some((o) => o.templateId === tpl.id);
      if (exists) {
        return prev.filter((o) => o.templateId !== tpl.id);
      }
      return [
        ...prev,
        {
          templateId: tpl.id,
          templateName: tpl.name,
          category: tpl.category || undefined,
          specimen: tpl.specimen || undefined,
          notes: "",
        },
      ];
    });
  };

  const handleAddDropdownLabOrder = () => {
    if (!labTemplateId) return;
    const tpl = templates.find((t) => t.id === labTemplateId);
    if (!tpl) return;
    handleToggleLabOrder(tpl);
    setLabTemplateId("");
  };

  const handleRemoveLabOrder = (templateId: string) => {
    setSelectedLabOrders((prev) => prev.filter((o) => o.templateId !== templateId));
  };

  const handleClearLabOrders = () => {
    setSelectedLabOrders([]);
  };

  const availableLabCategories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach((t) => {
      if (t.category && t.category.trim()) cats.add(t.category.trim());
    });
    return ["All", ...Array.from(cats).sort()];
  }, [templates]);

  const filteredCatalogTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCat =
        labCategoryFilter === "All" ||
        (t.category && t.category.toLowerCase() === labCategoryFilter.toLowerCase());
      const q = labSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.code && t.code.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [templates, labCategoryFilter, labSearchQuery]);

  const handleOrderLab = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) {
      setError("No patient is currently active on desk.");
      return;
    }

    // Determine tests to order: selectedLabOrders, or single selected dropdown if basket is empty
    const testsToOrder: SelectedLabOrder[] =
      selectedLabOrders.length > 0
        ? selectedLabOrders
        : labTemplateId
        ? [
            {
              templateId: labTemplateId,
              templateName: templates.find((t) => t.id === labTemplateId)?.name || "Diagnostic Test",
              category: templates.find((t) => t.id === labTemplateId)?.category || undefined,
              specimen: templates.find((t) => t.id === labTemplateId)?.specimen || undefined,
              notes: labNotes,
            },
          ]
        : [];

    if (testsToOrder.length === 0) {
      setError("Please select at least one diagnostic test from the catalog.");
      return;
    }

    const confirmed = await confirmImportantAction({
      title: "Dispatch Lab Test Request(s)?",
      text: `Are you sure you want to send ${testsToOrder.length} laboratory test order(s) for ${patientName(selectedPatient)}?`,
      confirmButtonText: "Yes, Send Lab Orders",
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const results = await Promise.all(
        testsToOrder.map((test) =>
          createLaboratoryRequest({
            patientId: selectedPatient.id,
            templateId: test.templateId,
            clinicalNotes: test.notes?.trim() || labNotes.trim() || "",
          })
        )
      );

      const successful = results.filter((r) => r.request);
      const failed = results.filter((r) => !r.request);

      if (successful.length > 0) {
        setMessage(
          `Successfully requested ${successful.length} laboratory test${
            successful.length > 1 ? "s" : ""
          } for ${patientName(selectedPatient)}.`
        );
        setSelectedLabOrders([]);
        setLabTemplateId("");
        setLabNotes("");

        const labRes = await fetchLaboratoryRequests({ patientId: selectedPatient.id });
        if (labRes.result?.items) {
          setPatientLabHistory(labRes.result.items);
        }
        void showSuccessWithSound({
          title: "Lab Request(s) Sent",
          text: `${successful.length} diagnostic test order(s) routed to laboratory desk.`,
        });
        void loadWorkspace(false);
      }

      if (failed.length > 0) {
        setError(`Encountered error ordering ${failed.length} test(s). Please verify connection.`);
      }
    } catch (err: any) {
      console.error("Lab order error:", err);
      setError("Unable to submit laboratory requests. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAdmission = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) {
      setError("No patient is currently active on desk.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const { admissionRequest, error: admError, queued } = await createAdmissionRequest({
      ...admissionForm,
      patientId: selectedPatient.id,
      encounterId: activeEncounter?.id || "",
    });

    setSaving(false);

    if (!admissionRequest) {
      setError(admError ?? "Unable to request ward admission.");
      return;
    }

    setAdmissionForm(emptyAdmissionForm);
    setMessage(queued ? "Ward admission request saved offline." : "Ward admission request submitted to nursing station.");
    void loadWorkspace();
  };

  const handleCreateReferral = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) {
      setError("No patient is currently active on desk.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    const { referral, error: refError, queued } = await createReferral({
      ...referralForm,
      patientId: selectedPatient.id,
      encounterId: activeEncounter?.id || "",
    });

    setSaving(false);

    if (!referral) {
      setError(refError ?? "Unable to generate referral.");
      return;
    }

    setReferralForm(emptyReferralForm);
    setMessage(queued ? "Referral letter saved offline." : "Referral letter generated successfully.");
    void loadWorkspace();
  };

  const handleAddReminder = (e: FormEvent) => {
    e.preventDefault();
    if (!reminderForm.title.trim() || !reminderForm.date || !reminderForm.time) {
      setError("Please fill in reminder title, date, and time.");
      return;
    }

    const matchedPatient = (workspace?.patients ?? []).find((p) => p.id === reminderForm.patientId);
    const newReminder: DoctorReminder = {
      id: createReminderId(),
      title: reminderForm.title.trim(),
      dateTime: new Date(`${reminderForm.date}T${reminderForm.time}`).toISOString(),
      patientId: reminderForm.patientId || undefined,
      patientName: matchedPatient ? patientName(matchedPatient) : undefined,
      note: reminderForm.note.trim() || undefined,
    };

    setReminders((prev) => [...prev, newReminder]);
    setReminderForm(defaultReminderForm());
    setMessage("Clinical reminder added to calendar.");
  };

  const removeReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Calendar calculations
  const calendarTitle = calendarMonth.toLocaleString("en-NG", { month: "long", year: "numeric" });
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const slots: (Date | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      slots.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      slots.push(new Date(year, month, d));
    }
    return slots;
  }, [calendarMonth]);

  const moveCalendar = (offset: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  // Data helpers
  const patients = useMemo(() => {
    const wsPatients = workspace?.patients ?? [];
    const map = new Map<string, Patient>();
    for (const p of wsPatients) map.set(p.id, p);
    for (const p of allHospitalPatients) map.set(p.id, p);
    return Array.from(map.values());
  }, [workspace?.patients, allHospitalPatients]);
  const assignedAppointments = workspace?.assignedAppointments ?? [];
  const readyLabRequests = workspace?.completedLabRequests ?? [];
  const availableBeds = (workspace?.availableBeds ?? []).filter((b: Bed) => b.status === "available");
  const availableBedsForWard = useMemo(() => {
    if (!admissionForm.wardId) return availableBeds;
    return availableBeds.filter((b: Bed) => b.wardId === admissionForm.wardId);
  }, [admissionForm.wardId, availableBeds]);

  // Patients in queue
  const waitingAppointments = assignedAppointments.filter(
    (a) => a.status === "scheduled" || a.status === "checked_in" || a.status === "in_consultation"
  );

  // Unaccepted patients waiting for doctor consultation
  const unacceptedAppointments = useMemo(() => {
    return waitingAppointments.filter(
      (a) =>
        (a.status === "scheduled" || a.status === "checked_in") &&
        !mutedQueueIds.has(a.id)
    );
  }, [waitingAppointments, mutedQueueIds]);

  const shouldRing =
    soundEnabled && deskMode === "queue" && unacceptedAppointments.length > 0;

  useEffect(() => {
    if (shouldRing) {
      startContinuousPhoneRing(0.58);
    } else {
      stopContinuousPhoneRing();
    }
    return () => {
      stopContinuousPhoneRing();
    };
  }, [shouldRing]);

  const handleAcceptNextPatient = (appointment?: Appointment) => {
    stopContinuousPhoneRing();
    const targetAppt =
      appointment || unacceptedAppointments[0] || waitingAppointments[0];
    if (!targetAppt) return;

    if (targetAppt.patient) {
      if (targetAppt.status !== "in_consultation") {
        void handleAppointmentStatus(targetAppt, "in_consultation");
      }
      void openPatientDesk(targetAppt.patient, targetAppt);
    }
  };

  const handleMuteCurrentQueue = () => {
    setMutedQueueIds(new Set(waitingAppointments.map((a) => a.id)));
    stopContinuousPhoneRing();
  };

  // Filtered patients for search
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase().trim();
    return patients.filter((p) => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      const card = (p.physicalFileNumber || p.mrn || "").toLowerCase();
      const phone = (p.phone || "").toLowerCase();
      return name.includes(q) || card.includes(q) || phone.includes(q);
    });
  }, [patients, searchQuery]);

  const docTotalPages = Math.max(1, Math.ceil(filteredPatients.length / docPageSize));
  const docPagedPatients = useMemo(() => {
    const start = (docPatientPage - 1) * docPageSize;
    return filteredPatients.slice(start, start + docPageSize);
  }, [filteredPatients, docPatientPage]);

  const upcomingReminders = useMemo(() => {
    const now = new Date();
    return reminders
      .filter((r) => new Date(r.dateTime) >= now)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [reminders]);

  return (
    <AdminLayout>
      <main className="doctor-desk-container" role="main">
        {/* Persistent Quick Return Bar for Admins / Super Admins */}
        {isAdminOrSuperAdmin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(135deg, #0c4a60 0%, #083344 100%)",
              color: "#ffffff",
              padding: "0.65rem 1.25rem",
              borderRadius: "12px",
              marginBottom: "1rem",
              boxShadow: "0 2px 10px rgba(12, 74, 96, 0.15)",
              border: "1px solid rgba(212, 175, 55, 0.4)",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.88rem", fontWeight: 500 }}>
              <FiHome style={{ color: "#d4af37", fontSize: "1.15rem" }} />
              <span>
                <strong>Executive Access:</strong> You are currently viewing the Doctor Clinical Desk.
              </span>
            </div>
            <Link
              to="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.4rem 1rem",
                borderRadius: "8px",
                background: "#d4af37",
                color: "#0c4a60",
                fontWeight: 700,
                fontSize: "0.84rem",
                textDecoration: "none",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                transition: "all 0.15s ease",
              }}
            >
              ← Back to Main Dashboard
            </Link>
          </div>
        )}

        {/* TOP STATUS BAR & GLOBAL ALERTS */}
        {error && (
          <div className="alert alert-danger" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            <button type="button" className="doctor-action-btn secondary" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {message && (
          <div className="alert alert-success" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{message}</span>
            <button type="button" className="doctor-action-btn secondary" onClick={() => setMessage(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* INCOMING PATIENT ASSIGNMENT TELEPHONE RING ALERT BANNER */}
        {shouldRing && unacceptedAppointments.length > 0 && (
          <aside className="doctor-call-alert-banner" role="alert" aria-live="assertive">
            <div className="call-alert-pulse-wrap">
              <div className="call-alert-ripple" />
              <div className="call-alert-icon">
                <FaPhoneAlt className="phone-vibrate" />
              </div>
            </div>
            <div className="call-alert-details">
              <div className="call-alert-tag">
                <span className="call-live-dot" /> NURSE ASSIGNED PATIENT • CALL RINGING
              </div>
              <strong className="call-alert-patient">
                {patientName(unacceptedAppointments[0].patient)}
              </strong>
              <div className="call-alert-meta">
                <span>Folder / Card: {unacceptedAppointments[0].patient?.physicalFileNumber || unacceptedAppointments[0].patient?.mrn || "Pending"}</span>
                <span>•</span>
                <span>Reason: {unacceptedAppointments[0].reason || "General Consultation"}</span>
                {unacceptedAppointments.length > 1 && (
                  <span className="call-alert-badge">+{unacceptedAppointments.length - 1} more in queue</span>
                )}
              </div>
            </div>
            <div className="call-alert-actions">
              <button
                type="button"
                className="call-accept-btn"
                onClick={() => handleAcceptNextPatient(unacceptedAppointments[0])}
              >
                <FaPhoneAlt /> Accept & Start Consultation
              </button>
              <button
                type="button"
                className="call-mute-btn"
                onClick={handleMuteCurrentQueue}
                title="Silence ring for currently waiting patients"
              >
                <FaPhoneSlash /> Mute Ring
              </button>
            </div>
          </aside>
        )}

        {/* EXECUTIVE MODE BANNER: FOR SUPER ADMIN / ADMIN ACCESS */}
        {isAdminOrSuperAdmin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              padding: "0.6rem 1.2rem",
              background: "linear-gradient(90deg, rgba(8, 126, 189, 0.12), rgba(212, 175, 55, 0.12))",
              border: "1px solid rgba(8, 126, 189, 0.25)",
              borderRadius: "12px",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-color)" }}>
              <span style={{ fontSize: "1.1rem" }}>🏛️</span>
              <span>
                <strong>Administrator Access:</strong> You are viewing Doctor Clinical Workspace in oversight mode.
              </span>
            </div>
            <Link
              to="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.85rem",
                borderRadius: "8px",
                background: "#087ebd",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.84rem",
                textDecoration: "none",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                transition: "all 0.15s ease",
              }}
            >
              ← Back to Main Dashboard
            </Link>
          </div>
        )}

        {/* 1. HERO COMMAND HEADER */}
        <section className="doctor-hero-card">
          <div className="doctor-hero-left">
            <div className="doctor-hero-avatar-icon">
              <FaUserMd />
            </div>
            <div className="doctor-hero-text">
              <div className="doctor-hero-badge">
                <span>MDS Hospital • Consulting Room</span>
              </div>
              <h1>Doctor's Clinical Desk</h1>
              <p>
                Dr. {user?.firstName} {user?.lastName} • {waitingAppointments.length} Patient(s) Waiting in Queue
              </p>
            </div>
          </div>

          <div className="doctor-hero-controls">
            <button
              type="button"
              className={`doctor-action-btn ${soundEnabled ? "primary" : "secondary"}`}
              onClick={() => {
                if (soundEnabled) {
                  stopContinuousPhoneRing();
                }
                setSoundEnabled((prev) => !prev);
              }}
              title="Toggle sound alert for new waiting patients"
            >
              {soundEnabled ? <FiVolume2 /> : <FiVolumeX />} {soundEnabled ? "Audio Alerts On" : "Audio Muted"}
            </button>

            <button
              type="button"
              className="doctor-action-btn secondary"
              onClick={handleManualSync}
              disabled={syncing || !isBrowserOnline}
            >
              {syncing ? (
                <FiRefreshCw className="spin" />
              ) : isBrowserOnline ? (
                <FiWifi style={{ color: "#10b981" }} />
              ) : (
                <FiWifiOff style={{ color: "#f59e0b" }} />
              )}
              {isBrowserOnline
                ? offlinePendingCount > 0
                  ? `Sync Queue (${offlinePendingCount})`
                  : "Online (Saved to Cloud)"
                : `Offline (${offlinePendingCount} Queued)`}
            </button>
          </div>
        </section>

        {/* 2. MODE SWITCHER BAR: WAITING ROOM vs ACTIVE PATIENT DESK */}
        <nav className="doctor-mode-switch-bar" aria-label="Doctor Desk Navigation">
          <div className="doctor-mode-switch-group">
            {/* Mode 1: Waiting Room & Patient Queue */}
            <button
              type="button"
              className={`doctor-mode-pill ${deskMode === "queue" ? "active" : ""}`}
              onClick={() => {
                setDeskMode("queue");
                navigate("/doctor/waiting");
              }}
            >
              <FiUsers />
              <span>Waiting Room & Queue</span>
              <span className="pill-badge" style={{ marginLeft: "0.25rem" }}>
                {waitingAppointments.length}
              </span>
            </button>

            {/* Mode 2: Active Patient Desk (Highlighted when a patient is in consultation) */}
            {selectedPatient ? (
              <button
                type="button"
                className={`doctor-mode-pill patient-active ${deskMode === "patient" ? "active" : ""}`}
                onClick={() => {
                  setDeskMode("patient");
                  navigate("/doctor/consultation");
                }}
              >
                <span className="pulse-dot" />
                <FaUserInjured />
                <span>Now Attending: {patientName(selectedPatient)}</span>
                <span className="pill-badge" style={{ background: "rgba(255,255,255,0.3)" }}>
                  {selectedPatient.physicalFileNumber || selectedPatient.mrn || "Folder Active"}
                </span>
              </button>
            ) : (
              <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic", marginLeft: "0.5rem" }}>
                No patient active on desk. Choose a patient below to start consultation.
              </span>
            )}
          </div>

          {/* Quick patient search to open folder immediately */}
          <div style={{ minWidth: "260px", maxWidth: "340px", flex: "1 1 auto" }}>
            <PatientSearchSelect
              label=""
              patients={patients}
              selectedPatientId={selectedPatient?.id}
              onSelectPatient={(p) => {
                if (p) {
                  void openPatientDesk(p);
                }
              }}
              placeholder="🔍 Search all patients to open folder..."
            />
          </div>
        </nav>

        {/* =========================================================================
            VIEW 1: WAITING ROOM & QUEUE MODE (When no patient or viewing queue)
            ========================================================================= */}
        {deskMode === "queue" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Active Patient Reminder Banner if doctor stepped away to queue */}
            {selectedPatient && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "12px",
                  background: "rgba(5, 150, 105, 0.12)",
                  border: "1.5px solid #059669",
                  color: "#059669",
                  fontWeight: 700,
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <span>
                  🟢 Active Consultation open for <strong>{patientName(selectedPatient)}</strong> (Folder:{" "}
                  {selectedPatient.physicalFileNumber || selectedPatient.mrn || "Card"})
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="doctor-action-btn primary"
                    onClick={() => setDeskMode("patient")}
                  >
                    Return to Patient Desk <FiArrowRight />
                  </button>
                  <button
                    type="button"
                    className="doctor-action-btn secondary"
                    onClick={closePatientDesk}
                  >
                    <FiX /> Close Desk
                  </button>
                </div>
              </div>
            )}

            {/* 4 TOP CLINICAL METRICS */}
            <section className="doctor-stats-grid">
              <div className="doctor-stat-card">
                <div className="doctor-stat-icon queue">
                  <FiClock />
                </div>
                <div className="doctor-stat-content">
                  <strong>{waitingAppointments.length}</strong>
                  <span>Patients in Queue</span>
                </div>
              </div>

              <div className="doctor-stat-card">
                <div className="doctor-stat-icon notes">
                  <FiClipboard />
                </div>
                <div className="doctor-stat-content">
                  <strong>{workspace?.recentEncounters.length ?? 0}</strong>
                  <span>Consultations Today</span>
                </div>
              </div>

              <div className="doctor-stat-card">
                <div className="doctor-stat-icon ready-lab">
                  <FaFlask />
                </div>
                <div className="doctor-stat-content">
                  <strong>{readyLabRequests.length}</strong>
                  <span>Lab Results Ready</span>
                </div>
              </div>

              <div className="doctor-stat-card">
                <div className="doctor-stat-icon ward">
                  <FaBed />
                </div>
                <div className="doctor-stat-content">
                  <strong>{availableBeds.length}</strong>
                  <span>Available Ward Beds</span>
                </div>
              </div>
            </section>

            {/* QUEUE NAVIGATION SEGMENTED TABS */}
            <div className="doctor-segmented-nav-wrap">
              <div className="doctor-segmented-nav" role="tablist" aria-label="Queue navigation">
                <button
                  type="button"
                  className={`doctor-nav-tab ${queueTab === "waiting" ? "active" : ""}`}
                  onClick={() => {
                    setQueueTab("waiting");
                    navigate("/doctor/waiting");
                  }}
                  role="tab"
                  aria-selected={queueTab === "waiting"}
                >
                  <FiUsers className="tab-icon" />
                  <span>Waiting Queue</span>
                  <span className="tab-badge waiting">{waitingAppointments.length}</span>
                </button>
                <button
                  type="button"
                  className={`doctor-nav-tab ${queueTab === "all_patients" ? "active" : ""}`}
                  onClick={() => {
                    setQueueTab("all_patients");
                    navigate("/doctor/patients");
                  }}
                  role="tab"
                  aria-selected={queueTab === "all_patients"}
                >
                  <FiFolder className="tab-icon" />
                  <span>Medical Folders</span>
                  <span className="tab-badge neutral">{patients.length}</span>
                </button>
                <button
                  type="button"
                  className={`doctor-nav-tab ${queueTab === "labs" ? "active" : ""}`}
                  onClick={() => {
                    setQueueTab("labs");
                    navigate("/doctor/results");
                  }}
                  role="tab"
                  aria-selected={queueTab === "labs"}
                >
                  <FaFlask className="tab-icon" />
                  <span>Lab Results</span>
                  <span className="tab-badge labs">{readyLabRequests.length}</span>
                </button>
                <button
                  type="button"
                  className={`doctor-nav-tab ${queueTab === "schedule" ? "active" : ""}`}
                  onClick={() => {
                    setQueueTab("schedule");
                    navigate("/doctor/reminders");
                  }}
                  role="tab"
                  aria-selected={queueTab === "schedule"}
                >
                  <FiCalendar className="tab-icon" />
                  <span>Calendar & Reminders</span>
                  {upcomingReminders.length > 0 && (
                    <span className="tab-badge urgent">{upcomingReminders.length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: PATIENTS WAITING IN QUEUE */}
            {queueTab === "waiting" && (
              <section className="doctor-panel-card">
                <div className="doctor-panel-header">
                  <div>
                    <h2>Patients Waiting in Queue</h2>
                    <p>Click "Start Consultation" on any patient to open their dedicated clinical desk.</p>
                  </div>
                  {waitingAppointments.length > 0 && (
                    <button
                      type="button"
                      className="doctor-action-btn primary"
                      onClick={() => {
                        const first = waitingAppointments[0];
                        if (first.patient) {
                          handleAcceptNextPatient(first);
                        }
                      }}
                    >
                      ▶ Call In Next Patient: {patientName(waitingAppointments[0].patient)}
                    </button>
                  )}
                </div>

                {waitingAppointments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)" }}>
                    <FiCheckCircle style={{ fontSize: "2.5rem", color: "#10b981", marginBottom: "0.5rem" }} />
                    <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>Waiting room is clear!</p>
                    <p>No patients are currently queued for consultation. You can search any folder above.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
                    {waitingAppointments.map((appointment) => {
                      const p = appointment.patient;
                      return (
                        <div
                          key={appointment.id}
                          className="doctor-patient-queue-card"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            padding: "1.25rem",
                            borderRadius: "12px",
                            border: "1.5px solid var(--border-color, #e2e8f0)",
                            background: "var(--card-bg, #ffffff)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                            gap: "0.85rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                            <div className="doctor-patient-avatar" style={{ width: "46px", height: "46px", fontSize: "1.1rem" }}>
                              {p?.photoDataUrl || p?.photoUrl ? (
                                <img src={p.photoDataUrl ?? p.photoUrl ?? ""} alt={patientName(p)} />
                              ) : (
                                patientName(p).slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                              <strong style={{ fontSize: "1.05rem", color: "var(--text-color, #0f172a)", display: "block" }}>
                                {patientName(p)}
                              </strong>
                              <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                                Folder: <strong>{p?.physicalFileNumber || p?.mrn || "No Folder"}</strong> • {ageFromDob(p?.dateOfBirth)} • {p?.gender || "Gender N/A"}
                              </span>
                              {appointment.reason && (
                                <div style={{ fontSize: "0.82rem", color: "#0284c7", marginTop: "0.2rem", fontWeight: 600 }}>
                                  Reason: {appointment.reason}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Triage / Nurse Checkup Preview */}
                          <div
                            style={{
                              display: "flex",
                              gap: "0.75rem",
                              padding: "0.5rem 0.75rem",
                              borderRadius: "8px",
                              background: "var(--bg-hover, #f8fafc)",
                              fontSize: "0.78rem",
                              color: "var(--muted)",
                              flexWrap: "wrap",
                            }}
                          >
                            <span>🕒 Arrived: {formatDate(appointment.scheduledFor)}</span>
                            {p?.bloodGroup && <span>🩸 Blood: <strong>{p.bloodGroup}</strong></span>}
                            {p?.genotype && <span>🧬 Genotype: <strong>{p.genotype}</strong></span>}
                          </div>

                          <button
                            type="button"
                            className="doctor-action-btn primary"
                            style={{ width: "100%", justifyContent: "center" }}
                            onClick={() => {
                              if (p) {
                                handleAcceptNextPatient(appointment);
                              }
                            }}
                          >
                            ▶ Start Consultation / Open Desk
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* TAB 2: ALL PATIENT FOLDERS */}
            {queueTab === "all_patients" && (
              <section className="doctor-panel-card">
                <div className="doctor-panel-header">
                  <div>
                    <h2>Hospital Patient Folders</h2>
                    <p>Browse and search all registered patient case files.</p>
                  </div>
                  <div style={{ minWidth: "260px" }}>
                    <input
                      className="form-control"
                      placeholder="Filter by name, folder number, or phone..."
                      aria-label="Search patient folders"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setDocPatientPage(1);
                      }}
                    />
                  </div>
                </div>

                {filteredPatients.length === 0 ? (
                  <div className="doctor-empty-state">
                    <strong>No patient folders found</strong>
                    <span>Try a different name, folder number, or phone number.</span>
                  </div>
                ) : (
                  <div className="doctor-directory-grid">
                    {docPagedPatients.map((p) => (
                      <div
                        key={p.id}
                        className="doctor-directory-card"
                      >
                        <div className="doctor-directory-card-identity">
                          <div className="doctor-patient-avatar">
                            {p.photoDataUrl || p.photoUrl ? (
                              <img src={p.photoDataUrl ?? p.photoUrl ?? ""} alt={patientName(p)} />
                            ) : (
                              patientName(p).slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="doctor-directory-card-info">
                            <strong className="doctor-directory-card-name">{patientName(p)}</strong>
                            <small className="doctor-directory-card-meta">
                              Card: {p.physicalFileNumber || p.mrn || "No Folder"} • {ageFromDob(p.dateOfBirth)}
                            </small>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="doctor-action-btn secondary"
                          onClick={() => void openPatientDesk(p)}
                        >
                          Open Desk
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {docTotalPages > 1 && (
                  <nav className="patient-pagination-bar" aria-label="Doctor folders pagination">
                    <div className="pagination-info">
                      Showing <strong>{(docPatientPage - 1) * docPageSize + 1}</strong> to{" "}
                      <strong>{Math.min(filteredPatients.length, docPatientPage * docPageSize)}</strong> of{" "}
                      <strong>{filteredPatients.length}</strong> folders
                    </div>
                    <div className="pagination-controls">
                      <button
                        type="button"
                        className="pagination-nav-btn"
                        onClick={() => setDocPatientPage((p) => Math.max(1, p - 1))}
                        disabled={docPatientPage === 1}
                        aria-label="Previous page"
                      >
                        ‹ Prev
                      </button>
                      {Array.from({ length: docTotalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`pagination-nav-btn ${docPatientPage === p ? "active" : ""}`}
                          onClick={() => setDocPatientPage(p)}
                          aria-label={`Page ${p}`}
                          aria-current={docPatientPage === p ? "page" : undefined}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="pagination-nav-btn"
                        onClick={() => setDocPatientPage((p) => Math.min(docTotalPages, p + 1))}
                        disabled={docPatientPage === docTotalPages}
                        aria-label="Next page"
                      >
                        Next ›
                      </button>
                    </div>
                  </nav>
                )}
              </section>
            )}

            {/* TAB 3: COMPLETED LAB RESULTS */}
            {queueTab === "labs" && (
              <section className="doctor-panel-card">
                <div className="doctor-panel-header">
                  <div>
                    <h2>Completed Laboratory Results</h2>
                    <p>Review test results dispatched from the laboratory.</p>
                  </div>
                </div>

                {readyLabRequests.length === 0 ? (
                  <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
                    No completed laboratory results pending doctor review.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {readyLabRequests.map((req: LaboratoryRequest) => (
                      <div
                        key={req.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "1rem",
                          borderRadius: "10px",
                          border: "1px solid var(--border-color)",
                          background: "var(--card-bg)",
                          flexWrap: "wrap",
                          gap: "0.75rem",
                        }}
                      >
                        <div>
                          <strong>{req.template?.name ?? "Laboratory Investigation"}</strong>
                          <br />
                          <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                            Patient: <strong>{patientName(req.patient)}</strong> (Folder:{" "}
                            {req.patient?.physicalFileNumber || req.patient?.mrn || "N/A"}) • Completed:{" "}
                            {formatDate(req.completedAt)}
                          </span>
                          {req.interpretation && (
                            <div style={{ marginTop: "0.4rem", fontSize: "0.82rem", color: "#0284c7" }}>
                              <strong>Interpretation:</strong> {req.interpretation}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="doctor-action-btn primary"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                            onClick={() => setViewingLabResult(req)}
                          >
                            <FiEye /> View Full Result
                          </button>

                          <button
                            type="button"
                            className="doctor-action-btn secondary"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                            onClick={() => setViewingLabResult(req)}
                          >
                            <FiPrinter /> Print Report
                          </button>

                          {req.patient && (
                            <button
                              type="button"
                              className="doctor-action-btn secondary"
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                              onClick={() => void openPatientDesk(req.patient!)}
                            >
                              <FiUser /> Open Desk
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAB 4: CALENDAR & REMINDERS */}
            {queueTab === "schedule" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
                {/* Left: Interactive Calendar */}
                <section className="doctor-panel-card">
                  <div className="doctor-panel-header">
                    <div>
                      <h2>Clinical Calendar</h2>
                      <p>{calendarTitle}</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button type="button" className="doctor-action-btn secondary" onClick={() => moveCalendar(-1)}>
                        Prev
                      </button>
                      <button type="button" className="doctor-action-btn secondary" onClick={() => setCalendarMonth(new Date())}>
                        Today
                      </button>
                      <button type="button" className="doctor-action-btn secondary" onClick={() => moveCalendar(1)}>
                        Next
                      </button>
                    </div>
                  </div>

                  <div className="doctor-calendar-weekdays">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <span key={day} style={{ fontWeight: 700, color: "var(--muted)", textAlign: "center" }}>
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="doctor-calendar-month">
                    {calendarDays.map((day, index) => {
                      const dayAppointments = day
                        ? assignedAppointments.filter((a) => sameDay(new Date(a.scheduledFor), day))
                        : [];
                      const dayReminders = day
                        ? reminders.filter((r) => sameDay(new Date(r.dateTime), day))
                        : [];

                      return (
                        <button
                          key={day?.toISOString() ?? `blank-${index}`}
                          className={`doctor-calendar-day ${day && sameDay(day, new Date()) ? "today" : ""}`}
                          type="button"
                          disabled={!day}
                          onClick={() => day && setReminderForm((prev) => ({ ...prev, date: dateInputValue(day) }))}
                        >
                          {day && (
                            <>
                              <strong>{day.getDate()}</strong>
                              <span>
                                {dayAppointments.length > 0 && <i className="appointment-dot" />}
                                {dayReminders.length > 0 && <i className="reminder-dot" />}
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Right: Add Reminder Form & Upcoming Reminders */}
                <section className="doctor-panel-card">
                  <div className="doctor-panel-header">
                    <h2>+ Add Clinical Reminder</h2>
                    <span className="pill-badge">{upcomingReminders.length} upcoming</span>
                  </div>

                  <form onSubmit={handleAddReminder} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Reminder Title
                      </label>
                      <input
                        className="form-control"
                        value={reminderForm.title}
                        onChange={(e) => setReminderForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Review blood culture, call patient, ward round..."
                        required
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                          Date
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={reminderForm.date}
                          onChange={(e) => setReminderForm((prev) => ({ ...prev, date: e.target.value }))}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                          Time
                        </label>
                        <input
                          type="time"
                          className="form-control"
                          value={reminderForm.time}
                          onChange={(e) => setReminderForm((prev) => ({ ...prev, time: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Link to Patient (Optional)
                      </label>
                      <select
                        className="form-control"
                        value={reminderForm.patientId}
                        onChange={(e) => setReminderForm((prev) => ({ ...prev, patientId: e.target.value }))}
                      >
                        <option value="">-- General Doctor Reminder --</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {patientName(p)} ({p.physicalFileNumber || p.mrn || "No Folder"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Notes
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={reminderForm.note}
                        onChange={(e) => setReminderForm((prev) => ({ ...prev, note: e.target.value }))}
                        placeholder="Additional details..."
                      />
                    </div>

                    <button type="submit" className="doctor-action-btn primary">
                      <FiBell /> Save Reminder
                    </button>
                  </form>

                  {/* Reminder List */}
                  <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)" }}>
                      Upcoming Reminders
                    </label>
                    {upcomingReminders.length === 0 ? (
                      <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No upcoming reminders scheduled.</p>
                    ) : (
                      upcomingReminders.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.6rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-hover, #f8fafc)",
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: "0.9rem" }}>{r.title}</strong>
                            <br />
                            <small style={{ color: "var(--muted)" }}>
                              {formatDate(r.dateTime)} {r.patientName ? `• ${r.patientName}` : ""}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="doctor-action-btn secondary"
                            style={{ padding: "0.3rem 0.5rem" }}
                            onClick={() => removeReminder(r.id)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VIEW 2: DEDICATED ACTIVE PATIENT CONSULTATION DESK (When patient is selected)
            ========================================================================= */}
        {deskMode === "patient" && !selectedPatient && (
          <div
            className="card empty-panel"
            style={{
              padding: "2.5rem 1.75rem",
              margin: "1.5rem 0",
              background: "var(--surface)",
              border: "1.5px dashed var(--border)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.25rem",
            }}
          >
            <div style={{ fontSize: "2.8rem" }}>🩺</div>
            <div style={{ textAlign: "center", maxWidth: "560px" }}>
              <h3 style={{ margin: "0 0 0.35rem", color: "var(--text-strong)", fontSize: "1.35rem" }}>
                Select a Patient to Begin Consultation
              </h3>
              <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
                Search any hospital patient folder below or quickly pick a patient waiting in the queue.
              </p>
            </div>

            {/* Direct Instant Search Box */}
            <div style={{ width: "100%", maxWidth: "460px" }}>
              <PatientSearchSelect
                label=""
                patients={patients}
                selectedPatientId={null}
                onSelectPatient={(p) => {
                  if (p) void openPatientDesk(p);
                }}
                placeholder="🔍 Search patient by Name, P-File No., MRN, or Phone..."
              />
            </div>

            {/* Quick Waiting Patients Carousel / Pills */}
            {waitingAppointments.length > 0 && (
              <div style={{ width: "100%", maxWidth: "600px", textAlign: "center" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.5rem" }}>
                  Currently Waiting in Queue ({waitingAppointments.length})
                </span>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                  {waitingAppointments.slice(0, 6).map((appt) => (
                    <button
                      key={appt.id}
                      type="button"
                      className="doctor-action-btn secondary"
                      onClick={() => handleAcceptNextPatient(appt)}
                      style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}
                    >
                      ▶ {patientName(appt.patient)} ({appt.patient?.physicalFileNumber || "Folder"})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setDeskMode("queue");
                  setQueueTab("waiting");
                  navigate("/doctor/waiting");
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FiUsers /> View Waiting Room Queue
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setDeskMode("queue");
                  setQueueTab("all_patients");
                  navigate("/doctor/patients");
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FiFolder /> Browse Medical Folders ({patients.length})
              </button>
            </div>
          </div>
        )}

        {deskMode === "patient" && selectedPatient && (
          <div className="doctor-active-patient-desk" ref={patientWorkspaceRef}>
            {/* Top Status Badge & Switcher */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <div className="doctor-desk-status-badge">
                <span className="pulse-dot" />
                <span>CONSULTATION IN PROGRESS</span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {/* Switch Patient Quick Search */}
                <div style={{ minWidth: "220px", maxWidth: "280px" }}>
                  <PatientSearchSelect
                    label=""
                    patients={patients}
                    selectedPatientId={selectedPatient.id}
                    onSelectPatient={(p) => {
                      if (p && p.id !== selectedPatient.id) {
                        void openPatientDesk(p);
                      }
                    }}
                    placeholder="Switch patient..."
                  />
                </div>
                <button
                  type="button"
                  className="doctor-action-btn secondary"
                  onClick={() => setPrintingEncounter(activeEncounter || ({ patient: selectedPatient, startedAt: new Date().toISOString(), ...encounterForm } as unknown as ClinicalEncounter))}
                >
                  <FiPrinter /> Print Summary
                </button>
                <button
                  type="button"
                  className="doctor-action-btn secondary"
                  onClick={closePatientDesk}
                >
                  <FiX /> Finish / Close Desk
                </button>
              </div>
            </div>

            {/* PATIENT PROFILE BANNER */}
            <section className="doctor-patient-banner">
              <div className="doctor-patient-banner-left">
                <div className="doctor-patient-avatar" style={{ width: "56px", height: "56px", fontSize: "1.35rem" }}>
                  {selectedPatient.photoDataUrl || selectedPatient.photoUrl ? (
                    <img src={selectedPatient.photoDataUrl ?? selectedPatient.photoUrl ?? ""} alt={patientName(selectedPatient)} />
                  ) : (
                    patientName(selectedPatient).slice(0, 2).toUpperCase()
                  )}
                </div>

                <div className="doctor-patient-info">
                  <div className="doctor-patient-info-title">
                    <strong style={{ fontSize: "1.25rem" }}>{patientName(selectedPatient)}</strong>
                    <span className="doctor-folder-tag">
                      Folder: {selectedPatient.physicalFileNumber || selectedPatient.mrn || "No Folder"}
                    </span>
                  </div>

                  <div className="doctor-patient-demographics">
                    <span><strong>Age:</strong> {ageFromDob(selectedPatient.dateOfBirth)}</span>
                    <span>•</span>
                    <span><strong>Sex:</strong> {selectedPatient.gender || "N/A"}</span>
                    <span>•</span>
                    <span><strong>Phone:</strong> {selectedPatient.phone || "No Phone"}</span>
                    {selectedPatient.bloodGroup && (
                      <>
                        <span>•</span>
                        <span><strong>Blood:</strong> {selectedPatient.bloodGroup}</span>
                      </>
                    )}
                    {selectedPatient.genotype && (
                      <>
                        <span>•</span>
                        <span><strong>Genotype:</strong> {selectedPatient.genotype}</span>
                      </>
                    )}
                  </div>

                  {/* Allergy Warning Alert */}
                  {selectedPatient.allergies && (
                    <div style={{ marginTop: "0.25rem", color: "#dc2626", fontWeight: 800, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <FiAlertTriangle /> ALLERGY ALERT: {selectedPatient.allergies}
                    </div>
                  )}
                </div>
              </div>

              {/* Next of Kin / Emergency Contact */}
              {selectedPatient.emergencyContactName && (
                <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  <strong style={{ display: "block", color: "var(--text-color)" }}>Next of Kin:</strong>
                  {selectedPatient.emergencyContactName} ({selectedPatient.emergencyContactRelationship || "Contact"})
                  <br />
                  {selectedPatient.emergencyContactPhone}
                </div>
              )}
            </section>

            {/* CLINICAL CONSULTATION WORKBENCH TABS */}
            <div className="doctor-segmented-nav-wrap">
              <div className="doctor-segmented-nav clinical-tabs" role="tablist" aria-label="Clinical Consultation Tools">
                <button
                  type="button"
                  className={`doctor-nav-tab ${patientTab === "note" ? "active" : ""}`}
                  onClick={() => {
                    setPatientTab("note");
                    navigate("/doctor/note");
                  }}
                  role="tab"
                  aria-selected={patientTab === "note"}
                >
                  <FaNotesMedical className="tab-icon" />
                  <span>Clinical Note</span>
                </button>
                <button
                  type="button"
                  className={`doctor-nav-tab ${patientTab === "prescription" ? "active" : ""}`}
                  onClick={() => {
                    setPatientTab("prescription");
                    navigate("/doctor/prescription");
                  }}
                  role="tab"
                  aria-selected={patientTab === "prescription"}
                >
                  <FaPills className="tab-icon" />
                  <span>Prescription</span>
                  {prescriptionItems.length > 0 && (
                    <span className="tab-badge">{prescriptionItems.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`doctor-nav-tab ${patientTab === "lab" ? "active" : ""}`}
                  onClick={() => {
                    setPatientTab("lab");
                    navigate("/doctor/lab-order");
                  }}
                  role="tab"
                  aria-selected={patientTab === "lab"}
                >
                  <FaFlask className="tab-icon" />
                  <span>Lab Orders</span>
                  {patientLabHistory.length > 0 && (
                    <span className="tab-badge labs">{patientLabHistory.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`doctor-nav-tab ${patientTab === "admission" ? "active" : ""}`}
                  onClick={() => {
                    setPatientTab("admission");
                    navigate("/doctor/admission");
                  }}
                  role="tab"
                  aria-selected={patientTab === "admission"}
                >
                  <FaBed className="tab-icon" />
                  <span>Ward Admission</span>
                </button>
                <button
                  type="button"
                  className={`doctor-nav-tab ${patientTab === "referral" ? "active" : ""}`}
                  onClick={() => {
                    setPatientTab("referral");
                    navigate("/doctor/referral");
                  }}
                  role="tab"
                  aria-selected={patientTab === "referral"}
                >
                  <FiShare2 className="tab-icon" />
                  <span>Specialist Referral</span>
                </button>
                <button
                  type="button"
                  className={`doctor-nav-tab ${patientTab === "history" ? "active" : ""}`}
                  onClick={() => {
                    setPatientTab("history");
                    navigate("/doctor/history");
                  }}
                  role="tab"
                  aria-selected={patientTab === "history"}
                >
                  <FiClock className="tab-icon" />
                  <span>History & Records</span>
                  {patientHistory.length > 0 && (
                    <span className="tab-badge neutral">{patientHistory.length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* STEP 1: CLINICAL NOTE & DIAGNOSIS */}
            {patientTab === "note" && (
              <section className="doctor-panel-card">
                <form onSubmit={handleSaveEncounter} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Visit Type Presets */}
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Visit Type
                    </label>
                    <div className="doctor-presets-row">
                      {visitTypePresets.map((vt) => (
                        <button
                          type="button"
                          key={vt}
                          className={`doctor-preset-chip ${encounterForm.visitType === vt ? "active" : ""}`}
                          onClick={() => setEncounterForm((prev) => ({ ...prev, visitType: vt }))}
                        >
                          {vt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chief Complaint & History */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Chief Complaint (Patient's main concern)
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={encounterForm.chiefComplaint}
                        onChange={(e) => setEncounterForm((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
                        placeholder="e.g. High fever, chills, headache, body pains for 3 days..."
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        History of Presenting Illness (HPI)
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={encounterForm.history}
                        onChange={(e) => setEncounterForm((prev) => ({ ...prev, history: e.target.value }))}
                        placeholder="Detailed progression of symptoms, previous self-medications..."
                      />
                    </div>
                  </div>

                  {/* Physical Examination */}
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Physical Examination Findings
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={encounterForm.examination}
                      onChange={(e) => setEncounterForm((prev) => ({ ...prev, examination: e.target.value }))}
                      placeholder="e.g. Patient is conscious, febrile to touch, chest clear, abdomen soft, no pedal edema..."
                    />
                  </div>

                  {/* Diagnosis & Presets */}
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Clinical Diagnosis / Working Impression
                    </label>
                    <input
                      className="form-control"
                      value={encounterForm.diagnosis}
                      onChange={(e) => setEncounterForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                      placeholder="Type or click standard diagnosis below..."
                      required
                    />

                    {/* Fast Presets for Nigerian Diagnoses */}
                    <div style={{ marginTop: "0.4rem" }}>
                      <small style={{ color: "var(--muted)", fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>
                        Quick Presets (Common Conditions):
                      </small>
                      <div className="doctor-presets-row">
                        {diagnosisPresets.map((diag) => (
                          <button
                            type="button"
                            key={diag}
                            className="doctor-preset-chip"
                            onClick={() => setEncounterForm((prev) => ({
                              ...prev,
                              diagnosis: prev.diagnosis ? `${prev.diagnosis}, ${diag}` : diag,
                            }))}
                          >
                            + {diag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Management Plan & Doctor's Advice */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Management Plan & Orders
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={encounterForm.plan}
                        onChange={(e) => setEncounterForm((prev) => ({ ...prev, plan: e.target.value }))}
                        placeholder="e.g. Prescribed ACT and Paracetamol, ordered FBC, advised bed rest and fluids..."
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Remarks & Follow-up Instructions
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={encounterForm.remarks}
                        onChange={(e) => setEncounterForm((prev) => ({ ...prev, remarks: e.target.value }))}
                        placeholder="e.g. Return in 3 days if fever persists..."
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                    <button type="submit" className="doctor-action-btn primary" disabled={saving}>
                      <FiSave /> {saving ? "Saving..." : "Save Consultation Note"}
                    </button>
                    {activeEncounter && (
                      <button
                        type="button"
                        className="doctor-action-btn secondary"
                        onClick={() => handleCloseEncounter(activeEncounter)}
                        disabled={saving}
                      >
                        <FiCheck /> Complete & Close Consultation
                      </button>
                    )}
                  </div>
                </form>
              </section>
            )}

            {/* STEP 2: PRESCRIBE MEDICINES */}
            {patientTab === "prescription" && (
              <section className="doctor-panel-card">
                <div className="doctor-panel-header">
                  <div>
                    <h2>Prescriptions & Pharmacy Dispatch</h2>
                    <p>Select medicines, dosage instructions, and send directly to hospital pharmacy dispensary.</p>
                  </div>
                </div>

                <form onSubmit={handleSendPrescription} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Medicine Selector & Dosage */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Select Medication
                      </label>
                      <input
                        list="doctor-med-list"
                        className="form-control"
                        value={prescriptionDraft.medicationName}
                        onChange={(e) => handleMedicationSelection(e.target.value)}
                        placeholder="Type or choose drug from hospital formulary..."
                      />
                      <datalist id="doctor-med-list">
                        {(workspace?.medications ?? []).map((med) => (
                          <option key={med.id} value={medicineLabel(med)} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Dose
                      </label>
                      <input
                        className="form-control"
                        value={prescriptionDraft.dose}
                        onChange={(e) => setPrescriptionDraft((prev) => ({ ...prev, dose: e.target.value }))}
                        placeholder="e.g. 1 tablet, 500mg, 10ml"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Frequency
                      </label>
                      <input
                        className="form-control"
                        value={prescriptionDraft.frequency}
                        onChange={(e) => setPrescriptionDraft((prev) => ({ ...prev, frequency: e.target.value }))}
                        placeholder="e.g. BD, TDS, OD, PRN"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Duration
                      </label>
                      <input
                        className="form-control"
                        value={prescriptionDraft.duration}
                        onChange={(e) => setPrescriptionDraft((prev) => ({ ...prev, duration: e.target.value }))}
                        placeholder="e.g. 5 days, 1 week, 1 month"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={prescriptionDraft.quantity}
                        onChange={(e) => setPrescriptionDraft((prev) => ({ ...prev, quantity: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Dosage Presets Buttons */}
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Quick Dosage Presets:
                    </label>
                    <div className="doctor-presets-row">
                      {dosagePresets.map((preset) => (
                        <button
                          type="button"
                          key={preset.label}
                          className="doctor-preset-chip"
                          onClick={() => setPrescriptionDraft((prev) => ({
                            ...prev,
                            dose: preset.dose,
                            frequency: preset.frequency,
                            duration: preset.duration,
                          }))}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Instructions for Patient
                    </label>
                    <input
                      className="form-control"
                      value={prescriptionDraft.instructions}
                      onChange={(e) => setPrescriptionDraft((prev) => ({ ...prev, instructions: e.target.value }))}
                      placeholder="e.g. Take after meals with plenty of water..."
                    />
                  </div>

                  <button
                    type="button"
                    className="doctor-action-btn secondary"
                    style={{ alignSelf: "flex-start" }}
                    onClick={addPrescriptionItem}
                  >
                    <FiPlus /> + Add Medicine to Prescription List
                  </button>

                  {/* List of Added Medicines */}
                  {prescriptionItems.length > 0 && (
                    <div className="doctor-rx-items-list">
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)" }}>
                        Prescription Items ({prescriptionItems.length})
                      </label>
                      {prescriptionItems.map((item, idx) => (
                        <div key={`${item.medicationName}-${idx}`} className="doctor-rx-item-card">
                          <div>
                            <strong>{item.medicationName}</strong>
                            <br />
                            <small>{item.dose} • {item.frequency} • {item.duration} • Qty: {item.quantity}</small>
                            {item.instructions && <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{item.instructions}</div>}
                          </div>
                          <button
                            type="button"
                            className="doctor-action-btn secondary"
                            onClick={() => setPrescriptionItems((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <FiTrash2 /> Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Pharmacist Remarks / Notes
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={prescriptionNotes}
                      onChange={(e) => setPrescriptionNotes(e.target.value)}
                      placeholder="Special dispensing remarks..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="doctor-action-btn primary"
                    disabled={saving || prescriptionItems.length === 0}
                  >
                    <FiSend /> {saving ? "Sending..." : "Dispatch Prescription to Pharmacy"}
                  </button>
                </form>
              </section>
            )}

            {/* STEP 3: LAB TESTS & RESULTS */}
            {patientTab === "lab" && (
              <section className="doctor-panel-card">
                <div className="doctor-panel-header">
                  <div>
                    <h2>Laboratory Investigations & Diagnostic Orders</h2>
                    <p>Request multiple lab tests simultaneously and review full diagnostic results for {patientName(selectedPatient)}.</p>
                  </div>
                </div>

                {/* 1. MULTI-TEST ORDER FORM & CATALOG */}
                <form onSubmit={handleOrderLab} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                  {/* Common Quick Test Picks */}
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
                      Quick Common Investigations (1-Click Add to Order)
                    </label>
                    <div className="doctor-lab-quick-chips">
                      {COMMON_LAB_PANELS.map((panel) => {
                        const matchedTpl = templates.find((t) =>
                          panel.keywords.some((kw) =>
                            t.name.toLowerCase().includes(kw) ||
                            (t.code && t.code.toLowerCase().includes(kw))
                          )
                        );
                        if (!matchedTpl) return null;
                        const isSelected = selectedLabOrders.some((o) => o.templateId === matchedTpl.id);
                        return (
                          <button
                            key={panel.label}
                            type="button"
                            className={`doctor-lab-chip-btn ${isSelected ? "selected" : ""}`}
                            onClick={() => handleToggleLabOrder(matchedTpl)}
                            title={`Toggle ${matchedTpl.name} in order`}
                          >
                            {isSelected ? <FiCheck /> : <FiPlus />}
                            {panel.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modern Diagnostic Test Chooser (Multi Mode) */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                    <div>
                      <TestSearchSelect
                        label="Select Test from Hospital Catalog"
                        mode="multi"
                        templates={templates}
                        selectedTemplateIds={selectedLabOrders.map((o) => o.templateId)}
                        onToggleTemplate={handleToggleLabOrder}
                        onClearMulti={handleClearLabOrders}
                        placeholder="Search test by name, shortcode (FBC, MP, LFT), or specimen..."
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Clinical Indication / Diagnosis for Lab Scientist
                      </label>
                      <input
                        className="form-control"
                        value={labNotes}
                        onChange={(e) => setLabNotes(e.target.value)}
                        placeholder="e.g. Persistent pyrexia, severe pallor, rule out enteric fever/malaria..."
                      />
                    </div>
                  </div>

                  {/* Selected Tests Basket */}
                  {selectedLabOrders.length > 0 && (
                    <div className="doctor-lab-order-basket">
                      <div className="doctor-lab-basket-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <strong>Tests Staged for Request</strong>
                          <span className="doctor-lab-basket-count">
                            <FaFlask /> {selectedLabOrders.length} test{selectedLabOrders.length > 1 ? "s" : ""} selected
                          </span>
                        </div>
                        <button
                          type="button"
                          className="doctor-action-btn secondary"
                          style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
                          onClick={handleClearLabOrders}
                        >
                          Clear All
                        </button>
                      </div>

                      <div className="doctor-lab-basket-list">
                        {selectedLabOrders.map((test, index) => (
                          <div key={test.templateId} className="doctor-lab-basket-item">
                            <div className="doctor-lab-item-meta">
                              <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                                {index + 1}. {test.templateName}
                              </span>
                              {test.category && (
                                <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>
                                  {test.category}
                                </span>
                              )}
                              {test.specimen && (
                                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                  Specimen: <strong>{test.specimen}</strong>
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="lab-icon-btn"
                              style={{ color: "#ef4444", padding: "0.3rem" }}
                              onClick={() => handleRemoveLabOrder(test.templateId)}
                              title="Remove test"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit Multi-Test Button */}
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.5rem" }}>
                    <button
                      type="submit"
                      className="doctor-action-btn primary"
                      disabled={saving || (selectedLabOrders.length === 0 && !labTemplateId)}
                    >
                      <FaFlask />{" "}
                      {saving
                        ? "Submitting to Laboratory..."
                        : selectedLabOrders.length > 1
                        ? `Request All ${selectedLabOrders.length} Laboratory Tests`
                        : "Send Request to Laboratory"}
                    </button>
                    {selectedLabOrders.length > 0 && (
                      <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                        Dispatches {selectedLabOrders.length} lab investigation requisition{selectedLabOrders.length > 1 ? "s" : ""} to the diagnostic laboratory.
                      </span>
                    )}
                  </div>
                </form>

                {/* 2. PATIENT LAB HISTORY & COMPREHENSIVE RESULTS TABLE */}
                <div style={{ marginTop: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
                      Laboratory Investigations History ({patientLabHistory.length})
                    </h3>
                    <small style={{ color: "var(--muted)" }}>For {patientName(selectedPatient)}</small>
                  </div>

                  {patientLabHistory.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>No laboratory records found for this patient.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      {patientLabHistory.map((labReq: LaboratoryRequest) => {
                        const isCompleted = labReq.status === "completed";
                        const hasFields = labReq.template?.fields && labReq.template.fields.length > 0;

                        return (
                          <div
                            key={labReq.id}
                            style={{
                              padding: "1rem 1.15rem",
                              borderRadius: "12px",
                              border: `1.5px solid ${isCompleted ? "#059669" : "var(--border-color)"}`,
                              background: "var(--card-bg, #ffffff)",
                              boxShadow: isCompleted ? "0 2px 8px rgba(5, 150, 105, 0.08)" : "none",
                            }}
                          >
                            {/* Card Top Row */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.6rem" }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                  <strong style={{ fontSize: "1rem", color: "var(--text-color)" }}>
                                    {labReq.template?.name ?? "Laboratory Test"}
                                  </strong>
                                  <span className={`badge ${
                                    isCompleted
                                      ? "badge-success"
                                      : labReq.status === "in_progress"
                                      ? "badge-info"
                                      : labReq.status === "sample_collected"
                                      ? "badge-warning"
                                      : "badge-secondary"
                                  }`}>
                                    {isCompleted ? "✓ RESULT VERIFIED" : labReq.status.replace("_", " ").toUpperCase()}
                                  </span>
                                  {labReq.template?.category && (
                                    <span style={{ fontSize: "0.74rem", padding: "0.15rem 0.5rem", borderRadius: "6px", background: "var(--bg-hover, #f1f5f9)", color: "var(--muted)" }}>
                                      {labReq.template.category}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                                  Req #: <strong>{labReq.requestNumber}</strong> • Specimen: <strong>{labReq.template?.specimen || "Standard"}</strong> • Ordered: {formatDate(labReq.createdAt)}
                                  {isCompleted && labReq.completedAt && (
                                    <span> • Completed: <strong>{formatDate(labReq.completedAt)}</strong></span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                {isCompleted ? (
                                  <>
                                    <button
                                      type="button"
                                      className="doctor-action-btn primary"
                                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                                      onClick={() => setViewingLabResult(labReq)}
                                    >
                                      <FiEye /> View Full Report
                                    </button>
                                    <button
                                      type="button"
                                      className="doctor-action-btn secondary"
                                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                                      onClick={() => setViewingLabResult(labReq)}
                                    >
                                      <FiPrinter /> Print
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="doctor-action-btn secondary"
                                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                                    onClick={() => setViewingLabResult(labReq)}
                                  >
                                    <FiFileText /> Tracking Slip
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Clinical Notes / Doctor Indication */}
                            {labReq.clinicalNotes && (
                              <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                                <strong>Doctor Indication:</strong> {labReq.clinicalNotes}
                              </div>
                            )}

                            {/* Complete Analyte Results Table for Completed Requests */}
                            {isCompleted && hasFields && (
                              <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
                                <table className="doctor-lab-analyte-table">
                                  <thead>
                                    <tr>
                                      <th>Parameter / Analyte</th>
                                      <th>Observed Value</th>
                                      <th className="hide-mobile">Unit</th>
                                      <th className="hide-mobile">Reference Range</th>
                                      <th>Evaluation</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {labReq.template.fields.map((field, fIdx) => {
                                      const rawVal = (labReq.resultValues as Record<string, unknown> | null | undefined)?.[field.key];
                                      const displayVal = rawVal !== undefined && rawVal !== null && rawVal !== "" ? String(rawVal) : "—";
                                      const flag = evaluateLiveFlag(field.referenceRange, rawVal);

                                      return (
                                        <tr key={fIdx}>
                                          <td style={{ fontWeight: 600 }}>{field.label}</td>
                                          <td>
                                            <strong style={{ fontSize: "0.92rem" }}>{displayVal}</strong>
                                          </td>
                                          <td className="hide-mobile" style={{ color: "var(--muted)" }}>{field.unit || "—"}</td>
                                          <td className="hide-mobile" style={{ color: "var(--muted)" }}>{field.referenceRange || "Standard"}</td>
                                          <td>
                                            {flag ? (
                                              <span className={`doctor-lab-flag-pill ${flag.status}`}>
                                                {flag.label}
                                              </span>
                                            ) : (
                                              <span className="doctor-lab-flag-pill normal">NORMAL</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Scientist Remarks / Interpretation */}
                            {isCompleted && (labReq.interpretation || labReq.technicianNote) && (
                              <div style={{ marginTop: "0.6rem", padding: "0.6rem 0.8rem", background: "var(--bg-hover, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                                {labReq.interpretation && (
                                  <div style={{ fontSize: "0.84rem", color: "#0284c7" }}>
                                    <strong>Clinical Interpretation:</strong> {labReq.interpretation}
                                  </div>
                                )}
                                {labReq.technicianNote && (
                                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                                    <strong>Lab Scientist Note:</strong> {labReq.technicianNote}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* STEP 4: WARD BED ADMISSION */}
            {patientTab === "admission" && (
              <section className="doctor-panel-card">
                <div className="doctor-panel-header">
                  <div>
                    <h2>Ward & Inpatient Bed Allocation</h2>
                    <p>Request hospital admission and bed reservation for {patientName(selectedPatient)}.</p>
                  </div>
                </div>

                <form onSubmit={handleRequestAdmission} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Priority
                      </label>
                      <select
                        className="form-control"
                        value={admissionForm.priority}
                        onChange={(e) => setAdmissionForm((prev) => ({ ...prev, priority: e.target.value as ClinicalRequestPriority }))}
                      >
                        {priorityOptions.map((p) => (
                          <option key={p} value={p}>
                            {p.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Ward
                      </label>
                      <select
                        className="form-control"
                        value={admissionForm.wardId}
                        onChange={(e) => setAdmissionForm((prev) => ({ ...prev, wardId: e.target.value, bedId: "" }))}
                      >
                        <option value="">-- Any Available Ward --</option>
                        {(workspace?.wards ?? []).map((w: Ward) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Available Bed
                      </label>
                      <select
                        className="form-control"
                        value={admissionForm.bedId}
                        onChange={(e) => setAdmissionForm((prev) => ({ ...prev, bedId: e.target.value }))}
                      >
                        <option value="">Assign upon ward arrival</option>
                        {availableBedsForWard.map((bed: Bed) => (
                          <option key={bed.id} value={bed.id}>
                            Bed {bed.bedNumber} {bed.ward?.name ? `(${bed.ward.name})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Admission Diagnosis
                    </label>
                    <input
                      className="form-control"
                      value={admissionForm.diagnosis}
                      onChange={(e) => setAdmissionForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                      placeholder="Primary condition requiring inpatient care..."
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Reason for Admission
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={admissionForm.reason}
                      onChange={(e) => setAdmissionForm((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="e.g. IV fluids and antibiotics, close monitoring, pre-operative preparation..."
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Nursing Instructions
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={admissionForm.notes}
                      onChange={(e) => setAdmissionForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Specific observation orders for nursing staff..."
                    />
                  </div>

                  <button type="submit" className="doctor-action-btn primary" disabled={saving}>
                    <FaBed /> {saving ? "Submitting..." : "Submit Admission Request"}
                  </button>
                </form>
              </section>
            )}

            {/* STEP 5: SPECIALIST REFERRAL */}
            {patientTab === "referral" && (
              <section className="doctor-panel-card">
                <div className="doctor-panel-header">
                  <div>
                    <h2>Specialist & External Referrals</h2>
                    <p>Refer {patientName(selectedPatient)} to a consultant specialist or external facility.</p>
                  </div>
                </div>

                <form onSubmit={handleCreateReferral} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Referral Priority
                      </label>
                      <select
                        className="form-control"
                        value={referralForm.priority}
                        onChange={(e) => setReferralForm((prev) => ({ ...prev, priority: e.target.value as ClinicalRequestPriority }))}
                      >
                        {priorityOptions.map((p) => (
                          <option key={p} value={p}>
                            {p.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Destination Facility / Center
                      </label>
                      <input
                        className="form-control"
                        value={referralForm.destinationFacility}
                        onChange={(e) => setReferralForm((prev) => ({ ...prev, destinationFacility: e.target.value }))}
                        placeholder="e.g. Teaching Hospital / Specialist Clinic"
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                        Specialty / Department
                      </label>
                      <input
                        className="form-control"
                        value={referralForm.departmentOrSpecialty}
                        onChange={(e) => setReferralForm((prev) => ({ ...prev, departmentOrSpecialty: e.target.value }))}
                        placeholder="e.g. Cardiology, Neurosurgery, Ophthalmology"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Reason for Referral
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={referralForm.reason}
                      onChange={(e) => setReferralForm((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="Clinical reason for referral..."
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>
                      Clinical Summary
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={referralForm.clinicalSummary}
                      onChange={(e) => setReferralForm((prev) => ({ ...prev, clinicalSummary: e.target.value }))}
                      placeholder="Summary of examination findings and investigations performed to date..."
                    />
                  </div>

                  <button type="submit" className="doctor-action-btn primary" disabled={saving}>
                    <FiShare2 /> {saving ? "Saving..." : "Generate Referral Letter"}
                  </button>
                </form>
              </section>
            )}

            {/* STEP 6: PAST MEDICAL RECORDS */}
            {patientTab === "history" && (
              <section className="doctor-panel-card">
                <div className="doctor-panel-header">
                  <div>
                    <h2>Patient Clinical History</h2>
                    <p>Previous consultation notes and encounter records for {patientName(selectedPatient)}.</p>
                  </div>
                </div>

                {patientHistory.length === 0 ? (
                  <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>
                    No previous consultation notes recorded for this patient.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {patientHistory.map((enc) => (
                      <div
                        key={enc.id}
                        style={{
                          padding: "1.15rem",
                          borderRadius: "12px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-hover, #f8fafc)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                          <strong>{enc.visitType || "Clinical Encounter"} • {enc.encounterNumber}</strong>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <span className={`badge ${enc.status === "completed" ? "badge-success" : "badge-info"}`}>
                              {enc.status.toUpperCase()}
                            </span>
                            <button
                              type="button"
                              className="doctor-action-btn secondary"
                              style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem" }}
                              onClick={() => setPrintingEncounter(enc)}
                            >
                              <FiPrinter /> Print Note
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: "0.86rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
                          Date: {formatDate(enc.startedAt)} • Doctor: Dr. {enc.doctor?.firstName || user?.firstName} {enc.doctor?.lastName || user?.lastName}
                        </div>

                        <div style={{ fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          {enc.chiefComplaint && <div><strong>Complaint:</strong> {enc.chiefComplaint}</div>}
                          {enc.diagnosis && <div><strong>Diagnosis:</strong> {enc.diagnosis}</div>}
                          {enc.plan && <div><strong>Plan:</strong> {enc.plan}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* STICKY BOTTOM ACTIONS BAR */}
            <div className="doctor-desk-bottom-bar">
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="doctor-action-btn primary"
                  onClick={handleSaveEncounter}
                  disabled={saving}
                >
                  <FiSave /> Save Case Note
                </button>
                <button
                  type="button"
                  className="doctor-action-btn secondary"
                  onClick={() => setPatientTab("prescription")}
                >
                  <FaPills /> Prescribe Drugs ({prescriptionItems.length})
                </button>
                <button
                  type="button"
                  className="doctor-action-btn secondary"
                  onClick={() => setPatientTab("lab")}
                >
                  <FaFlask /> Request Lab Test
                </button>
              </div>

              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="doctor-action-btn secondary"
                  onClick={() => setPrintingEncounter(activeEncounter || ({ patient: selectedPatient, startedAt: new Date().toISOString(), ...encounterForm } as unknown as ClinicalEncounter))}
                >
                  <FiPrinter /> Print Summary
                </button>
                <button
                  type="button"
                  className="doctor-action-btn primary"
                  style={{ background: "#059669", borderColor: "#059669" }}
                  onClick={() => activeEncounter ? handleCloseEncounter(activeEncounter) : closePatientDesk()}
                  disabled={saving}
                >
                  <FiCheckCircle /> Complete & Return to Queue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRINT TEMPLATE (Hidden until print triggered) */}
        {printingEncounter && (
          <section className="doctor-print-template">
            <header>
              <img src={mdsLogo} alt="MDS Hospital" style={{ width: 40, height: 40, objectFit: "contain" }} />
              <div>
                <h1>MDS Hospital</h1>
                <p>Medical Consultation & Clinical Note</p>
              </div>
              <span>{printingEncounter.encounterNumber || "CLINICAL-SUMMARY"}</span>
            </header>

            <div className="doctor-print-meta">
              <div>
                <small>Patient Name</small>
                <strong>{patientName(printingEncounter.patient ?? selectedPatient)}</strong>
              </div>
              <div>
                <small>Folder No / MRN</small>
                <strong>{(printingEncounter.patient ?? selectedPatient)?.physicalFileNumber ?? (printingEncounter.patient ?? selectedPatient)?.mrn ?? "Not assigned"}</strong>
              </div>
              <div>
                <small>Age / Gender</small>
                <strong>
                  {ageFromDob((printingEncounter.patient ?? selectedPatient)?.dateOfBirth)} / {(printingEncounter.patient ?? selectedPatient)?.gender}
                </strong>
              </div>
              <div>
                <small>Consultation Date</small>
                <strong>{formatDate(printingEncounter.startedAt)}</strong>
              </div>
            </div>

            <div className="doctor-print-section">
              <h2>Clinical Findings & Case Summary</h2>
              <p><strong>Chief Complaint:</strong> {printingEncounter.chiefComplaint || encounterForm.chiefComplaint || "Not recorded"}</p>
              <p><strong>History of Presenting Illness:</strong> {printingEncounter.history || encounterForm.history || "Not recorded"}</p>
              <p><strong>Physical Examination:</strong> {printingEncounter.examination || encounterForm.examination || "Not recorded"}</p>
              <p><strong>Diagnosis:</strong> {printingEncounter.diagnosis || encounterForm.diagnosis || "Not recorded"}</p>
              <p><strong>Treatment Plan:</strong> {printingEncounter.plan || encounterForm.plan || "Not recorded"}</p>
              <p><strong>Remarks / Advice:</strong> {printingEncounter.remarks || encounterForm.remarks || "Not recorded"}</p>
            </div>

            <footer>
              <div>
                <small>Attending Doctor</small>
                <strong>
                  Dr. {printingEncounter.doctor?.firstName ?? user?.firstName}{" "}
                  {printingEncounter.doctor?.lastName ?? user?.lastName}
                </strong>
              </div>
              <div className="doctor-signature">Doctor's Signature & Stamp</div>
            </footer>
          </section>
        )}

        {/* LABORATORY FULL TEST RESULT & OFFICIAL REPORT MODAL */}
        {viewingLabResult && (
          <LaboratoryPrintModal
            request={viewingLabResult}
            onClose={() => setViewingLabResult(null)}
            initialDocumentType={
              viewingLabResult.status === "completed" ||
              (viewingLabResult.resultValues && Object.keys(viewingLabResult.resultValues).length > 0)
                ? "result"
                : "request"
            }
          />
        )}
      </main>
    </AdminLayout>
  );
}
