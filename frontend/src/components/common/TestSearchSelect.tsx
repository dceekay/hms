import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import {
  FiCheck,
  FiChevronDown,
  FiSearch,
  FiX,
  FiPlus,
  FiFilter,
  FiTag,
  FiLayers,
} from "react-icons/fi";
import { FaFlask, FaVial } from "react-icons/fa";
import type { LaboratoryTemplate } from "../../types/laboratory";
import "../../styles/test-search-select.css";

export interface TestSearchSelectProps {
  templates: LaboratoryTemplate[];
  selectedTemplateId?: string | null;
  value?: string;
  onSelectTemplate?: (template: LaboratoryTemplate | null) => void;
  onChange?: (templateId: string, template?: LaboratoryTemplate) => void;
  // Optional multi-select mode (e.g. for doctor consultation lab ordering basket)
  multiSelect?: boolean;
  mode?: "single" | "multi";
  selectedTemplateIds?: string[];
  selectedValues?: string[];
  onToggleTemplate?: (template: LaboratoryTemplate) => void;
  onClearMulti?: () => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  className?: string;
}

// Quick common panels for fast 1-click staging
const COMMON_PRESET_KEYWORDS = [
  { label: "Malaria (MP)", kw: ["malaria", "mp"] },
  { label: "Full Blood Count (FBC)", kw: ["full blood", "fbc", "cbc"] },
  { label: "Urinalysis", kw: ["urinalysis", "urine"] },
  { label: "Widal / Typhoid", kw: ["widal", "typhoid"] },
  { label: "Fasting Sugar (FBS)", kw: ["fbs", "fasting blood sugar", "glucose"] },
  { label: "Electrolytes (E/U/Cr)", kw: ["electrolyte", "e/u/cr", "kidney"] },
  { label: "Liver Function (LFT)", kw: ["lft", "liver function"] },
  { label: "Lipid Profile", kw: ["lipid", "cholesterol"] },
];

function HighlightedMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <span>{text}</span>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text}</span>;

  return (
    <span>
      {text.slice(0, idx)}
      <mark className="test-match-highlight">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

export default function TestSearchSelect({
  templates,
  selectedTemplateId,
  value,
  onSelectTemplate,
  onChange,
  multiSelect = false,
  mode = "single",
  selectedTemplateIds = [],
  selectedValues = [],
  onToggleTemplate,
  onClearMulti,
  placeholder = "Search tests by name, code (e.g. FBC, MP), specimen, or analyte...",
  label,
  error,
  disabled = false,
  required = false,
  allowClear = true,
  className = "",
}: TestSearchSelectProps) {
  const isMulti = multiSelect || mode === "multi";
  const activeSelectedId = selectedTemplateId ?? value ?? null;
  const activeSelectedIds = selectedTemplateIds.length > 0 ? selectedTemplateIds : selectedValues;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { refs, floatingStyles } = useFloating({
    open: isOpen && !isMobile,
    onOpenChange: setIsOpen,
    middleware: [offset(6), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === activeSelectedId) ?? null,
    [templates, activeSelectedId]
  );

  // Collect distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category && t.category.trim()) {
        set.add(t.category.trim());
      }
    });
    return ["all", ...Array.from(set)];
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return templates.filter((t) => {
      if (selectedCategory !== "all" && t.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;

      const nameMatch = t.name.toLowerCase().includes(q);
      const codeMatch = (t.code ?? "").toLowerCase().includes(q);
      const catMatch = (t.category ?? "").toLowerCase().includes(q);
      const specMatch = (t.specimen ?? "").toLowerCase().includes(q);
      const analyteMatch = t.fields?.some(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          (f.key && f.key.toLowerCase().includes(q))
      );

      return nameMatch || codeMatch || catMatch || specMatch || analyteMatch;
    });
  }, [templates, searchQuery, selectedCategory]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [isOpen]);

  // Outside click listener for desktop popover
  useEffect(() => {
    if (!isOpen || isMobile) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        refs.reference.current instanceof HTMLElement &&
        refs.reference.current.contains(e.target as Node)
      ) {
        return;
      }
      if (
        refs.floating.current instanceof HTMLElement &&
        refs.floating.current.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile, refs]);

  const handleSelect = (tpl: LaboratoryTemplate) => {
    if (isMulti && onToggleTemplate) {
      onToggleTemplate(tpl);
    } else {
      onSelectTemplate?.(tpl);
      onChange?.(tpl.id, tpl);
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTemplate?.(null);
    onChange?.("", undefined);
    onClearMulti?.();
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
        prev < filteredTemplates.length - 1 ? prev + 1 : prev
      );
      scrollHighlighted(highlightedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlighted(highlightedIndex - 1);
    } else if (e.key === "Enter" && filteredTemplates[highlightedIndex]) {
      e.preventDefault();
      handleSelect(filteredTemplates[highlightedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollHighlighted = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll(".test-row-card");
    const target = items[index] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ block: "nearest" });
    }
  };

  const isTemplateActive = (id: string) => {
    if (isMulti) {
      return activeSelectedIds.includes(id);
    }
    return activeSelectedId === id;
  };

  return (
    <div
      className={`test-search-select-container ${className} ${disabled ? "disabled" : ""} ${error ? "has-error" : ""}`}
      onKeyDown={handleKeyDown}
      ref={refs.setReference}
    >
      {label && (
        <label className="test-select-label">
          {label} {required && <span className="req-star">*</span>}
        </label>
      )}

      {/* Main Trigger Button */}
      <div
        className={`test-select-trigger ${isOpen ? "open" : ""} ${selectedTemplate || (isMulti && activeSelectedIds.length > 0) ? "has-value" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={disabled ? -1 : 0}
      >
        <div className="test-trigger-icon">
          <FaFlask />
        </div>

        <div className="test-trigger-content">
          {isMulti ? (
            activeSelectedIds.length > 0 ? (
              <div className="test-multi-preview">
                <span className="test-multi-count">
                  {activeSelectedIds.length} Test{activeSelectedIds.length > 1 ? "s" : ""} Selected
                </span>
                <span className="test-multi-hint">Tap to add more or modify</span>
              </div>
            ) : (
              <span className="test-placeholder">{placeholder}</span>
            )
          ) : selectedTemplate ? (
            <div className="test-single-preview">
              <div className="test-preview-title">
                <strong className="test-name">{selectedTemplate.name}</strong>
                {selectedTemplate.code && (
                  <span className="test-code-pill">{selectedTemplate.code}</span>
                )}
              </div>
              <div className="test-preview-meta">
                {selectedTemplate.category && (
                  <span className="test-cat-tag">{selectedTemplate.category}</span>
                )}
                {selectedTemplate.specimen && (
                  <span className="test-specimen-tag">
                    <FaVial /> {selectedTemplate.specimen}
                  </span>
                )}
                <span className="test-analytes-count">
                  {selectedTemplate.fields?.length || 0} analytes
                </span>
              </div>
            </div>
          ) : (
            <span className="test-placeholder">{placeholder}</span>
          )}
        </div>

        <div className="test-trigger-actions">
          {!isMulti && allowClear && selectedTemplate && !disabled && (
            <button
              type="button"
              className="test-clear-btn"
              onClick={handleClear}
              title="Clear selected test"
            >
              <FiX />
            </button>
          )}
          <FiChevronDown className={`test-chevron ${isOpen ? "rotate" : ""}`} />
        </div>
      </div>

      {error && <span className="test-error-text">{error}</span>}

      {/* Mobile Backdrop */}
      {isOpen && isMobile && (
        <div
          className="test-picker-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Popover / Mobile Sheet */}
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={isMobile ? undefined : floatingStyles}
          className={`test-picker-popover ${isMobile ? "mobile-sheet" : "desktop-floating"}`}
          role="listbox"
        >
          {isMobile && <div className="test-sheet-handle" />}

          {/* Header */}
          <div className="test-picker-header">
            <div className="test-header-title">
              <FaFlask />
              <span>Select Diagnostic Test / Panel</span>
              <span className="test-count-badge">
                {filteredTemplates.length} available
              </span>
            </div>
            {isMobile && (
              <button
                type="button"
                className="test-close-btn"
                onClick={() => setIsOpen(false)}
              >
                <FiX />
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="test-search-wrapper">
            <FiSearch className="test-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="test-search-input"
              placeholder="Search by test name, code (e.g. FBC), specimen, or analyte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="test-search-clear"
                onClick={() => setSearchQuery("")}
              >
                <FiX />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          {categories.length > 2 && (
            <div className="test-category-pills">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`test-cat-pill ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === "all" ? "All Panels" : cat}
                </button>
              ))}
            </div>
          )}

          {/* Quick Common Presets (When query is empty) */}
          {!searchQuery && (
            <div className="test-quick-presets-strip">
              <span className="test-quick-title">Quick Picks:</span>
              <div className="test-quick-chips">
                {COMMON_PRESET_KEYWORDS.map((preset) => {
                  const match = templates.find((t) =>
                    preset.kw.some(
                      (kw) =>
                        t.name.toLowerCase().includes(kw) ||
                        (t.code && t.code.toLowerCase().includes(kw))
                    )
                  );
                  if (!match) return null;
                  const active = isTemplateActive(match.id);
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={`test-preset-chip ${active ? "is-selected" : ""}`}
                      onClick={() => handleSelect(match)}
                    >
                      {active ? <FiCheck /> : <FiPlus />}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Test Cards List */}
          <div ref={listRef} className="test-picker-list">
            {filteredTemplates.length === 0 ? (
              <div className="test-empty-state">
                <FaFlask className="empty-flask" />
                <strong>No diagnostic tests found</strong>
                <p>Try searching by code (e.g. FBC, MP, LFT) or choose another category.</p>
              </div>
            ) : (
              filteredTemplates.map((template, idx) => {
                const isSelected = isTemplateActive(template.id);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={template.id}
                    className={`test-row-card ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
                    onClick={() => handleSelect(template)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="test-icon-badge">
                      <FaVial />
                    </div>

                    <div className="test-row-info">
                      <div className="test-name-line">
                        <strong className="test-card-name">
                          <HighlightedMatch
                            text={template.name}
                            query={searchQuery}
                          />
                        </strong>
                        {template.code && (
                          <span className="test-card-code">
                            <HighlightedMatch
                              text={template.code}
                              query={searchQuery}
                            />
                          </span>
                        )}
                      </div>

                      <div className="test-meta-line">
                        {template.category && (
                          <span className="meta-category">
                            {template.category}
                          </span>
                        )}
                        {template.specimen && (
                          <span className="meta-specimen">
                            Specimen:{" "}
                            <HighlightedMatch
                              text={template.specimen}
                              query={searchQuery}
                            />
                          </span>
                        )}
                        <span className="meta-analytes">
                          {template.fields?.length || 0} Analyte{template.fields?.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>

                    <div className="test-select-indicator">
                      {isSelected ? (
                        <div className="test-check-circle">
                          <FiCheck />
                        </div>
                      ) : isMulti ? (
                        <div className="test-plus-circle">
                          <FiPlus />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {isMulti && (
            <div className="test-picker-footer">
              <button
                type="button"
                className="test-done-btn"
                onClick={() => setIsOpen(false)}
              >
                <FiCheck /> Done ({activeSelectedIds.length} Selected)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
