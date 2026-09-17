import { useState, useEffect, type FormEvent } from "react";
import {
  ArrowLeft as FiArrowLeft,
  Save as FiSave,
  Plus as FiPlus,
  Trash2 as FiTrash2,
  Copy as FiCopy,
  ArrowUp as FiArrowUp,
  ArrowDown as FiArrowDown,
  Zap as FiZap,
  Eye as FiEye,
  Layout as FiLayout,
  Check as FiCheck,
  X as FiX,
  CircleHelp as FiHelpCircle,
  Sliders as FiSliders,
  Tag as FiTag,
  Layers as FiLayers,
  Droplet as FiDroplet,
} from "lucide-react";
import type {
  LaboratoryFieldType,
  LaboratoryTemplate,
  LaboratoryTemplateField,
  LaboratoryTemplateFormValues,
} from "../../types/laboratory";
import {
  COMMON_LAB_UNITS,
  COMMON_SPECIMENS,
  COMMON_LAB_CATEGORIES,
} from "../../data/medicalPresets";
import LaboratoryReportPreview from "./LaboratoryReportPreview";
import LaboratoryPresetLibraryModal from "./LaboratoryPresetLibraryModal";

interface LaboratoryTemplateStudioProps {
  initialData?: LaboratoryTemplate | null;
  onSave: (values: LaboratoryTemplateFormValues) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  canEdit?: boolean;
}

const emptyField: LaboratoryTemplateField = {
  key: "",
  label: "",
  type: "text",
  unit: "",
  referenceRange: "",
  options: [],
  required: false,
};

