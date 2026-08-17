import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiAward,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCompass,
  FiGrid,
  FiHelpCircle,
  FiList,
  FiMapPin,
  FiShield,
  FiUserCheck,
  FiX,
  FiZap,
} from "react-icons/fi";
import {
  FaBed,
  FaCapsules,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaFlask,
  FaHeartbeat,
  FaHospitalUser,
  FaKey,
  FaPrescriptionBottleAlt,
  FaStethoscope,
  FaUserInjured,
  FaUserNurse,
  FaUserShield,
} from "react-icons/fa";

import { useAuthStore } from "../../store/authStore";
import { getTourStatus, recordTourEvent, type TourAction } from "../../services/onboardingService";

export type OnboardingStep = {
  id: string;
  title: string;
  category: string;
  icon: ReactElement;
  summary: string;
  highlights: string[];
  path?: string;
  actionLabel?: string;
};

export type RoleOnboardingProfile = {
  id: string;
  roleLabel: string;
  tagline: string;
  accent: string;
  icon: ReactElement;
  description: string;
  steps: OnboardingStep[];
};

const TOUR_EVENT = "mds:start-role-tour";
const TOUR_VERSION = "2026.08-v2";

function hasRole(roles: string[], target: string) {
  return roles.some((role) => role.toLowerCase() === target.toLowerCase());
}

