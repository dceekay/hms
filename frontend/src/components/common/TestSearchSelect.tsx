import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
  FiLayers,
} from "react-icons/fi";
import { FaFlask } from "react-icons/fa";
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
import type { LaboratoryTemplate } from "../../types/laboratory";
import "../../styles/app-pickers.css";

export interface TestSearchSelectProps {
  templates: LaboratoryTemplate[];
  mode?: "single" | "multi";
  // Single mode props
  selectedTemplateId?: string | null;
  onSelectTemplate?: (template: LaboratoryTemplate | null) => void;
  // Multi mode props
  selectedTemplateIds?: string[];
  onToggleTemplate?: (template: LaboratoryTemplate) => void;
  onClearMulti?: () => void;
  // Common UI props
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  className?: string;
  id?: string;
}

function getSpecimenColorClass(specimen?: string | null): string {
  if (!specimen) return "general";
  const s = specimen.toLowerCase();
  if (s.includes("edta") || s.includes("whole blood")) return "edta";
  if (s.includes("serum") || s.includes("plain") || s.includes("clot")) return "serum";
  if (s.includes("urine")) return "urine";
  if (s.includes("fluoride") || s.includes("plasma")) return "fluoride";
  if (s.includes("swab")) return "swab";
  if (s.includes("stool")) return "stool";
  return "general";
}