const defaultForm: LaboratoryTemplateFormValues = {
  name: "",
  code: "",
  category: "Haematology & Coagulation",
  specimen: "Whole Blood (EDTA)",
  reportTitle: "",
  notes: "",
  isActive: true,
  fields: [
    {
      key: "primary_analyte",
      label: "Primary Analyte Result",
      type: "number",
      unit: "mg/dL",
      referenceRange: "Normal",
      options: [],
      required: true,
    },
  ],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function LaboratoryTemplateStudio({
  initialData,
  onSave,
  onCancel,
  saving = false,
  canEdit = true,
}: LaboratoryTemplateStudioProps) {
  const [form, setForm] = useState<LaboratoryTemplateFormValues>(() => {
    if (initialData) {
      return {
        name: initialData.name,
        code: initialData.code ?? "",
        category: initialData.category ?? "Haematology & Coagulation",
        specimen: initialData.specimen ?? "Whole Blood (EDTA)",
        reportTitle: initialData.reportTitle ?? "",
        notes: initialData.notes ?? "",
        isActive: initialData.isActive,
        fields:
          initialData.fields && initialData.fields.length > 0
            ? initialData.fields.map((f) => ({ ...f }))
            : [{ ...emptyField }],
      };
    }
    return defaultForm;
  });

  const [viewMode, setViewMode] = useState<"split" | "builder" | "preview">("split");
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [activeOptionInput, setActiveOptionInput] = useState<{ [index: number]: string }>({});
  const [autoSlugLocked, setAutoSlugLocked] = useState<{ [index: number]: boolean }>({});

  // Keyboard shortcut: Ctrl/Cmd + S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (canEdit && !saving) {
          void handleSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form, canEdit, saving]);

  // Field manipulation helpers
  const handleFieldChange = (
    index: number,
    key: keyof LaboratoryTemplateField,
    value: string | boolean | string[]
  ) => {
    setForm((prev) => {
      const newFields = [...prev.fields];
      const target = { ...newFields[index], [key]: value };

      // Auto-generate key if updating label and user hasn't manually edited key
      if (key === "label" && typeof value === "string" && !autoSlugLocked[index]) {
        target.key = slugify(value);
      }

      newFields[index] = target;
      return { ...prev, fields: newFields };
    });
  };

  const handleKeyManualEdit = (index: number, keyVal: string) => {
    setAutoSlugLocked((prev) => ({ ...prev, [index]: true }));
    handleFieldChange(index, "key", slugify(keyVal));
  };

  const addField = (fieldType: LaboratoryFieldType = "number") => {
    const newField: LaboratoryTemplateField = {
      ...emptyField,
      type: fieldType,
      label: fieldType === "number" ? "Numeric Parameter" : fieldType === "select" ? "Categorical Result" : "Test Parameter",
      key: `field_${form.fields.length + 1}`,
      unit: fieldType === "number" ? "mg/dL" : "",
    };

    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const duplicateField = (index: number) => {
    const source = form.fields[index];
    const cloned: LaboratoryTemplateField = {
      ...source,
      label: `${source.label} (Copy)`,
      key: `${source.key}_copy`,
      options: source.options ? [...source.options] : [],
    };

    setForm((prev) => {
      const newFields = [...prev.fields];
      newFields.splice(index + 1, 0, cloned);
      return { ...prev, fields: newFields };
    });
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= form.fields.length) return;

    setForm((prev) => {
      const newFields = [...prev.fields];
      const temp = newFields[index];
      newFields[index] = newFields[targetIdx];
      newFields[targetIdx] = temp;
      return { ...prev, fields: newFields };
    });
  };

  const removeField = (index: number) => {
    setForm((prev) => ({
      ...prev,
      fields:
        prev.fields.length === 1
          ? [{ ...emptyField, label: "Parameter", key: "param_1" }]
          : prev.fields.filter((_, idx) => idx !== index),
    }));
  };

  // Tag / Option editor helpers for Select type
  const addOptionToField = (fieldIdx: number) => {
    const optionText = (activeOptionInput[fieldIdx] ?? "").trim();
    if (!optionText) return;

    const currentOptions = form.fields[fieldIdx].options ?? [];
    if (!currentOptions.includes(optionText)) {
      handleFieldChange(fieldIdx, "options", [...currentOptions, optionText]);
    }

    setActiveOptionInput((prev) => ({ ...prev, [fieldIdx]: "" }));
  };

  const removeOptionFromField = (fieldIdx: number, optionIdx: number) => {
    const currentOptions = form.fields[fieldIdx].options ?? [];
    handleFieldChange(
      fieldIdx,
      "options",
      currentOptions.filter((_, idx) => idx !== optionIdx)
    );
  };

  // Quick Preset application
  const handleApplyPreset = (presetValues: LaboratoryTemplateFormValues) => {
    setForm(presetValues);
    setAutoSlugLocked({});
  };

  // Quick Analyte Chips
  const addQuickAnalyte = (label: string, unit: string, range: string, type: LaboratoryFieldType = "number") => {
    const newField: LaboratoryTemplateField = {
      label,
      key: slugify(label),
      type,
      unit,
      referenceRange: range,
      required: true,
      options: type === "select" ? ["Negative", "Positive"] : [],
    };

    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      alert("Please enter a name for the test template.");
      return;
    }
    if (form.fields.length === 0) {
      alert("Please add at least one result field.");
      return;
    }
    await onSave(form);
  };

  return (
    <div className="lab-studio-container">
      {/* 1. Sticky Studio Toolbar */}
      <header className="lab-studio-toolbar">
        <div className="lab-studio-toolbar-left">
          <button type="button" className="lab-btn-secondary" onClick={onCancel}>
            <FiArrowLeft /> Back to Templates
          </button>

          <div className="lab-studio-template-badge">
            <h2>{form.name || "Untitled Laboratory Template"}</h2>
            <span className={`lab-badge ${form.isActive ? "active-status" : "inactive-status"}`}>
              {form.isActive ? "Active" : "Draft / Inactive"}
            </span>
          </div>
        </div>

        <div className="lab-studio-toolbar-right">
          {/* View Mode Switcher */}
          <div className="lab-view-mode-toggle">
            <button
              type="button"
              className={`lab-view-mode-btn ${viewMode === "split" ? "active" : ""}`}
              onClick={() => setViewMode("split")}
              title="Split Builder & Simulator"
            >
              <FiLayout style={{ marginRight: "4px" }} /> Split Studio
            </button>
            <button
              type="button"
              className={`lab-view-mode-btn ${viewMode === "builder" ? "active" : ""}`}
              onClick={() => setViewMode("builder")}
              title="Form Builder Canvas Only"
            >
              <FiSliders style={{ marginRight: "4px" }} /> Builder Canvas
            </button>
            <button
              type="button"
              className={`lab-view-mode-btn ${viewMode === "preview" ? "active" : ""}`}
              onClick={() => setViewMode("preview")}
              title="Diagnostic Report Simulator"
            >
              <FiEye style={{ marginRight: "4px" }} /> Live Report
            </button>
          </div>

          {/* Quick Preset Library Modal Trigger */}
          <button
            type="button"
            className="lab-btn-secondary"
            onClick={() => setIsPresetModalOpen(true)}
          >
            <FiZap style={{ color: "#10a9d6" }} /> Load Medical Preset
          </button>

          {/* Save Action */}
          <button
            type="button"
            className="lab-btn-primary"
            disabled={saving || !canEdit}
            onClick={() => handleSubmit()}
          >
            <FiSave /> {saving ? "Saving..." : initialData ? "Update Template" : "Save Template"}
          </button>
        </div>
      </header>

      {/* 2. Main Studio Grid (Canvas + Live Simulator) */}
      <main
        className={`lab-studio-main-grid ${
          viewMode === "builder" ? "builder-only" : viewMode === "preview" ? "preview-only" : ""
        }`}
      >
        {/* LEFT COLUMN: Test Metadata & Field Canvas (Shown in Split or Builder mode) */}
        {viewMode !== "preview" && (
          <div className="lab-studio-canvas-area">
            {/* Template Header & Specimen Metadata */}
            <div className="lab-studio-card">
              <div className="lab-studio-card-header">
                <h3>
                  <FiLayers style={{ color: "var(--accent)" }} /> Test Configuration & Specimen
                </h3>
                <span className="lab-badge code">{form.code || "AUTO-CODE"}</span>
              </div>

              <div className="lab-studio-form-grid">
                <div className="lab-studio-field-group">
                  <label>
                    Test Name *
                    <span className="optional">Required</span>
                  </label>
                  <input
                    className="lab-studio-input"
                    value={form.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        name: val,
                        reportTitle: prev.reportTitle ? prev.reportTitle : `${val.toUpperCase()} REPORT`,
                      }));
                    }}
                    placeholder="e.g. Full Blood Count (FBC)"
                    required
                  />
                </div>

                <div className="lab-studio-field-group">
                  <label>
                    Test Code
                    <span className="optional">e.g. LAB-FBC-01</span>
                  </label>
                  <input
                    className="lab-studio-input"
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g. LAB-FBC"
                  />
                </div>

                <div className="lab-studio-field-group">
                  <label>Diagnostic Category</label>
                  <input
                    className="lab-studio-input"
                    list="lab-categories-list"
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g. Haematology & Coagulation"
                  />
                  <datalist id="lab-categories-list">
                    {COMMON_LAB_CATEGORIES.map((cat: string, idx: number) => (
                      <option key={idx} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div className="lab-studio-field-group">
                  <label>Specimen Matrix</label>
                  <input
                    className="lab-studio-input"
                    list="lab-specimens-list"
                    value={form.specimen}
                    onChange={(e) => setForm((prev) => ({ ...prev, specimen: e.target.value }))}
                    placeholder="e.g. Whole Blood (EDTA)"
                  />
                  <datalist id="lab-specimens-list">
                    {COMMON_SPECIMENS.map((spec: string, idx: number) => (
                      <option key={idx} value={spec} />
                    ))}
                  </datalist>
                </div>

                <div className="lab-studio-field-group lab-form-full">
                  <label>Official Report Title Banner</label>
                  <input
                    className="lab-studio-input"
                    value={form.reportTitle}
                    onChange={(e) => setForm((prev) => ({ ...prev, reportTitle: e.target.value }))}
                    placeholder="e.g. HAEMATOLOGY INVESTIGATION REPORT"
                  />
                </div>

                <div className="lab-studio-field-group lab-form-full">
                  <label>Clinical Notes / Processing Instructions</label>
                  <textarea
                    className="lab-studio-textarea"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Special specimen handling, calibration notes, or temperature requirements..."
                  />
                </div>

                <div className="lab-studio-field-group lab-form-full">
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Template is active and available for doctor test requests
                  </label>
                </div>
              </div>
            </div>

            {/* Field Designer Canvas */}
            <div className="lab-studio-card">
              <div className="lab-fields-canvas-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <h3 style={{ margin: 0 }}>Result Fields & Analytes</h3>
                  <span className="lab-fields-count-badge">
                    {form.fields.length} Field{form.fields.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="lab-btn-secondary"
                    onClick={() => addField("number")}
                  >
                    <FiPlus /> Add Number Field
                  </button>
                  <button
                    type="button"
                    className="lab-btn-secondary"
                    onClick={() => addField("select")}
                  >
                    <FiPlus /> Add Dropdown Field
                  </button>
                </div>
              </div>

              {/* List of Field Designer Cards */}
              <div className="lab-field-cards-list">
                {form.fields.map((field, index) => (
                  <div key={index} className="lab-field-designer-card">
                    {/* Field Top Bar */}
                    <div className="lab-field-card-top-bar">
                      <div className="lab-field-card-index">
                        <span className="lab-index-circle">{index + 1}</span>
                        <strong style={{ fontSize: "0.92rem", color: "var(--text-strong)" }}>
                          {field.label || `Untitled Field ${index + 1}`}
                        </strong>
                        <span className={`lab-field-type-tag ${field.type}`}>
                          {field.type === "number"
                            ? "123 Number"
                            : field.type === "select"
                            ? "▼ Dropdown"
                            : field.type === "textarea"
                            ? "¶ Long Text"
                            : "Aa Text"}
                        </span>
                        {field.required && (
                          <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>
                            * Required
                          </span>
                        )}
                      </div>

                      <div className="lab-field-card-controls">
                        <button
                          type="button"
                          className="lab-icon-btn"
                          disabled={index === 0}
                          onClick={() => moveField(index, "up")}
                          title="Move Up"
                        >
                          <FiArrowUp />
                        </button>
                        <button
                          type="button"
                          className="lab-icon-btn"
                          disabled={index === form.fields.length - 1}
                          onClick={() => moveField(index, "down")}
                          title="Move Down"
                        >
                          <FiArrowDown />
                        </button>
                        <button
                          type="button"
                          className="lab-icon-btn"
                          onClick={() => duplicateField(index)}
                          title="Duplicate Field"
                        >
                          <FiCopy />
                        </button>
                        <button
                          type="button"
                          className="lab-icon-btn danger"
                          onClick={() => removeField(index)}
                          title="Delete Field"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>

                    {/* Field Body Inputs */}
                    <div className="lab-field-card-body">
                      {/* Row 1: Label, Key, Field Type */}
                      <div className="lab-field-row-grid">
                        <div className="lab-studio-field-group">
                          <label>Field / Analyte Label *</label>
                          <input
                            className="lab-studio-input"
                            value={field.label}
                            onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                            placeholder="e.g. Hemoglobin (Hb)"
                            required
                          />
                        </div>

                        <div className="lab-studio-field-group">
                          <label>
                            Field Key (Code Identifier)
                            <span className="optional">{autoSlugLocked[index] ? "Custom" : "Auto"}</span>
                          </label>
                          <input
                            className="lab-studio-input"
                            style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                            value={field.key}
                            onChange={(e) => handleKeyManualEdit(index, e.target.value)}
                            placeholder="e.g. hemoglobin_hb"
                            required
                          />
                        </div>

                        <div className="lab-studio-field-group">
                          <label>Data Type</label>
                          <select
                            className="lab-studio-select"
                            value={field.type}
                            onChange={(e) =>
                              handleFieldChange(index, "type", e.target.value as LaboratoryFieldType)
                            }
                          >
                            <option value="number">123 Number</option>
                            <option value="text">Aa Short Text</option>
                            <option value="select">▼ Dropdown / Options</option>
                            <option value="textarea">¶ Long Text</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Unit, Reference Range, Required Toggle */}
                      <div className="lab-field-subrow-grid">
                        <div className="lab-studio-field-group">
                          <label>Unit of Measure</label>
                          <input
                            className="lab-studio-input"
                            value={field.unit ?? ""}
                            onChange={(e) => handleFieldChange(index, "unit", e.target.value)}
                            placeholder="e.g. g/dL, mg/dL"
                          />
                          {/* Quick Unit Pills */}
                          <div className="lab-quick-unit-pills">
                            {["g/dL", "mg/dL", "mmol/L", "10^9/L", "%", "IU/L", "cells/HPF"].map((u) => (
                              <button
                                key={u}
                                type="button"
                                className="lab-unit-pill"
                                onClick={() => handleFieldChange(index, "unit", u)}
                              >
                                {u}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="lab-studio-field-group">
                          <label>Standard Reference / Normal Interval</label>
                          <input
                            className="lab-studio-input"
                            value={field.referenceRange ?? ""}
                            onChange={(e) => handleFieldChange(index, "referenceRange", e.target.value)}
                            placeholder="e.g. 13.0 - 17.5, < 200, Negative"
                          />
                        </div>

                        <div className="lab-studio-field-group" style={{ justifyContent: "center", paddingTop: "1rem" }}>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={Boolean(field.required)}
                              onChange={(e) => handleFieldChange(index, "required", e.target.checked)}
                            />
                            Required
                          </label>
                        </div>
                      </div>

                      {/* Special Section for Dropdown Options Tag Editor */}
                      {field.type === "select" && (
                        <div className="lab-options-editor">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-strong)" }}>
                              <FiTag style={{ marginRight: "4px" }} /> Configured Dropdown Options:
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                              {field.options?.length ?? 0} Options
                            </span>
                          </div>

                          <div className="lab-options-tags-list">
                            {(field.options ?? []).map((opt, optIdx) => (
                              <span key={optIdx} className="lab-option-tag">
                                {opt}
                                <button
                                  type="button"
                                  onClick={() => removeOptionFromField(index, optIdx)}
                                  title="Remove option"
                                  aria-label="Remove option"
                                >
                                  <FiX size={12} strokeWidth={2.5} />
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="lab-add-option-input-row">
                            <input
                              className="lab-studio-input"
                              placeholder="Type option and press Add (e.g. Negative, Positive, Trace)..."
                              value={activeOptionInput[index] ?? ""}
                              onChange={(e) =>
                                setActiveOptionInput((prev) => ({ ...prev, [index]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addOptionToField(index);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="lab-btn-secondary"
                              style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem" }}
                              onClick={() => addOptionToField(index)}
                            >
                              <FiPlus /> Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Medical Field Palette Dock */}
              <div className="lab-palette-dock" style={{ marginTop: "1.25rem" }}>
                <div className="lab-palette-title">
                  <span>
                    <FiZap style={{ color: "#f59e0b", marginRight: "4px" }} /> Quick Add Common Medical Analytes:
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>1-click insert</span>
                </div>

                <div className="lab-palette-chips">
                  <button
                    type="button"
                    className="lab-palette-chip-btn"
                    onClick={() => addQuickAnalyte("Hemoglobin (Hb)", "g/dL", "13.0 - 17.5")}
                  >
                    + Hemoglobin
                  </button>
                  <button
                    type="button"
                    className="lab-palette-chip-btn"
                    onClick={() => addQuickAnalyte("Total WBC Count", "10^9/L", "4.0 - 11.0")}
                  >
                    + WBC Count
                  </button>
                  <button
                    type="button"
                    className="lab-palette-chip-btn"
                    onClick={() => addQuickAnalyte("Platelet Count", "10^9/L", "150 - 450")}
                  >
                    + Platelets
                  </button>
                  <button
                    type="button"
                    className="lab-palette-chip-btn"
                    onClick={() => addQuickAnalyte("Fasting Blood Sugar", "mg/dL", "70 - 99")}
                  >
                    + Glucose
                  </button>
                  <button
                    type="button"
                    className="lab-palette-chip-btn"
                    onClick={() => addQuickAnalyte("Serum Creatinine", "mg/dL", "0.6 - 1.3")}
                  >
                    + Creatinine
                  </button>
                  <button
                    type="button"
                    className="lab-palette-chip-btn"
                    onClick={() => addQuickAnalyte("Total Bilirubin", "mg/dL", "0.2 - 1.2")}
                  >
                    + Bilirubin
                  </button>
                  <button
                    type="button"
                    className="lab-palette-chip-btn"
                    onClick={() => addQuickAnalyte("Malaria Parasite Smear", "", "Negative", "select")}
                  >
                    + Malaria Smear
                  </button>
                  <button
                    type="button"
                    className="lab-palette-chip-btn"
                    onClick={() => addField("textarea")}
                  >
                    + Clinical Summary Box
                  </button>
                </div>
              </div>

              {/* Bottom Add Field Button */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "1.25rem" }}>
                <button
                  type="button"
                  className="lab-btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "0.85rem" }}
                  onClick={() => addField("number")}
                >
                  <FiPlus /> Add Another Result Parameter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Real-Time Diagnostic Report Simulator (Shown in Split or Preview mode) */}
        {viewMode !== "builder" && (
          <aside className="lab-simulator-panel">
            <LaboratoryReportPreview formValues={form} />
          </aside>
        )}
      </main>

      {/* Preset Library Modal */}
      <LaboratoryPresetLibraryModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectPreset={handleApplyPreset}
      />
    </div>
  );
}