const roleProfiles: RoleOnboardingProfile[] = [
  {
    id: "doctor",
    roleLabel: "Doctor",
    tagline: "Outpatient Queue, Clinical Encounters & Inpatient Care",
    accent: "#0ea5e9",
    icon: <FaStethoscope />,
    description:
      "Welcome to your clinical consultation suite. Manage appointments, examine patients, request diagnostic tests, prescribe medications, and initiate admissions.",
    steps: [
      {
        id: "doc-queue",
        title: "Appointment Queue & Triage",
        category: "Consultation",
        icon: <FaClipboardList />,
        summary:
          "View patient appointments assigned to you in real time. Track triage priority, waiting durations, and check in patients ready for consultation.",
        highlights: [
          "Live outpatient waiting list with waiting duration",
          "One-click check in and start consultation",
          "Direct access to patient medical records",
        ],
        path: "/doctor/appointments",
        actionLabel: "Open Doctor Queue",
      },
      {
        id: "doc-patients",
        title: "Patient Medical History",
        category: "Patient Records",
        icon: <FaUserInjured />,
        summary:
          "Access comprehensive patient histories including past consultation notes, vital sign charts, past laboratory reports, and previous medications.",
        highlights: [
          "Complete longitudinal clinical encounter history",
          "Allergies, blood group, genotype, and emergency contacts",
          "Printable medical summary reports",
        ],
        path: "/doctor/patients",
        actionLabel: "View Patient List",
      },
      {
        id: "doc-notes",
        title: "Clinical Notes & Diagnosis",
        category: "Documentation",
        icon: <FaStethoscope />,
        summary:
          "Document presenting complaints, physical examination findings, provisional/confirmed diagnoses, and comprehensive treatment plans.",
        highlights: [
          "Structured clinical encounter documentation",
          "Working and definitive diagnosis logging",
          "Encrypted, audit-trailed clinical notes",
        ],
        path: "/doctor/notes",
        actionLabel: "Write Clinical Notes",
      },
      {
        id: "doc-lab-rx",
        title: "Lab Requests & E-Prescriptions",
        category: "Orders",
        icon: <FaPrescriptionBottleAlt />,
        summary:
          "Order diagnostic investigations with specialized lab templates and prescribe formulary medications routed instantly to the pharmacy.",
        highlights: [
          "Direct laboratory test requisitions with live status updates",
          "Electronic prescription entry with dose, route, and frequency",
          "Automated routing to lab workbench and pharmacy POS",
        ],
        path: "/doctor",
        actionLabel: "Clinical Workspace",
      },
      {
        id: "doc-admissions",
        title: "Inpatient Admissions & Referrals",
        category: "Hospital Care",
        icon: <FaBed />,
        summary:
          "Request immediate ward admissions with priority indicators or prepare external hospital transfer referrals with clinical summaries.",
        highlights: [
          "Ward & Bed allocation requests with clinical diagnosis",
          "External referral letters with clinical handover summaries",
          "Real-time bed availability tracking",
        ],
        path: "/doctor",
        actionLabel: "Manage Care Plans",
      },
    ],
  },
  {
    id: "nurse",
    roleLabel: "Nurse",
    tagline: "Ward Inpatients, Vitals Monitoring & Medication Administration",
    accent: "#14b8a6",
    icon: <FaUserNurse />,
    description:
      "Your digital nursing station for monitoring inpatients, recording vital signs, administering scheduled medications, and documenting shift handovers.",
    steps: [
      {
        id: "nurse-station",
        title: "Nursing Station & Ward Overview",
        category: "Ward Care",
        icon: <FaHospitalUser />,
        summary:
          "Get a real-time overview of admitted patients, active ward occupancy, pending medication rounds, and doctor directives.",
        highlights: [
          "Inpatient bed list with admitted patient details",
          "Quick alerts for overdue medications and vitals checks",
          "Optimized for tablets and mobile devices during ward rounds",
        ],
        path: "/nurse",
        actionLabel: "Open Nursing Station",
      },
      {
        id: "nurse-vitals",
        title: "Vital Signs Charting",
        category: "Patient Care",
        icon: <FaHeartbeat />,
        summary:
          "Record temperature, blood pressure, pulse rate, respiration rate, SpO2 oxygen saturation, and pain score with instant clinical alerts.",
        highlights: [
          "Fast numerical entry for standard clinical vitals",
          "Instant abnormal range alerts for critical vitals",
          "Historical vital sign trends visible to attending doctors",
        ],
        path: "/nurse/vitals",
        actionLabel: "Record Vitals",
      },
      {
        id: "nurse-mar",
        title: "Medication Administration (MAR)",
        category: "Medication",
        icon: <FaCapsules />,
        summary:
          "View digital medication administration schedules. Administer prescribed doses on time and sign off with your nurse initials.",
        highlights: [
          "Real-time due, upcoming, and overdue medication lists",
          "Status tracking for Given, Held, Missed, and Refused doses",
          "Replaces paper Kardex signing with secure digital records",
        ],
        path: "/nurse/medications",
        actionLabel: "Open Medication Rounds",
      },
      {
        id: "nurse-notes",
        title: "Shift Notes & Handovers",
        category: "Documentation",
        icon: <FaClipboardList />,
        summary:
          "Document shift assessments, patient responses to treatment, fluid balance notes, and critical handover instructions.",
        highlights: [
          "Shift categorized documentation (Morning, Afternoon, Night)",
          "Seamless handovers between incoming and outgoing nursing shifts",
          "Directly accessible in patient clinical timelines",
        ],
        path: "/nurse/notes",
        actionLabel: "Nursing Notes",
      },
    ],
  },
  {
    id: "pharmacy",
    roleLabel: "Pharmacist",
    tagline: "Formulary Inventory, POS Dispensing & Stock Auditing",
    accent: "#10b981",
    icon: <FaCapsules />,
    description:
      "Manage hospital medications, fulfill electronic doctor prescriptions, conduct over-the-counter sales, and track batch expiries and stock levels.",
    steps: [
      {
        id: "pharm-dispense",
        title: "Prescription Dispensing",
        category: "Dispensing",
        icon: <FaPrescriptionBottleAlt />,
        summary:
          "Review electronic prescriptions transmitted from consultation rooms, verify drug interactions and dosage instructions, and dispense.",
        highlights: [
          "Real-time queue of pending electronic doctor prescriptions",
          "Automatic stock level decrement upon dispensing",
          "Integrated patient billing and payment status validation",
        ],
        path: "/pharmacy",
        actionLabel: "Open Pharmacy Hub",
      },
      {
        id: "pharm-pos",
        title: "Point-of-Sale & Direct Sales",
        category: "Billing",
        icon: <FaFileInvoiceDollar />,
        summary:
          "Sell medications directly to walk-in patients, manage shopping carts, apply discounts where applicable, and generate receipts.",
        highlights: [
          "Fast medication search by generic name, brand, or category",
          "Itemized invoice calculation with payment logging",
          "Printable patient receipts with official hospital header",
        ],
        path: "/pharmacy",
        actionLabel: "Direct Medicine Sale",
      },
      {
        id: "pharm-inventory",
        title: "Formulary & Stock Inventory",
        category: "Inventory",
        icon: <FaClipboardList />,
        summary:
          "Keep track of stock balances, reorder alert thresholds, supplier costs, selling prices, batch numbers, and expiry dates.",
        highlights: [
          "Low-stock alerts when inventory drops below reorder point",
          "Batch number and expiration date tracking",
          "Stock-in, adjustment, and damage logs with audit notes",
        ],
        path: "/inventory",
        actionLabel: "Check Stock Levels",
      },
    ],
  },
  {
    id: "laboratory",
    roleLabel: "Laboratory",
    tagline: "Test Requisitions, Sample Management & Result Certification",
    accent: "#8b5cf6",
    icon: <FaFlask />,
    description:
      "Receive diagnostic requests from doctors, log specimen collections, input structured test results using templates, and certify lab reports.",
    steps: [
      {
        id: "lab-queue",
        title: "Investigation Worklist",
        category: "Requests",
        icon: <FaFlask />,
        summary:
          "Receive incoming laboratory test requests from outpatient doctors, wards, and reception investigation patients.",
        highlights: [
          "Live test request queue with patient MRN and clinical notes",
          "Priority flags for emergency and routine investigations",
          "Status tracking from sample collection to completion",
        ],
        path: "/laboratory",
        actionLabel: "Open Lab Workbench",
      },
      {
        id: "lab-templates",
        title: "Dynamic Test Templates",
        category: "Configuration",
        icon: <FaClipboardList />,
        summary:
          "Configure standard laboratory templates (e.g. Full Blood Count, Malaria Parasite, Urinalysis, ChemPath) with custom fields and reference ranges.",
        highlights: [
          "Configurable numerical, select, and text result fields",
          "Standard reference ranges and biological measurement units",
          "Reusable test profiles for rapid technician entry",
        ],
        path: "/laboratory/templates",
        actionLabel: "Manage Templates",
      },
      {
        id: "lab-results",
        title: "Result Entry & Report Release",
        category: "Reporting",
        icon: <FiCheckCircle />,
        summary:
          "Input specimen findings, record technician interpretation, and certify results. Reports become instantly available to attending physicians.",
        highlights: [
          "Fast, structured result entry fields",
          "Automated notification to ordering doctors upon completion",
          "Official printable laboratory diagnostic report",
        ],
        path: "/laboratory",
        actionLabel: "Enter Test Results",
      },
    ],
  },
  {
    id: "reception",
    roleLabel: "Reception & Cashier",
    tagline: "Patient Registration, Appointment Triage & Service Billing",
    accent: "#f59e0b",
    icon: <FaHospitalUser />,
    description:
      "Register new patients, manage medical records, book doctor appointments, issue hospital bills, and print verification ID cards.",
    steps: [
      {
        id: "rec-register",
        title: "Patient Registration",
        category: "Registration",
        icon: <FaHospitalUser />,
        summary:
          "Register new hospital patients, investigation-only clients, and reactivate archived accounts with automated MRN and QR code assignment.",
        highlights: [
          "Automated unique MRN (Medical Record Number) generation",
          "Emergency contact, insurance policy, and demographic capture",
          "Support for Investigation-only and Regular patient categories",
        ],
        path: "/register-patient",
        actionLabel: "Register New Patient",
      },
      {
        id: "rec-search",
        title: "Patient Directory & ID Cards",
        category: "Directory",
        icon: <FiUserCheck />,
        summary:
          "Search patient records by MRN, name, phone number, or HMO insurance policy. Generate and print official QR-enabled patient ID cards.",
        highlights: [
          "Instant search across active and past patients",
          "Printable patient ID card with verification QR code",
          "One-click demographic updates and category conversions",
        ],
        path: "/patients",
        actionLabel: "Search Patients",
      },
      {
        id: "rec-appointments",
        title: "Appointment Scheduling",
        category: "Scheduling",
        icon: <FaClipboardList />,
        summary:
          "Schedule outpatient visits, book doctor consultations, and manage daily waiting queues with doctor assignment.",
        highlights: [
          "Doctor availability and specialty assignment",
          "Scheduled, Checked-in, and Completed status management",
          "Live consultation queue integration",
        ],
        path: "/appointments",
        actionLabel: "Book Appointment",
      },
      {
        id: "rec-billing",
        title: "Cashier Desk & Billing",
        category: "Billing",
        icon: <FaFileInvoiceDollar />,
        summary:
          "Issue invoices based on standard hospital service tariffs, record cash or digital payments, and print customer payment receipts.",
        highlights: [
          "Standard hospital service fee schedule selection",
          "Invoice generation with Pending and Paid payment states",
          "Printable cashier invoices with official hospital header",
        ],
        path: "/billing",
        actionLabel: "Open Cashier Desk",
      },
    ],
  },
  {
    id: "security",
    roleLabel: "Security",
    tagline: "Gate Entry Verification, Staff ID Lookup & Visitor Logs",
    accent: "#ef4444",
    icon: <FaUserShield />,
    description:
      "Control hospital perimeter security, log visitor and patient entries, verify staff badges, and monitor on-premises visitors.",
    steps: [
      {
        id: "sec-entry",
        title: "Gate Entry Logging",
        category: "Gate Control",
        icon: <FaUserShield />,
        summary:
          "Record incoming entries for patients, relatives, hospital staff, and delivery/guest visitors with destination tracking.",
        highlights: [
          "Categorized entry logging (Patient, Relative, Staff, Guest)",
          "Emergency fast-track entry for urgent arrivals",
          "Destination department and purpose recording",
        ],
        path: "/security/entry",
        actionLabel: "Log Gate Entry",
      },
      {
        id: "sec-lookup",
        title: "Staff Badge Verification",
        category: "Verification",
        icon: <FaKey />,
        summary:
          "Look up staff ID numbers or scan badges to auto-fill verified employee names, departments, and credentials instantly.",
        highlights: [
          "Instant staff ID number verification against active roster",
          "Prevents manual typing errors at the main gate",
          "Real-time validation of active staff status",
        ],
        path: "/security/entry",
        actionLabel: "Staff ID Check",
      },
      {
        id: "sec-logs",
        title: "Visitor Logs & Time-Out",
        category: "Logs",
        icon: <FaClipboardList />,
        summary:
          "Track who is currently inside the hospital facility and mark time-out when visitors exit through the gate.",
        highlights: [
          "Live list of visitors currently on hospital premises",
          "Multi-day stay indicators (+1d, +2d) for ward relatives",
          "One-tap exit timestamp registration",
        ],
        path: "/security/logs",
        actionLabel: "View Entry Logs",
      },
    ],
  },
  {
    id: "desk-office",
    roleLabel: "Desk Office & HMO",
    tagline: "Insurance Providers, Co-pay Tariffs & HMO Claims",
    accent: "#06b6d4",
    icon: <FiShield />,
    description:
      "Manage health insurance schemes (HMOs, NHIA), verify patient coverage, process monthly insurance claims, and track payouts.",
    steps: [
      {
        id: "desk-claims",
        title: "HMO Claims Management",
        category: "Claims",
        icon: <FaFileInvoiceDollar />,
        summary:
          "File and track claims submitted to insurance providers. Record claimed amounts, received payouts, and discrepancies.",
        highlights: [
          "Monthly claim logging per insurance provider",
          "Track claimed versus approved amount differences",
          "Historical reconciliation reports for hospital accounts",
        ],
        path: "/desk-office",
        actionLabel: "Open Claims Desk",
      },
      {
        id: "desk-providers",
        title: "Insurance Providers Setup",
        category: "HMO Schemes",
        icon: <FiShield />,
        summary:
          "Maintain the catalog of active insurance companies, NHIA programs, contact details, and patient co-pay percentage rates.",
        highlights: [
          "Provider contact, policy code, and address management",
          "Patient co-pay percentage calculation",
          "Active status management for approved providers",
        ],
        path: "/setup/insurance",
        actionLabel: "Manage HMO Providers",
      },
    ],
  },
  {
    id: "super-admin",
    roleLabel: "Super Admin & Management",
    tagline: "Executive KPIs, Staff RBAC & Hospital Infrastructure",
    accent: "#3b82f6",
    icon: <FiAward />,
    description:
      "Hospital executive control center: track operational KPIs, manage user accounts and security roles, and configure wards, beds, and service fees.",
    steps: [
      {
        id: "admin-kpi",
        title: "Executive Dashboard",
        category: "Analytics",
        icon: <FiZap />,
        summary:
          "Real-time visibility into daily patient volume, active admissions, pharmacy stock warnings, and department activities.",
        highlights: [
          "Live hospital operational indicators and patient counts",
          "Bed occupancy status and ward availability metrics",
          "Recent clinical and operational event streams",
        ],
        path: "/dashboard",
        actionLabel: "Open Dashboard",
      },
      {
        id: "admin-users",
        title: "Staff Accounts & Security RBAC",
        category: "Administration",
        icon: <FaHospitalUser />,
        summary:
          "Create staff user accounts, assign primary roles, configure granular permissions, and print verified employee ID badges.",
        highlights: [
          "Fine-grained role and permission management",
          "Secure password resets and account activation toggles",
          "Printable employee ID cards with verification QR codes",
        ],
        path: "/admin/users",
        actionLabel: "Manage Staff Users",
      },
      {
        id: "admin-setup",
        title: "Hospital Setup & Infrastructure",
        category: "Configuration",
        icon: <FaBed />,
        summary:
          "Configure hospital service tariffs, departments, medical specialties, wards, rooms, and individual bed inventories.",
        highlights: [
          "Service catalog pricing and department code setup",
          "Ward, room, and bed layout management with status controls",
          "Insurance provider master configuration",
        ],
        path: "/setup/services",
        actionLabel: "Hospital Setup",
      },
    ],
  },
];

