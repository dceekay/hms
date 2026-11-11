import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiClock,
  FiCreditCard,
  FiLoader,
  FiPhone,
  FiPlus,
  FiSearch,
  FiUser,
  FiX,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from "@floating-ui/react";
import type { Patient } from "../../types/patient";
import { fetchPatients } from "../../services/patients/patientService";
import "../../styles/patient-search-select.css";

const RECENT_PATIENTS_STORAGE_KEY = "hms_recent_patients_v1";

export interface PatientSearchSelectProps {
  patients: Patient[];
  selectedPatientId?: string | null;
  onSelectPatient: (patient: Patient | null) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function highlightMatch(text?: string | null, query?: string) {
  if (!text) return "";
  const q = query?.trim();
  if (!q) return text;

  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="patient-search-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

export function formatPatientDisplay(patient: Patient): string {
  const name = `${patient.firstName} ${patient.lastName}`.trim();
  const pFile = patient.physicalFileNumber ? `[P-File: ${patient.physicalFileNumber}]` : "";
  const mrn = patient.mrn ? `(${patient.mrn})` : "";
  const phone = patient.phone ? `• ${patient.phone}` : "";
  return [name, pFile, mrn, phone].filter(Boolean).join(" ");
}

export function calculateAge(dob?: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? `${age} yrs` : "Under 1 yr";
}

export function formatDob(dob?: string | null): string {
  if (!dob) return "—";
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function genderLabel(gender?: string | null): string {
  if (!gender) return "—";
  const g = gender.toLowerCase();
  if (g === "male" || g === "m") return "Male";
  if (g === "female" || g === "f") return "Female";
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

function getStoredRecentPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(RECENT_PATIENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeRecentPatient(patient: Patient) {
  try {
    const current = getStoredRecentPatients();
    const updated = [patient, ...current.filter((p) => p.id !== patient.id)].slice(0, 8);
    localStorage.setItem(RECENT_PATIENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore localStorage errors
  }
}

export default function PatientSearchSelect({
  patients,
  selectedPatientId,
  onSelectPatient,
  placeholder = "Click here to find a patient (name, file no., MRN or phone)",
  label,
  error,
  disabled = false,
  required = false,
  allowClear = true,
  className = "",
}: PatientSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [remotePatients, setRemotePatients] = useState<Patient[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Monitor viewport size for mobile sheet vs desktop popover
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Floating UI positioning for desktop
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen && !isMobile,
    onOpenChange: setIsOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 12 }),
      shift({ padding: 12 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${Math.max(rects.reference.width, 520)}px`,
            maxWidth: "96vw",
          });
        },
      }),
    ],
  });

  const dismiss = useDismiss(context, { outsidePress: true });
  const role = useRole(context, { role: "listbox" });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

  // Load recent patients when opened
  useEffect(() => {
    if (isOpen) {
      setRecentPatients(getStoredRecentPatients());
    }
  }, [isOpen]);

  // Combine parent-provided patients with remote search results
  const mergedPatients = useMemo(() => {
    if (remotePatients.length === 0) return patients;
    const map = new Map<string, Patient>();
    for (const p of patients) map.set(p.id, p);
    for (const p of remotePatients) map.set(p.id, p);
    return Array.from(map.values());
  }, [patients, remotePatients]);

  const selectedPatient = useMemo(
    () => mergedPatients.find((p) => p.id === selectedPatientId) ?? null,
    [mergedPatients, selectedPatientId]
  );

  // Asynchronous remote search for patients when typing
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemotePatients([]);
      setIsSearchingRemote(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        const results = await fetchPatients({ search: q, take: 40 });
        if (results && results.length > 0) {
          setRemotePatients(results);
        }
      } catch (err) {
        console.error("Live patient search fallback:", err);
      } finally {
        setIsSearchingRemote(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mergedPatients.slice(0, 60);

    return mergedPatients
      .filter((patient) => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const mrn = (patient.mrn ?? "").toLowerCase();
        const pFile = (patient.physicalFileNumber ?? "").toLowerCase();
        const phone = (patient.phone ?? "").toLowerCase();
        const email = (patient.email ?? "").toLowerCase();
        const insurance = (patient.insuranceProvider?.name ?? "").toLowerCase();
        const policy = (patient.insurancePolicyNumber ?? "").toLowerCase();
        return (
          fullName.includes(q) ||
          mrn.includes(q) ||
          pFile.includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          insurance.includes(q) ||
          policy.includes(q)
        );
      })
      .slice(0, 60);
  }, [mergedPatients, searchQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Scroll active item into view when navigating with keys
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector(".patient-row-card.highlighted") as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (patient: Patient) => {
    storeRecentPatient(patient);
    onSelectPatient(patient);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPatient(null);
    setSearchQuery("");
  };

  const clearRecentHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(RECENT_PATIENTS_STORAGE_KEY);
      setRecentPatients([]);
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredPatients.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && filteredPatients[highlightedIndex]) {
      e.preventDefault();
      handleSelect(filteredPatients[highlightedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const popoverContent = (
    <>
      {/* Mobile Backdrop */}
      {isMobile && (
        <div
          className="patient-picker-backdrop"
          style={{ display: "block" }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        ref={isMobile ? undefined : refs.setFloating}
        style={isMobile ? undefined : floatingStyles}
        {...(!isMobile ? getFloatingProps() : {})}
        className={`patient-picker-popover ${isMobile ? "mobile-sheet" : ""}`}
        role="listbox"
        aria-label="Patients list"
      >
        {/* Sheet Handle for Mobile */}
        <div className="mobile-sheet-handle" />

        <div className="picker-header">
          <div className="picker-header-title">
            <FiUser />
            <span>Find a patient</span>
            <span className="picker-count-badge">
              {filteredPatients.length} found
            </span>
          </div>
          <button
            type="button"
            className="picker-close-btn modal-close-btn"
            style={{ display: isMobile ? "flex" : "none" }}
            onClick={() => setIsOpen(false)}
            aria-label="Close patient picker"
            title="Close"
          >
            <FiX size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Search Field */}
        <div className="picker-search-wrapper">
          <FiSearch className="search-input-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="picker-search-input"
            placeholder="Type the patient's name, file no., MRN or phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {isSearchingRemote && (
            <div className="picker-search-spinner" title="Searching...">
              <FiLoader className="spin" />
            </div>
          )}
          {searchQuery && !isSearchingRemote && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search query"
              title="Clear search"
            >
              <FiX size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Recent Patients Quick Shelf (Visible when search query is empty) */}
        {!searchQuery.trim() && recentPatients.length > 0 && (
          <div className="picker-recent-section">
            <div className="picker-recent-header">
              <span>
                <FiClock style={{ marginRight: 4 }} /> Recently chosen
              </span>
              <button
                type="button"
                className="picker-recent-clear-btn"
                onClick={clearRecentHistory}
                title="Clear recent history"
              >
                Clear
              </button>
            </div>
            <div className="picker-recent-chips">
              {recentPatients.map((rp) => (
                <button
                  key={rp.id}
                  type="button"
                  className="picker-recent-chip"
                  onClick={() => handleSelect(rp)}
                  title={`Select ${rp.firstName} ${rp.lastName}`}
                >
                  <FiUser size={12} />
                  <span>
                    {rp.firstName} {rp.lastName}
                  </span>
                  {rp.mrn && <span className="patient-mrn-chip">{rp.mrn}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Patient Cards List */}
        <div ref={listRef} className="picker-list">
          {filteredPatients.length === 0 ? (
            <div className="picker-empty-state">
              <div className="empty-icon-wrap">
                <FiUser />
              </div>
              <strong>No patient found</strong>
              <p>Check the spelling, or register the patient as new.</p>
              <Link
                to="/register-patient"
                className="picker-new-patient-btn"
                onClick={() => setIsOpen(false)}
              >
                <FiPlus /> Register new patient
              </Link>
            </div>
          ) : (
            filteredPatients.map((patient, index) => {
              const isSelected = patient.id === selectedPatientId;
              const isHighlighted = index === highlightedIndex;
              const initials = `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`.toUpperCase();

              return (
                <div
                  key={patient.id}
                  className={`patient-row-card ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
                  onClick={() => handleSelect(patient)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="patient-avatar-circle">
                    {initials || <FiUser />}
                  </div>

                  <div className="patient-row-info">
                    <strong className="patient-full-name">
                      {highlightMatch(`${patient.firstName} ${patient.lastName}`.trim(), searchQuery)}
                    </strong>

                    <dl className="patient-detail-grid">
                      <div>
                        <dt>File No.</dt>
                        <dd>{patient.physicalFileNumber ? highlightMatch(patient.physicalFileNumber, searchQuery) : "—"}</dd>
                      </div>
                      <div>
                        <dt>MRN</dt>
                        <dd>{patient.mrn ? highlightMatch(patient.mrn, searchQuery) : "—"}</dd>
                      </div>
                      <div>
                        <dt>Age</dt>
                        <dd>{calculateAge(patient.dateOfBirth) || "—"}</dd>
                      </div>
                      <div>
                        <dt>Gender</dt>
                        <dd>{genderLabel(patient.gender)}</dd>
                      </div>
                      <div>
                        <dt>Date of birth</dt>
                        <dd>{formatDob(patient.dateOfBirth)}</dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{patient.phone ? highlightMatch(patient.phone, searchQuery) : "—"}</dd>
                      </div>
                    </dl>

                    {(patient.insuranceProvider || patient.insurancePolicyNumber) && (
                      <span className="subtext-item insurance-tag">
                        <FiCreditCard /> {patient.insuranceProvider?.name || "HMO"}
                        {patient.insurancePolicyNumber ? ` (${patient.insurancePolicyNumber})` : ""}
                      </span>
                    )}

                    <span className="patient-pick-hint">{isSelected ? "Selected" : "Click to choose this patient"}</span>
                  </div>

                  {isSelected && (
                    <div className="check-icon-wrap">
                      <FiCheck />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Action */}
        <div className="picker-footer">
          <Link
            to="/register-patient"
            className="picker-footer-link"
            onClick={() => setIsOpen(false)}
          >
            <FiPlus /> Register new patient
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`patient-search-select-container ${className} ${disabled ? "disabled" : ""} ${error ? "has-error" : ""}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label className="patient-select-label">
          {label} {required && <span className="required-star">*</span>}
        </label>
      )}

      {/* Main Trigger Button */}
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className={`patient-select-trigger ${isOpen ? "open" : ""} ${selectedPatient ? "has-value" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
      >
        <div className="trigger-icon-wrap">
          <FiUser className="trigger-user-icon" />
        </div>

        <div className="trigger-content">
          {selectedPatient ? (
            <div className="selected-patient-preview">
              <span className="selected-patient-name">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </span>
              <div className="selected-patient-meta">
                {selectedPatient.mrn && (
                  <span className="mrn-badge">{selectedPatient.mrn}</span>
                )}
                {selectedPatient.phone && (
                  <span className="phone-tag">
                    <FiPhone /> {selectedPatient.phone}
                  </span>
                )}
                {selectedPatient.gender && (
                  <span className="gender-tag">
                    {selectedPatient.gender}
                    {selectedPatient.dateOfBirth && ` • ${calculateAge(selectedPatient.dateOfBirth)}`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="placeholder-text">{placeholder}</span>
          )}
        </div>

        <div className="trigger-actions">
          {allowClear && selectedPatient && !disabled && (
            <button
              type="button"
              className="clear-selection-btn"
              onClick={handleClear}
              title="Clear selection"
              aria-label="Clear selected patient"
            >
              <FiX size={16} strokeWidth={2.5} />
            </button>
          )}
          <FiChevronDown className={`chevron-icon ${isOpen ? "rotate" : ""}`} />
        </div>
      </div>

      {error && <span className="field-error-text">{error}</span>}

      {/* Dropdown / Mobile Bottom-Sheet */}
      {isOpen && (
        <FloatingPortal>
          {popoverContent}
        </FloatingPortal>
      )}
    </div>
  );
}
