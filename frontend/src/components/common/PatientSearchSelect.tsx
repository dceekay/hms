import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiCreditCard,
  FiLoader,
  FiPhone,
  FiPlus,
  FiSearch,
  FiUser,
  FiX,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import type { Patient } from "../../types/patient";
import { fetchPatients } from "../../services/patients/patientService";
import "../../styles/patient-search-select.css";

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
  return age > 0 ? `${age}y` : "Infant";
}

export default function PatientSearchSelect({
  patients,
  selectedPatientId,
  onSelectPatient,
  placeholder = "Search by name, P-File No., MRN, or phone...",
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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close (desktop dropdown)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (patient: Patient) => {
    onSelectPatient(patient);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPatient(null);
    setSearchQuery("");
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

  return (
    <div
      ref={containerRef}
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
              <FiX />
            </button>
          )}
          <FiChevronDown className={`chevron-icon ${isOpen ? "rotate" : ""}`} />
        </div>
      </div>

      {error && <span className="field-error-text">{error}</span>}

      {/* Dropdown / Mobile Bottom-Sheet */}
      {isOpen && (
        <>
          <div
            className="patient-picker-backdrop"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="patient-picker-popover"
            role="listbox"
            aria-label="Patients list"
          >
            {/* Sheet Handle for Mobile */}
            <div className="mobile-sheet-handle" />

            <div className="picker-header">
              <div className="picker-header-title">
                <FiUser />
                <span>Select Patient</span>
                <span className="picker-count-badge">
                  {filteredPatients.length} found
                </span>
              </div>
              <button
                type="button"
                className="picker-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close patient picker"
              >
                <FiX />
              </button>
            </div>

            {/* Search Field */}
            <div className="picker-search-wrapper">
              <FiSearch className="search-input-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="picker-search-input"
                placeholder="Type name, MRN (e.g. MRN-001), or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {isSearchingRemote && (
                <div className="picker-search-spinner" title="Searching database...">
                  <FiLoader className="spin" />
                </div>
              )}
              {searchQuery && !isSearchingRemote && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                >
                  <FiX />
                </button>
              )}
            </div>

            {/* Patient Cards List */}
            <div ref={listRef} className="picker-list">
              {filteredPatients.length === 0 ? (
                <div className="picker-empty-state">
                  <div className="empty-icon-wrap">
                    <FiUser />
                  </div>
                  <strong>No patients matched your search</strong>
                  <p>Check spelling or register a new patient profile.</p>
                  <Link
                    to="/register-patient"
                    className="picker-new-patient-btn"
                    onClick={() => setIsOpen(false)}
                  >
                    <FiPlus /> Register New Patient
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
                        <div className="patient-row-name-line">
                          <strong className="patient-name">
                            {highlightMatch(`${patient.firstName} ${patient.lastName}`.trim(), searchQuery)}
                          </strong>
                          {patient.physicalFileNumber && (
                            <span className="patient-pfile-chip" title="Physical File / Folder Number">
                              📁 {highlightMatch(patient.physicalFileNumber, searchQuery)}
                            </span>
                          )}
                          {patient.mrn && (
                            <span className="patient-mrn-chip">
                              {highlightMatch(patient.mrn, searchQuery)}
                            </span>
                          )}
                        </div>

                        <div className="patient-row-subtext">
                          {patient.phone && (
                            <span className="subtext-item phone-subtext">
                              <FiPhone /> {highlightMatch(patient.phone, searchQuery)}
                            </span>
                          )}
                          {patient.gender && (
                            <span className="subtext-item">
                              {patient.gender}
                              {patient.dateOfBirth && ` • ${calculateAge(patient.dateOfBirth)}`}
                            </span>
                          )}
                          {(patient.insuranceProvider || patient.insurancePolicyNumber) && (
                            <span className="subtext-item insurance-tag">
                              <FiCreditCard /> {patient.insuranceProvider?.name || "HMO"}{patient.insurancePolicyNumber ? ` (${patient.insurancePolicyNumber})` : ""}
                            </span>
                          )}
                        </div>
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
                <FiPlus /> New Patient Registration
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