function getTourProfile(roles: string[]): RoleOnboardingProfile {
  if (hasRole(roles, "Doctor")) return roleProfiles[0];
  if (hasRole(roles, "Nurse")) return roleProfiles[1];
  if (hasRole(roles, "Pharmacist") || hasRole(roles, "Pharmacy")) return roleProfiles[2];
  if (hasRole(roles, "Laboratory")) return roleProfiles[3];
  if (hasRole(roles, "Receptionist") || hasRole(roles, "Cashier") || hasRole(roles, "Billing Officer")) {
    return roleProfiles[4];
  }
  if (hasRole(roles, "Security")) return roleProfiles[5];
  if (hasRole(roles, "Desk Office")) return roleProfiles[6];
  if (hasRole(roles, "Super Admin") || hasRole(roles, "Administrator")) return roleProfiles[7];

  return {
    id: "care-team",
    roleLabel: roles[0] || "Hospital Staff",
    tagline: "CeekayX Hospital Management System",
    accent: "#3b82f6",
    icon: <FiCompass />,
    description:
      "Welcome to CeekayX HMS. Access your assigned workspaces, search patients, and manage your daily healthcare operations.",
    steps: [
      {
        id: "gen-dash",
        title: "Role Workspace",
        category: "Overview",
        icon: <FiZap />,
        summary:
          "Your sidebar and bottom navigation automatically adapt to show only the clinical and administrative areas you have permissions to use.",
        highlights: [
          "Personalized workspace tailored to your medical credentials",
          "Real-time notifications and system status monitoring",
          "Accessible across desktop, tablet, and mobile devices",
        ],
        path: "/dashboard",
        actionLabel: "Go to Workspace",
      },
      {
        id: "gen-patients",
        title: "Patient Information",
        category: "Directory",
        icon: <FaHospitalUser />,
        summary:
          "Look up patient records quickly before entering data to maintain accurate clinical continuity and avoid duplicate entries.",
        highlights: [
          "Fast search by MRN, name, phone, or policy number",
          "Secure role-protected medical record access",
          "Integrated ID card verification",
        ],
        path: "/patients",
        actionLabel: "Search Directory",
      },
    ],
  };
}