function highlightSearchMatch(text?: string | null, query?: string) {
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

const COMMON_QUICK_SEARCHES = [
  { label: "FBC", query: "fbc" },
  { label: "Malaria (MP)", query: "malaria" },
  { label: "PCV", query: "pcv" },
  { label: "Widal", query: "widal" },
  { label: "Urinalysis", query: "urinalysis" },
  { label: "Blood Sugar", query: "sugar" },
  { label: "Genotype", query: "genotype" },
  { label: "LFT", query: "lft" },
];

export default function TestSearchSelect({
  templates,
  mode = "single",
  selectedTemplateId,
  onSelectTemplate,
  selectedTemplateIds = [],
  onToggleTemplate,
  onClearMulti,
  label,
  placeholder,
  error,
  disabled = false,
  required = false,
  allowClear = true,
  className = "",
  id,
}: TestSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
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

  // Floating UI Setup
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
            width: `${Math.max(rects.reference.width, 440)}px`,
            maxWidth: "96vw",
          });
        },
      }),
    ],
  });

  const dismiss = useDismiss(context, { outsidePress: true });
  const role = useRole(context, { role: "listbox" });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (t.category?.trim()) {
        set.add(t.category.trim());
      }
    }
    return ["All", ...Array.from(set).sort()];
  }, [templates]);

  // Active single selection
  const selectedTemplate = useMemo(() => {
    if (mode !== "single" || !selectedTemplateId) return null;
    return templates.find((t) => t.id === selectedTemplateId) ?? null;
  }, [mode, selectedTemplateId, templates]);

  // Multi selected items
  const selectedMultiTemplates = useMemo(() => {
    if (mode !== "multi") return [];
    return templates.filter((t) => selectedTemplateIds.includes(t.id));
  }, [mode, selectedTemplateIds, templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((t) => {
      // Category filter
      if (activeCategory !== "All" && t.category !== activeCategory) {
        return false;
      }

      // Search match
      if (!q) return true;
      const name = t.name.toLowerCase();
      const code = (t.code ?? "").toLowerCase();
      const specimen = (t.specimen ?? "").toLowerCase();
      const category = (t.category ?? "").toLowerCase();
      const fieldsMatch = t.fields?.some((f) =>
        f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q)
      );

      return (
        name.includes(q) ||
        code.includes(q) ||
        specimen.includes(q) ||
        category.includes(q) ||
        fieldsMatch
      );
    });
  }, [templates, activeCategory, searchQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, activeCategory]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
    } else {
      setSearchQuery("");
      setActiveCategory("All");
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector(".test-picker-row.highlighted") as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectTemplate = (template: LaboratoryTemplate) => {
    if (mode === "single") {
      onSelectTemplate?.(template);
      setIsOpen(false);
    } else {
      onToggleTemplate?.(template);
    }
  };

  const handleClearSingle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTemplate?.(null);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClearMulti?.();
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
        prev < filteredTemplates.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && filteredTemplates[highlightedIndex]) {
      e.preventDefault();
      handleSelectTemplate(filteredTemplates[highlightedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const defaultPlaceholder =
    placeholder ||
    (mode === "multi"
      ? "Search & choose diagnostic tests for order basket..."
      : "Search test by name, code (FBC, MP, LFT), or specimen...");

  const isTestSelected = (id: string) => {
    if (mode === "single") return selectedTemplateId === id;
    return selectedTemplateIds.includes(id);
  };

  const popoverContent = (
    <>
      {isMobile && (
        <div
          className="app-picker-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        ref={isMobile ? undefined : refs.setFloating}
        style={isMobile ? undefined : floatingStyles}
        {...(!isMobile ? getFloatingProps() : {})}
        className="app-picker-popover test-search-popover"
        role="dialog"
        aria-label="Diagnostic test catalog"
      >
        <div className="app-picker-mobile-handle" />

        {/* Header */}
        <div className="app-picker-header">
          <div className="app-picker-title">
            <FaFlask color="var(--picker-primary)" />
            <span>
              {mode === "multi" ? "Laboratory Order Basket" : "Diagnostic Test Catalog"}
            </span>
            <span className="picker-count-badge" style={{ fontSize: "0.72rem" }}>
              {filteredTemplates.length} tests
            </span>
          </div>
          <button
            type="button"
            className="app-picker-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close test chooser"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="test-picker-search-bar">
          <FiSearch className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="test-picker-search-input"
            placeholder="Type test name, acronym (e.g. FBC, MP, PCV, LFT), specimen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              type="button"
              className="test-picker-clear-search"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {/* Quick Common Investigation Chips */}
        <div className="test-quick-chips-row">
          {COMMON_QUICK_SEARCHES.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className={`test-quick-add-chip ${searchQuery.toLowerCase() === chip.query ? "selected" : ""}`}
              onClick={() => setSearchQuery(chip.query)}
            >
              <FiSearch size={10} />
              {chip.label}
            </button>
          ))}
        </div>

        {/* Category Filter Tabs */}
        {categories.length > 2 && (
          <div className="test-picker-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`test-tab-chip ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Selected Basket Counter Bar in Multi Mode */}
        {mode === "multi" && selectedTemplateIds.length > 0 && (
          <div className="test-basket-bar">
            <span>
              <FaFlask style={{ marginRight: 6 }} />
              <strong>{selectedTemplateIds.length}</strong> test{selectedTemplateIds.length > 1 ? "s" : ""} selected in order
            </span>
            {onClearMulti && (
              <button
                type="button"
                className="app-picker-clear-btn"
                style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 700 }}
                onClick={handleClearAll}
              >
                Clear All
              </button>
            )}
          </div>
        )}

        {/* Test List */}
        <div ref={listRef} className="test-picker-list">
          {filteredTemplates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--picker-muted)" }}>
              <FaFlask style={{ fontSize: "2rem", marginBottom: "0.5rem", opacity: 0.4 }} />
              <p style={{ fontWeight: 700, margin: "0 0 4px" }}>No diagnostic tests found</p>
              <small>Try another keyword, shortcode, or select 'All' categories.</small>
            </div>
          ) : (
            filteredTemplates.map((template, index) => {
              const selected = isTestSelected(template.id);
              const highlighted = index === highlightedIndex;
              const specimenClass = getSpecimenColorClass(template.specimen);

              return (
                <div
                  key={template.id}
                  className={`test-picker-row ${selected ? "selected" : ""} ${highlighted ? "highlighted" : ""}`}
                  onClick={() => handleSelectTemplate(template)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={selected}
                >
                  <div className="test-row-main">
                    <div className="test-row-name-line">
                      <strong className="test-row-title">
                        {highlightSearchMatch(template.name, searchQuery)}
                      </strong>
                      {template.code && (
                        <span className="test-row-code-badge">
                          {highlightSearchMatch(template.code, searchQuery)}
                        </span>
                      )}
                      {template.specimen && (
                        <span className={`test-specimen-badge ${specimenClass}`}>
                          🩸 {template.specimen}
                        </span>
                      )}
                    </div>

                    <div className="test-row-subtext">
                      {template.category && (
                        <span>Category: <strong>{template.category}</strong></span>
                      )}
                      {template.fields && template.fields.length > 0 && (
                        <span>• {template.fields.length} analytes</span>
                      )}
                    </div>
                  </div>

                  {mode === "multi" ? (
                    <div className="test-row-checkbox">
                      {selected && <FiCheck strokeWidth={3} />}
                    </div>
                  ) : (
                    selected && (
                      <div style={{ color: "var(--picker-primary)", fontSize: "1.2rem" }}>
                        <FiCheck />
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="app-picker-footer">
          {mode === "multi" ? (
            <>
              <span style={{ fontSize: "0.8rem", color: "var(--picker-muted)" }}>
                {selectedTemplateIds.length} test{selectedTemplateIds.length === 1 ? "" : "s"} chosen
              </span>
              <button
                type="button"
                className="app-picker-btn primary"
                onClick={() => setIsOpen(false)}
              >
                <FiCheck style={{ marginRight: 4 }} /> Confirm Selection
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="app-picker-btn secondary"
                onClick={() => {
                  onSelectTemplate?.(null);
                  setIsOpen(false);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="app-picker-btn primary"
                onClick={() => setIsOpen(false)}
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`app-picker-wrapper ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label className="app-picker-label" htmlFor={id}>
          <span>
            {label} {required && <span className="required-star">*</span>}
          </span>
          {mode === "multi" && selectedTemplateIds.length > 0 && (
            <span className="helper-badge">
              {selectedTemplateIds.length} selected
            </span>
          )}
        </label>
      )}

      {/* Main Trigger Button */}
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        id={id}
        className={`app-picker-trigger ${isOpen ? "open" : ""} ${
          (selectedTemplate || selectedMultiTemplates.length > 0) ? "has-value" : ""
        } ${error ? "has-error" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        tabIndex={disabled ? -1 : 0}
      >
        <div className="app-picker-icon-box">
          <FaFlask />
        </div>

        <div className="app-picker-content">
          {mode === "single" && selectedTemplate ? (
            <div className="app-picker-value">
              <span>{selectedTemplate.name}</span>
              {selectedTemplate.code && (
                <span className="test-row-code-badge" style={{ fontSize: "0.68rem" }}>
                  {selectedTemplate.code}
                </span>
              )}
              {selectedTemplate.specimen && (
                <span className="app-picker-subvalue">
                  [Specimen: {selectedTemplate.specimen}]
                </span>
              )}
            </div>
          ) : mode === "multi" && selectedMultiTemplates.length > 0 ? (
            <div className="app-picker-value">
              <span>
                {selectedMultiTemplates.length} diagnostic test{selectedMultiTemplates.length > 1 ? "s" : ""} selected
              </span>
              <span className="app-picker-subvalue">
                ({selectedMultiTemplates.map((t) => t.code || t.name).slice(0, 3).join(", ")}
                {selectedMultiTemplates.length > 3 ? "..." : ""})
              </span>
            </div>
          ) : (
            <span className="app-picker-placeholder">{defaultPlaceholder}</span>
          )}
        </div>

        <div className="app-picker-actions">
          {allowClear && !disabled && (
            (mode === "single" && selectedTemplate) ? (
              <button
                type="button"
                className="app-picker-clear-btn"
                onClick={handleClearSingle}
                title="Clear test selection"
                aria-label="Clear test selection"
              >
                <FiX size={15} />
              </button>
            ) : (mode === "multi" && selectedMultiTemplates.length > 0 && onClearMulti) ? (
              <button
                type="button"
                className="app-picker-clear-btn"
                onClick={handleClearAll}
                title="Clear all selected tests"
                aria-label="Clear all selected tests"
              >
                <FiX size={15} />
              </button>
            ) : null
          )}
          <FiChevronDown className={`app-picker-chevron ${isOpen ? "open" : ""}`} />
        </div>
      </div>

      {error && <span className="app-picker-error-msg">{error}</span>}

      {/* Popover / Mobile Sheet */}
      {isOpen && <FloatingPortal>{popoverContent}</FloatingPortal>}
    </div>
  );
}
