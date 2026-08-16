import { type CSSProperties, type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiHelpCircle,
  FiMap,
  FiX,
} from "react-icons/fi";
import { FaBed, FaCapsules, FaFlask, FaUserInjured, FaUserNurse } from "react-icons/fa";

import { useAuthStore } from "../../store/authStore";
import { getTourStatus, recordTourEvent, type TourAction } from "../../services/onboardingService";

type TourStep = {
  title: string;
  body: string;
  detail: string;
  menu?: string;
  desktopTip?: string;
  mobileTip?: string;
  testTip?: string;
  actionLabel?: string;
  path?: string;
};

type TourProfile = {
  id: string;
  roleLabel: string;
  accent: string;
  icon: ReactElement;
  intro: string;
  steps: TourStep[];
};

const TOUR_EVENT = "mds:start-role-tour";
const TOUR_VERSION = "2026.08";

function hasRole(roles: string[], role: string) {
  return roles.some((item) => item.toLowerCase() === role.toLowerCase());
}

function getDeviceType(): "desktop" | "mobile" | "tablet" | "unknown" {
  if (typeof window === "undefined") return "unknown";
  const width = window.innerWidth;
  if (width <= 680) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function defaultDesktopTip(step: TourStep) {
  return step.path
    ? "On PC, use the left sidebar to open this menu. If the sidebar is collapsed, use the icons or expand it."
    : "On PC, use the left sidebar and top bar to move between the pages available to your role.";
}

function defaultMobileTip(step: TourStep) {
  return step.path
    ? "On mobile, use the bottom app menu. If the page has tabs or cards, scroll gently and tap the action you need."
    : "On mobile, use the bottom navigation first, then the page buttons and tabs for the detailed actions.";
}

function defaultTestTip() {
  return "During this test version, try the buttons with sample records and tell admin if a label or workflow is confusing.";
}

function menuNameForPath(path?: string) {
  if (!path) return "Role menu";
  if (path.startsWith("/doctor")) return "Doctor menu";
  if (path.startsWith("/nurse")) return "Nurse menu";
  if (path.startsWith("/security")) return "Security menu";
  if (path.startsWith("/laboratory")) return "Clinical > Laboratory";
  if (path.startsWith("/pharmacy")) return "Clinical > Pharmacy";
  if (path.startsWith("/admin")) return "Administration";
  if (path.startsWith("/setup")) return "Setup";
  if (path.startsWith("/desk-office")) return "Operations > Desk Office";
  if (path.startsWith("/inventory")) return "Operations > Inventory";
  if (path.startsWith("/billing")) return "Operations > Billing";
  if (path.startsWith("/appointments")) return "Appointments";
  if (path.startsWith("/patients") || path.startsWith("/register-patient")) return "Patients";
  if (path.startsWith("/dashboard")) return "Dashboard";
  return "Role menu";
}

const profileMap: TourProfile[] = [
  {
    id: "super-admin",
    roleLabel: "Super Admin",
    accent: "#2563eb",
    icon: <FiMap />,
    intro: "This tour shows the command areas you will use to control the hospital system.",
    steps: [
      {
        title: "Start from the dashboard",
        body: "Use the dashboard to see patients, staff, claims, services, and operational activity at a glance.",
        detail: "Numbers update from the live system so you can quickly notice what needs attention.",
        path: "/dashboard",
        actionLabel: "Open dashboard",
      },
      {
        title: "Manage users and access",
        body: "Create staff accounts, assign roles, generate passwords, and print employee ID cards from Administration.",
        detail: "Give each user only the access they need for their department.",
        path: "/admin/users",
        actionLabel: "Open users",
      },
      {
        title: "Set up hospital services",
        body: "Add service areas, insurance providers, wards, beds, and other settings used by clinical and billing teams.",
        detail: "Clean setup makes registration, billing, claims, and reporting easier later.",
        path: "/setup/services",
        actionLabel: "Open setup",
      },
      {
        title: "Review departments",
        body: "Check pharmacy, laboratory, inventory, SEMSAS, desk office claims, and security activity from their menus.",
        detail: "Each module keeps its own records while still feeding the main admin view.",
      },
    ],
  },
  {
    id: "doctor",
    roleLabel: "Doctor",
    accent: "#0ea5e9",
    icon: <FaUserInjured />,
    intro: "This tour helps doctors move from appointment to clinical action without searching around.",
    steps: [
      {
        title: "Begin with your appointment queue",
        body: "Appointments show the patients assigned to you by reception.",
        detail: "Select a patient to open their clinical workspace and start reviewing their details.",
        path: "/doctor/appointments",
        actionLabel: "Open queue",
      },
      {
        title: "Review patient history",
        body: "Check the patient profile, previous notes, lab requests, test results, prescriptions, and ward history.",
        detail: "This keeps decisions connected across departments.",
        path: "/doctor/patients",
        actionLabel: "Open patients",
      },
      {
        title: "Write clinical notes",
        body: "Record complaints, examination findings, diagnosis, plan, and follow-up remarks.",
        detail: "Saved notes remain available for later viewing and can be printed when needed.",
        path: "/doctor/notes",
        actionLabel: "Open notes",
      },
      {
        title: "Request next steps",
        body: "Request lab tests, prescribe medicine, request admission or ward review, and prepare referrals.",
        detail: "The relevant department can act on your request from their own workspace.",
      },
      {
        title: "Use reminders",
        body: "Add reminders for follow-ups, reviews, and tasks that should not be missed.",
        detail: "Important reminders can work with the notification system as we expand it.",
        path: "/doctor/reminders",
        actionLabel: "Open reminders",
      },
    ],
  },
  {
    id: "nurse",
    roleLabel: "Nurse",
    accent: "#14b8a6",
    icon: <FaUserNurse />,
    intro: "This tour explains the nursing workflow for ward patients, medication rounds, vitals, and notes.",
    steps: [
      {
        title: "Check your nursing desk",
        body: "The nurse dashboard summarizes assigned patients, ward activity, medication tasks, and reminders.",
        detail: "It is designed to work well on phones and tablets during rounds.",
        path: "/nurse",
        actionLabel: "Open nurse desk",
      },
      {
        title: "View patients and ID cards",
        body: "Open the patient list to identify patients, view ID cards, and confirm ward status.",
        detail: "If a patient is admitted, the ward or bed information should be visible from the patient context.",
        path: "/nurse/patients",
        actionLabel: "Open patients",
      },
      {
        title: "Handle medication rounds",
        body: "Use medication rounds to know what medicine is due, dose, route, frequency, and timing.",
        detail: "After administration, record your initials so the digital chart replaces the paper signing process.",
        path: "/nurse/medications",
        actionLabel: "Open meds",
      },
      {
        title: "Record vitals and notes",
        body: "Capture vitals, nursing notes, and updates that doctors and other nurses need to see.",
        detail: "Clear notes reduce handover mistakes.",
        path: "/nurse/vitals",
        actionLabel: "Open vitals",
      },
    ],
  },
  {
    id: "reception",
    roleLabel: "Reception and Cashier",
    accent: "#f59e0b",
    icon: <FiCheckCircle />,
    intro: "This tour covers front desk actions for patient flow, appointments, and billing support.",
    steps: [
      {
        title: "Register patients correctly",
        body: "Use Register Patient for new patients, investigation patients, old patients, and reactivated patients.",
        detail: "Reception handles hospital registration while lab can handle investigation-only patients where allowed.",
        path: "/register-patient",
        actionLabel: "Register patient",
      },
      {
        title: "Find patients fast",
        body: "Search by MRN, name, phone, email, or policy number from the patient list.",
        detail: "Use the ID card button when a patient needs a printable card or QR verification.",
        path: "/patients",
        actionLabel: "Open patients",
      },
      {
        title: "Schedule appointments",
        body: "Book and manage appointments, then assign patients to doctors.",
        detail: "Doctors see assigned patients from their own dashboard.",
        path: "/appointments",
        actionLabel: "Open appointments",
      },
      {
        title: "Support billing flow",
        body: "Use billing to select services and create invoices when payment is needed.",
        detail: "Insurance and service setup help make billing easier and more consistent.",
        path: "/billing",
        actionLabel: "Open billing",
      },
    ],
  },
  {
    id: "laboratory",
    roleLabel: "Laboratory",
    accent: "#7c3aed",
    icon: <FaFlask />,
    intro: "This tour explains lab requests, sample work, templates, and result reporting.",
    steps: [
      {
        title: "Review lab requests",
        body: "Open Laboratory to see requested tests and patient information.",
        detail: "Requests can come from doctors and should be processed with clear status updates.",
        path: "/laboratory",
        actionLabel: "Open lab",
      },
      {
        title: "Use result templates",
        body: "Select the correct template for the test and fill only the result fields.",
        detail: "Templates keep reports professional and consistent.",
        path: "/laboratory",
        actionLabel: "Open results",
      },
      {
        title: "Manage templates separately",
        body: "Lab administrators can open Lab Templates to create or update templates.",
        detail: "Doctors can request tests but should not edit lab templates.",
        path: "/laboratory/templates",
        actionLabel: "Open templates",
      },
      {
        title: "Notify when done",
        body: "When a result is completed, the relevant team can be notified and the result becomes available for review.",
        detail: "This reduces waiting and phone calls between departments.",
      },
    ],
  },
  {
    id: "pharmacy",
    roleLabel: "Pharmacy",
    accent: "#16a34a",
    icon: <FaCapsules />,
    intro: "This tour helps pharmacy staff manage medicine, stock, sales, invoices, and patient dispensing.",
    steps: [
      {
        title: "Search medicine quickly",
        body: "Use Pharmacy to search inventory and select medicines for a patient.",
        detail: "Keep names, prices, and stock levels clear so dispensing is fast.",
        path: "/pharmacy",
        actionLabel: "Open pharmacy",
      },
      {
        title: "Sell to a patient",
        body: "Choose the patient, add items, confirm quantities, and complete the sale.",
        detail: "The invoice should show patient details, medicine items, totals, and MDS branding.",
        path: "/pharmacy",
        actionLabel: "Start sale",
      },
      {
        title: "Watch stock movement",
        body: "Stock added or removed should be recorded with useful notes.",
        detail: "Important inventory changes can notify admin.",
        path: "/inventory",
        actionLabel: "Open inventory",
      },
      {
        title: "Print receipts",
        body: "After billing or sale, print a clean receipt for the patient.",
        detail: "The receipt should be easy to read and suitable for records.",
      },
    ],
  },
  {
    id: "security",
    roleLabel: "Security",
    accent: "#ef4444",
    icon: <FiCheckCircle />,
    intro: "This tour is built for phone use at the gate so visitor entry is quick and clear.",
    steps: [
      {
        title: "Log each entry",
        body: "Select whether the person is a patient, patient relative, staff, or guest.",
        detail: "For emergencies, patient name and phone can be completed later.",
        path: "/security/entry",
        actionLabel: "Open entry",
      },
      {
        title: "Use staff ID lookup",
        body: "For staff, enter or scan the staff ID to auto-fill verified staff details.",
        detail: "This avoids typing mistakes at the entrance.",
        path: "/security/entry",
        actionLabel: "Check staff",
      },
      {
        title: "Capture photo when needed",
        body: "Add an optional photo for visitors, relatives, guests, and patient arrivals.",
        detail: "Keep photos light so mobile data and storage stay manageable.",
      },
      {
        title: "Check time in and time out",
        body: "Use All Entries to see who is still inside and mark time out when they leave.",
        detail: "Long visits show day badges such as +1 day or +2 days.",
        path: "/security/logs",
        actionLabel: "Open logs",
      },
    ],
  },
  {
    id: "desk-office",
    roleLabel: "Desk Office",
    accent: "#0891b2",
    icon: <FiMap />,
    intro: "This tour covers insurance claims and desk office follow-up work.",
    steps: [
      {
        title: "Start with claims summary",
        body: "Use Desk Office to see insurance claim totals and pending work.",
        detail: "The dashboard helps you know which insurer needs attention.",
        path: "/desk-office",
        actionLabel: "Open claims",
      },
      {
        title: "Select the insurance",
        body: "Choose the insurance provider before entering claim details.",
        detail: "This keeps claims grouped correctly for reporting.",
        path: "/desk-office",
        actionLabel: "Add claim",
      },
      {
        title: "Record claimed and provided amounts",
        body: "Enter amount claimed, amount provided, date, and a short note.",
        detail: "Keep notes simple and useful for later reconciliation.",
      },
      {
        title: "Review claim history",
        body: "Use the list to check previous submissions and payment differences.",
        detail: "This helps the hospital track insurance performance clearly.",
      },
    ],
  },
];

function getTourProfile(roles: string[]): TourProfile {
  if (hasRole(roles, "Super Admin") || hasRole(roles, "Administrator")) return profileMap[0];
  if (hasRole(roles, "Doctor")) return profileMap[1];
  if (hasRole(roles, "Nurse")) return profileMap[2];
  if (hasRole(roles, "Receptionist") || hasRole(roles, "Billing Officer") || hasRole(roles, "Cashier")) {
    return profileMap[3];
  }
  if (hasRole(roles, "Laboratory")) return profileMap[4];
  if (hasRole(roles, "Pharmacist") || hasRole(roles, "Pharmacy")) return profileMap[5];
  if (hasRole(roles, "Security")) return profileMap[6];
  if (hasRole(roles, "Desk Office")) return profileMap[7];

  return {
    id: "general",
    roleLabel: roles[0] ?? "Care Team",
    accent: "#2563eb",
    icon: <FiHelpCircle />,
    intro: "This tour introduces the main areas available to your account.",
    steps: [
      {
        title: "Use the menu",
        body: "Your sidebar and mobile bottom navigation only show areas your role can access.",
        detail: "If something is missing, ask an administrator to review your permissions.",
      },
      {
        title: "Search before creating",
        body: "Search patients and records before adding new information.",
        detail: "This helps avoid duplicate records.",
      },
      {
        title: "Keep records clear",
        body: "Use short, accurate notes and fill required fields carefully.",
        detail: "Good records help every department work faster.",
      },
    ],
  };
}

function hiddenKey(userId: string, profileId: string) {
  return `mds:role-tour:hidden:${userId}:${profileId}`;
}

function sessionKey(userId: string, profileId: string) {
  return `mds:role-tour:session:${userId}:${profileId}`;
}

export default function RoleTour() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const profile = useMemo(() => getTourProfile(roles), [roles]);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const userId = user?.id ?? "guest";
  const activeStep = profile.steps[stepIndex];
  const isLastStep = stepIndex === profile.steps.length - 1;

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const permanentHidden = localStorage.getItem(hiddenKey(user.id, profile.id)) === "true";
    const seenThisSession = sessionStorage.getItem(sessionKey(user.id, profile.id)) === "true";

    if (!permanentHidden && !seenThisSession) {
      const timer = window.setTimeout(() => {
        setOpen(true);
        setStepIndex(0);
      }, 700);

      return () => window.clearTimeout(timer);
    }
  }, [profile.id, user?.id]);

  useEffect(() => {
    const startTour = () => {
      setDontShowAgain(false);
      setStepIndex(0);
      setOpen(true);
    };

    window.addEventListener(TOUR_EVENT, startTour);

    return () => window.removeEventListener(TOUR_EVENT, startTour);
  }, []);

  const closeTour = (savePreference: boolean) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(sessionKey(userId, profile.id), "true");

      if (savePreference || dontShowAgain) {
        localStorage.setItem(hiddenKey(userId, profile.id), "true");
      }
    }

    setOpen(false);
  };

  const goToStepPath = () => {
    if (!activeStep.path) return;
    navigate(activeStep.path);
    closeTour(false);
  };

  if (!open || !user) return null;

  return (
    <div className="role-tour-overlay" role="dialog" aria-modal="true" aria-labelledby="role-tour-title">
      <div className="role-tour-backdrop" onClick={() => closeTour(false)} />

      <section className="role-tour-card" style={{ "--tour-accent": profile.accent } as CSSProperties}>
        <button
          type="button"
          className="role-tour-close"
          onClick={() => closeTour(false)}
          aria-label="Close tour"
        >
          <FiX />
        </button>

        <div className="role-tour-hero">
          <span className="role-tour-icon">{profile.icon}</span>
          <div>
            <p>Guided tour</p>
            <h2 id="role-tour-title">{profile.roleLabel} workspace</h2>
            <span>{profile.intro}</span>
          </div>
        </div>

        <div className="role-tour-progress" aria-label={`Step ${stepIndex + 1} of ${profile.steps.length}`}>
          {profile.steps.map((step, index) => (
            <button
              type="button"
              key={step.title}
              className={index === stepIndex ? "active" : ""}
              onClick={() => setStepIndex(index)}
              aria-label={`Go to step ${index + 1}: ${step.title}`}
            />
          ))}
        </div>

        <article className="role-tour-step">
          <small>
            Step {stepIndex + 1} of {profile.steps.length}
          </small>
          <h3>{activeStep.title}</h3>
          <p>{activeStep.body}</p>
          <div>
            <FiCheckCircle />
            <span>{activeStep.detail}</span>
          </div>
        </article>

        <label className="role-tour-preference">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          <span>Don&apos;t show this tour again for my account.</span>
        </label>

        <div className="role-tour-actions">
          <button
            type="button"
            className="role-tour-secondary"
            onClick={() => closeTour(dontShowAgain)}
          >
            Skip for now
          </button>

          <div>
            <button
              type="button"
              className="role-tour-icon-btn"
              onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
              disabled={stepIndex === 0}
              aria-label="Previous tour step"
            >
              <FiChevronLeft />
            </button>

            {activeStep.path && (
              <button type="button" className="role-tour-path-btn" onClick={goToStepPath}>
                {activeStep.actionLabel ?? "Open page"}
                <FiArrowRight />
              </button>
            )}

            <button
              type="button"
              className="role-tour-primary"
              onClick={() => {
                if (isLastStep) {
                  closeTour(dontShowAgain);
                  return;
                }

                setStepIndex((current) => Math.min(current + 1, profile.steps.length - 1));
              }}
            >
              {isLastStep ? "Finish tour" : "Next"}
              {!isLastStep && <FiChevronRight />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function startRoleTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT));
}