function hiddenKey(userId: string, profileId: string) {
  return `mds:onboarding:hidden:${userId}:${profileId}`;
}

function sessionKey(userId: string, profileId: string) {
  return `mds:onboarding:session:${userId}:${profileId}`;
}

export default function RoleTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const profile = useMemo(() => getTourProfile(roles), [roles]);

  const [isOpen, setIsOpen] = useState(false);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);
  const [viewMode, setViewMode] = useState<"step" | "overview">("step");
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const userId = user?.id ?? "guest";
  const activeStep = profile.steps[stepIndex] || profile.steps[0];
  const isLastStep = stepIndex === profile.steps.length - 1;

  const sendEvent = useCallback(
    (action: TourAction, overrides: Partial<{ stepIndex: number; path: string }> = {}) => {
      if (!user?.id) return;

      void recordTourEvent({
        tourKey: profile.id,
        tourVersion: TOUR_VERSION,
        roleName: profile.roleLabel,
        action,
        stepIndex: overrides.stepIndex ?? stepIndex,
        totalSteps: profile.steps.length,
        path: overrides.path ?? activeStep?.path ?? location.pathname,
        deviceType: typeof window !== "undefined" && window.innerWidth <= 768 ? "mobile" : "desktop",
      }).catch(() => {});
    },
    [activeStep?.path, location.pathname, profile.id, profile.roleLabel, profile.steps.length, stepIndex, user?.id]
  );

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const isHidden = localStorage.getItem(hiddenKey(user.id, profile.id)) === "true";
    const seenThisSession = sessionStorage.getItem(sessionKey(user.id, profile.id)) === "true";

    if (!isHidden && !seenThisSession) {
      let cancelled = false;

      void getTourStatus(profile.id, TOUR_VERSION)
        .then((status) => {
          if (cancelled || status?.shouldShow === false) {
            if (status?.shouldShow === false) {
              localStorage.setItem(hiddenKey(user.id, profile.id), "true");
            }
            return;
          }

          const timer = window.setTimeout(() => {
            setShowWelcomePrompt(true);
          }, 1200);

          return () => window.clearTimeout(timer);
        })
        .catch(() => {
          const timer = window.setTimeout(() => {
            setShowWelcomePrompt(true);
          }, 1200);

          return () => window.clearTimeout(timer);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [profile.id, user?.id]);

  useEffect(() => {
    const handleStartTour = () => {
      setShowWelcomePrompt(false);
      setDontShowAgain(false);
      setStepIndex(0);
      setViewMode("step");
      setIsOpen(true);
      sendEvent("started", { stepIndex: 0 });
    };

    window.addEventListener(TOUR_EVENT, handleStartTour);
    return () => window.removeEventListener(TOUR_EVENT, handleStartTour);
  }, [sendEvent]);

  useEffect(() => {
    if (!isOpen) return;
    sendEvent("step_viewed");
  }, [isOpen, sendEvent, stepIndex]);

  const handleClose = (action: "skipped" | "completed" | "dont_show_again") => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(sessionKey(userId, profile.id), "true");

      if (action === "dont_show_again" || dontShowAgain) {
        localStorage.setItem(hiddenKey(userId, profile.id), "true");
      }
    }

    sendEvent(dontShowAgain ? "dont_show_again" : action);
    setIsOpen(false);
    setShowWelcomePrompt(false);
  };

  const handleNavigateToStep = (path?: string) => {
    if (!path) return;
    sendEvent("page_opened", { path });
    handleClose("completed");
    navigate(path);
  };

  if (!user) return null;

  const customStyle = {
    "--onboard-accent": profile.accent,
  } as CSSProperties;

  return (
    <>
      {/* 1. NON-AGGRESSIVE FLOATING WELCOME TOAST */}
      {showWelcomePrompt && !isOpen && (
        <aside
          className="onboarding-welcome-toast"
          style={customStyle}
          role="region"
          aria-label="Onboarding guide invitation"
        >
          <div className="toast-glow" />
          <div className="toast-icon-badge">{profile.icon}</div>
          <div className="toast-content">
            <div className="toast-header">
              <span className="toast-badge">{profile.roleLabel} Guide</span>
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => {
                  setShowWelcomePrompt(false);
                  sessionStorage.setItem(sessionKey(userId, profile.id), "true");
                }}
                aria-label="Dismiss guide invitation"
              >
                <FiX />
              </button>
            </div>
            <strong>New here? Take a 1-min walkthrough</strong>
            <p>Learn key workflows and shortcuts tailored for your role.</p>

            <div className="toast-actions">
              <button
                type="button"
                className="toast-start-btn"
                onClick={() => {
                  setShowWelcomePrompt(false);
                  setIsOpen(true);
                  sendEvent("started", { stepIndex: 0 });
                }}
              >
                <FiZap />
                Start Walkthrough
              </button>
              <button
                type="button"
                className="toast-skip-btn"
                onClick={() => {
                  setShowWelcomePrompt(false);
                  sessionStorage.setItem(sessionKey(userId, profile.id), "true");
                }}
              >
                Explore on my own
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. MODERN FULL ONBOARDING HUB MODAL */}
      {isOpen && (
        <div
          className="onboarding-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-modal-title"
          style={customStyle}
        >
          <div
            className="onboarding-backdrop"
            onClick={() => handleClose(dontShowAgain ? "dont_show_again" : "skipped")}
          />

          <article className="onboarding-sheet">
            {/* Modal Header */}
            <header className="onboarding-header">
              <div className="header-left">
                <div className="role-avatar-badge">{profile.icon}</div>
                <div>
                  <div className="role-meta-row">
                    <span className="role-chip">{profile.roleLabel} Workspace</span>
                    <span className="step-counter">
                      {viewMode === "step" ? `Step ${stepIndex + 1} of ${profile.steps.length}` : "All Capabilities"}
                    </span>
                  </div>
                  <h2 id="onboarding-modal-title">{profile.tagline}</h2>
                </div>
              </div>

              <div className="header-right">
                <div className="view-mode-toggle" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "step"}
                    className={viewMode === "step" ? "active" : ""}
                    onClick={() => setViewMode("step")}
                    title="Step-by-step guided mode"
                  >
                    <FiList />
                    <span>Guided</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "overview"}
                    className={viewMode === "overview" ? "active" : ""}
                    onClick={() => setViewMode("overview")}
                    title="All capabilities overview"
                  >
                    <FiGrid />
                    <span>Overview</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="close-modal-btn"
                  onClick={() => handleClose(dontShowAgain ? "dont_show_again" : "skipped")}
                  aria-label="Close onboarding guide"
                >
                  <FiX />
                </button>
              </div>
            </header>

            {/* Modal Body */}
            <div className="onboarding-body">
              {viewMode === "step" ? (
                /* STEP-BY-STEP GUIDED VIEW */
                <section className="guided-step-container">
                  {/* Progress Indicator */}
                  <div className="step-pills-bar" aria-label="Step navigation">
                    {profile.steps.map((step, idx) => (
                      <button
                        key={step.id}
                        type="button"
                        className={`step-pill ${idx === stepIndex ? "active" : ""} ${idx < stepIndex ? "completed" : ""}`}
                        onClick={() => setStepIndex(idx)}
                        aria-label={`Jump to step ${idx + 1}: ${step.title}`}
                      >
                        <span className="pill-dot" />
                        <span className="pill-title">{step.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* Active Step Card */}
                  <div className="active-step-card">
                    <div className="step-card-header">
                      <div className="step-badge-group">
                        <span className="step-category-tag">{activeStep.category}</span>
                        <span className="step-number-tag">Step {stepIndex + 1}</span>
                      </div>
                      <div className="step-card-icon">{activeStep.icon}</div>
                    </div>

                    <h3>{activeStep.title}</h3>
                    <p className="step-summary">{activeStep.summary}</p>

                    <div className="highlights-box">
                      <strong>
                        <FiAward /> Key Capabilities & Highlights
                      </strong>
                      <ul>
                        {activeStep.highlights.map((item) => (
                          <li key={item}>
                            <FiCheck className="check-icon" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {activeStep.path && (
                      <div className="quick-action-bar">
                        <div className="path-indicator">
                          <FiMapPin />
                          <span>Direct workspace: {activeStep.path}</span>
                        </div>
                        <button
                          type="button"
                          className="open-workspace-btn"
                          onClick={() => handleNavigateToStep(activeStep.path)}
                        >
                          {activeStep.actionLabel || "Open this screen"}
                          <FiArrowRight />
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                /* OVERVIEW GRID VIEW */
                <section className="overview-grid-container">
                  <p className="overview-intro">{profile.description}</p>
                  <div className="overview-grid">
                    {profile.steps.map((step, idx) => (
                      <div
                        key={step.id}
                        className={`overview-card ${idx === stepIndex ? "highlighted" : ""}`}
                        onClick={() => {
                          setStepIndex(idx);
                          setViewMode("step");
                        }}
                      >
                        <div className="overview-card-top">
                          <span className="overview-icon">{step.icon}</span>
                          <span className="overview-step-tag">Step {idx + 1}</span>
                        </div>
                        <h4>{step.title}</h4>
                        <p>{step.summary}</p>
                        {step.path && (
                          <span className="overview-link">
                            {step.actionLabel || "View workflow"} <FiArrowRight />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Modal Footer */}
            <footer className="onboarding-footer">
              <label className="dont-show-checkbox">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
                <span>Don&apos;t show this guide automatically on login</span>
              </label>

              <div className="footer-actions">
                <button
                  type="button"
                  className="footer-skip-btn"
                  onClick={() => handleClose(dontShowAgain ? "dont_show_again" : "skipped")}
                >
                  Skip Tour
                </button>

                {viewMode === "step" && (
                  <div className="step-stepper-btns">
                    <button
                      type="button"
                      className="stepper-btn prev-btn"
                      onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                      disabled={stepIndex === 0}
                      aria-label="Previous step"
                    >
                      <FiChevronLeft />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      className="stepper-btn next-btn"
                      onClick={() => {
                        if (isLastStep) {
                          handleClose(dontShowAgain ? "dont_show_again" : "completed");
                          return;
                        }
                        setStepIndex((prev) => Math.min(profile.steps.length - 1, prev + 1));
                      }}
                    >
                      <span>{isLastStep ? "Finish Guide" : "Next Step"}</span>
                      {isLastStep ? <FiCheckCircle /> : <FiChevronRight />}
                    </button>
                  </div>
                )}
              </div>
            </footer>
          </article>
        </div>
      )}
    </>
  );
}

export function startRoleTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TOUR_EVENT));
  }
}
