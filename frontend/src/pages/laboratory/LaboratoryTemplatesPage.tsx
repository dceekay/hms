import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit3,
  FiFileText,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiX,
} from "react-icons/fi";
import mdsLogo from "../../assets/optimized/logo.png";
import AdminLayout from "../../layouts/AdminLayout";
import {
  createLaboratoryTemplate,
  fetchLaboratoryTemplates,
  updateLaboratoryTemplate,
} from "../../services/laboratoryService";
import { useAuthStore } from "../../store/authStore";
import { NIGERIAN_LAB_TEMPLATES } from "../../constants/nigerianLabTemplates";
import "../../styles/laboratory-studio.css";
import type {
  LaboratoryFieldType,
  LaboratoryTemplate,
  LaboratoryTemplateField,
  LaboratoryTemplateFormValues,
} from "../../types/laboratory";

const emptyTemplateField: LaboratoryTemplateField = {
  key: "",
  label: "",
  type: "text",
  unit: "",
  referenceRange: "",
  options: [],
  required: false,
};

const emptyTemplateForm: LaboratoryTemplateFormValues = {
  name: "",
  code: "",
  category: "",
  specimen: "",
  reportTitle: "",
  notes: "",
  isActive: true,
  fields: [{ ...emptyTemplateField }],
};

function formFromTemplate(template: LaboratoryTemplate): LaboratoryTemplateFormValues {
  return {
    name: template.name,
    code: template.code ?? "",
    category: template.category ?? "",
    specimen: template.specimen ?? "",
    reportTitle: template.reportTitle ?? "",
    notes: template.notes ?? "",
    isActive: template.isActive,
    fields: template.fields.length > 0 ? template.fields : [{ ...emptyTemplateField }],
  };
}

export default function LaboratoryTemplatesPage() {
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const isSuperAdmin = roles.some((role) => role.toLowerCase() === "super admin");
  const isLaboratoryRole = roles.some((role) => role.toLowerCase() === "laboratory");
  const canManageTemplates = isSuperAdmin || isLaboratoryRole;
  const canCreate = permissions.includes("laboratory.create");
  const canUpdate = permissions.includes("laboratory.update");

  const [templates, setTemplates] = useState<LaboratoryTemplate[]>(NIGERIAN_LAB_TEMPLATES);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateForm, setTemplateForm] = useState<LaboratoryTemplateFormValues>(emptyTemplateForm);
  const [editingTemplate, setEditingTemplate] = useState<LaboratoryTemplate | null>(null);
  const [activeWorksheetTemplate, setActiveWorksheetTemplate] = useState<LaboratoryTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    const templateResult = await fetchLaboratoryTemplates(templateSearch, false);
    setLoading(false);

    const searchLower = templateSearch.trim().toLowerCase();
    const filterTemplates = (list: LaboratoryTemplate[]) => {
      if (!searchLower) return list;
      return list.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          (t.code && t.code.toLowerCase().includes(searchLower)) ||
          (t.category && t.category.toLowerCase().includes(searchLower)) ||
          (t.specimen && t.specimen.toLowerCase().includes(searchLower))
      );
    };

    if (!templateResult.result || templateResult.result.items.length === 0) {
      setTemplates(filterTemplates(NIGERIAN_LAB_TEMPLATES));
      return;
    }

    const serverItems = templateResult.result.items;
    const combined = [...serverItems];
    for (const nigTpl of NIGERIAN_LAB_TEMPLATES) {
      if (
        !combined.some(
          (t) =>
            t.code === nigTpl.code ||
            t.name.toLowerCase() === nigTpl.name.toLowerCase()
        )
      ) {
        combined.push(nigTpl);
      }
    }
    setTemplates(filterTemplates(combined));
  };

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTemplateFieldChange = (
    index: number,
    field: keyof LaboratoryTemplateField,
    value: string | boolean | string[]
  ) => {
    setTemplateForm((current) => ({
      ...current,
      fields: current.fields.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addTemplateField = () => {
    setTemplateForm((current) => ({
      ...current,
      fields: [...current.fields, { ...emptyTemplateField }],
    }));
  };

  const removeTemplateField = (index: number) => {
    setTemplateForm((current) => ({
      ...current,
      fields:
        current.fields.length === 1
          ? [{ ...emptyTemplateField }]
          : current.fields.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const startEditTemplate = (template: LaboratoryTemplate) => {
    setEditingTemplate(template);
    setTemplateForm(formFromTemplate(template));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateForm(emptyTemplateForm);
  };

  const handleTemplateSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!canManageTemplates) {
      setError("Only laboratory staff and super administrators can manage templates.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = editingTemplate
      ? await updateLaboratoryTemplate(editingTemplate.id, templateForm)
      : await createLaboratoryTemplate(templateForm);

    setSaving(false);

    if (!result.template) {
      setError(result.error ?? "Unable to save laboratory template.");
      return;
    }

    setSuccess(editingTemplate ? "Template updated." : "Template added.");
    resetForm();
    await loadTemplates();
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="laboratory-page laboratory-template-page">
          <section className="setup-hero laboratory-hero">
            <div>
              <p className="eyebrow">Laboratory setup</p>
              <h1>Test Templates</h1>
              <p>Create reusable result forms for lab tests and reports.</p>
            </div>
            <div className="laboratory-template-hero-actions">
              <Link className="icon-text-btn" to="/laboratory">
                <FiArrowLeft />
                Lab desk
              </Link>
              <button type="button" className="icon-text-btn" onClick={loadTemplates} disabled={loading}>
                <FiRefreshCw />
                Refresh
              </button>
            </div>
          </section>

          {error && <p className="registration-error">{error}</p>}
          {success && <p className="security-success">{success}</p>}

          <section className="laboratory-template-layout">
            {!canManageTemplates ? (
              <div className="setup-form laboratory-template-form">
                <div className="panel-title">
                  <div>
                    <h2>Template Access</h2>
                    <p>Only laboratory staff and super administrators can manage lab templates.</p>
                  </div>
                  <FiFileText />
                </div>
              </div>
            ) : (
              <form className="setup-form laboratory-template-form" onSubmit={handleTemplateSubmit}>
                <div className="panel-title">
                  <div>
                    <h2>{editingTemplate ? "Edit Template" : "Add Template"}</h2>
                    <p>Build the result form once, then reuse it for every matching test.</p>
                  </div>
                  <FiFileText />
                </div>

                <div className="form-grid">
                  <label>
                    Test name
                    <input
                      value={templateForm.name}
                      onChange={(event) =>
                        setTemplateForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Full blood count"
                      required
                    />
                  </label>
                  <label>
                    Code
                    <input
                      value={templateForm.code}
                      onChange={(event) =>
                        setTemplateForm((current) => ({ ...current, code: event.target.value }))
                      }
                      placeholder="LAB-FBC"
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={templateForm.category}
                      onChange={(event) =>
                        setTemplateForm((current) => ({ ...current, category: event.target.value }))
                      }
                      placeholder="Haematology"
                    />
                  </label>
                  <label>
                    Specimen
                    <input
                      value={templateForm.specimen}
                      onChange={(event) =>
                        setTemplateForm((current) => ({ ...current, specimen: event.target.value }))
                      }
                      placeholder="Blood, urine, stool"
                    />
                  </label>
                  <label>
                    Report title
                    <input
                      value={templateForm.reportTitle}
                      onChange={(event) =>
                        setTemplateForm((current) => ({ ...current, reportTitle: event.target.value }))
                      }
                      placeholder="Laboratory result report"
                    />
                  </label>
                </div>

                <div className="laboratory-fields-editor">
                  <div className="setup-list-header">
                    <strong>Result fields</strong>
                    <button type="button" className="icon-text-btn" onClick={addTemplateField}>
                      <FiPlus />
                      Add field
                    </button>
                  </div>

                  {templateForm.fields.map((field, index) => (
                    <article className="laboratory-field-row" key={index}>
                      <input
                        value={field.label}
                        onChange={(event) =>
                          handleTemplateFieldChange(index, "label", event.target.value)
                        }
                        placeholder="Field label"
                        required
                      />
                      <input
                        value={field.key}
                        onChange={(event) =>
                          handleTemplateFieldChange(
                            index,
                            "key",
                            event.target.value.replace(/\s+/g, "_").toLowerCase()
                          )
                        }
                        placeholder="field_key"
                        required
                      />
                      <select
                        value={field.type}
                        onChange={(event) =>
                          handleTemplateFieldChange(
                            index,
                            "type",
                            event.target.value as LaboratoryFieldType
                          )
                        }
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="select">Dropdown</option>
                        <option value="textarea">Long text</option>
                      </select>
                      <input
                        value={field.unit ?? ""}
                        onChange={(event) =>
                          handleTemplateFieldChange(index, "unit", event.target.value)
                        }
                        placeholder="Unit"
                      />
                      <input
                        value={field.referenceRange ?? ""}
                        onChange={(event) =>
                          handleTemplateFieldChange(index, "referenceRange", event.target.value)
                        }
                        placeholder="Reference"
                      />
                      <input
                        value={(field.options ?? []).join(", ")}
                        onChange={(event) =>
                          handleTemplateFieldChange(
                            index,
                            "options",
                            event.target.value.split(",").map((option) => option.trim())
                          )
                        }
                        placeholder="Dropdown options"
                      />
                      <label className="setup-toggle laboratory-field-required">
                        <input
                          type="checkbox"
                          checked={Boolean(field.required)}
                          onChange={(event) =>
                            handleTemplateFieldChange(index, "required", event.target.checked)
                          }
                        />
                        Required
                      </label>
                      <button type="button" className="icon-text-btn" onClick={() => removeTemplateField(index)}>
                        Remove
                      </button>
                    </article>
                  ))}
                </div>

                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={templateForm.notes}
                    onChange={(event) =>
                      setTemplateForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder="Report note or processing instruction"
                  />
                </label>

                <label className="setup-toggle">
                  <input
                    type="checkbox"
                    checked={templateForm.isActive}
                    onChange={(event) =>
                      setTemplateForm((current) => ({ ...current, isActive: event.target.checked }))
                    }
                  />
                  Active template
                </label>

                <div className="setup-actions">
                  {editingTemplate && (
                    <button type="button" className="icon-text-btn" onClick={resetForm}>
                      Cancel
                    </button>
                  )}
                  <button
                    className="registration-submit"
                    type="submit"
                    disabled={saving || (!canCreate && !canUpdate)}
                  >
                    {saving ? "Saving..." : editingTemplate ? "Update Template" : "Add Template"}
                    <FiSave />
                  </button>
                </div>
              </form>
            )}

            <section className="setup-list-panel">
              <div className="setup-list-header">
                <div className="patient-search-control">
                  <FiSearch />
                  <input
                    value={templateSearch}
                    onChange={(event) => setTemplateSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadTemplates();
                    }}
                    placeholder="Search templates"
                  />
                </div>
                <button type="button" className="icon-text-btn" onClick={loadTemplates}>
                  <FiRefreshCw />
                  Search
                </button>
              </div>

              <div className="laboratory-template-list">
                {loading && <p className="muted-text">Loading templates...</p>}
                {!loading && templates.length === 0 && <p className="muted-text">No templates found.</p>}
                {templates.map((template) => (
                  <article className="laboratory-template-card" key={template.id}>
                    <div>
                      <div className="setup-provider-title">
                        <strong>{template.name}</strong>
                        <span className={`laboratory-status-badge ${template.isActive ? "completed" : "cancelled"}`}>
                          {template.isActive ? "active" : "inactive"}
                        </span>
                      </div>
                      <p>{template.category || "General"} | {template.specimen || "Specimen not set"}</p>
                      <small>{template.fields.length} field(s) | {template.code || "No code"}</small>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="icon-text-btn"
                        onClick={() => setActiveWorksheetTemplate(template)}
                        title="Print blank manual worksheet for offline recording"
                      >
                        <FiPrinter />
                        Print Worksheet
                      </button>
                      {canManageTemplates && (
                        <button
                          type="button"
                          className="icon-text-btn"
                          onClick={() => startEditTemplate(template)}
                        >
                          <FiEdit3 />
                          Edit Studio
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      </main>

      {activeWorksheetTemplate && (
        <div className="lab-worksheet-modal-overlay no-print-backdrop">
          <div className="lab-worksheet-modal">
            <div className="lab-worksheet-modal-actions no-print">
              <div>
                <h3>Offline Manual Lab Worksheet</h3>
                <p>Print on standard A4 paper for manual clinical recording without internet.</p>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  className="icon-text-btn print-allow"
                  style={{ background: "#10aab0", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold" }}
                  onClick={() => window.print()}
                >
                  <FiPrinter /> Print Worksheet
                </button>
                <button
                  type="button"
                  className="icon-text-btn"
                  style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "none", padding: "8px 14px", borderRadius: "8px" }}
                  onClick={() => setActiveWorksheetTemplate(null)}
                >
                  <FiX /> Close
                </button>
              </div>
            </div>

            <div className="lab-manual-worksheet-document">
              <header className="worksheet-header">
                <div className="worksheet-brand">
                  <img src={mdsLogo} alt="MDS Hospital" className="worksheet-logo" />
                  <div>
                    <h1>MDS HOSPITAL KANO</h1>
                    <p className="worksheet-sub">DEPARTMENT OF MEDICAL LABORATORY SERVICES</p>
                    <small>Eastern Bypass, Giginyu, Kano State, Nigeria | 24/7 Diagnostics Desk | mdshospital.com.ng</small>
                  </div>
                </div>
                <div className="worksheet-badge">
                  <strong>OFFLINE WORKSHEET</strong>
                  <span>{activeWorksheetTemplate.code || "LAB"}</span>
                </div>
              </header>

              <section className="worksheet-patient-box">
                <div className="worksheet-patient-grid">
                  <div className="worksheet-field">
                    <label>Patient Name:</label>
                    <div className="worksheet-line"></div>
                  </div>
                  <div className="worksheet-field">
                    <label>Hospital / MRN:</label>
                    <div className="worksheet-line"></div>
                  </div>
                  <div className="worksheet-field">
                    <label>Age / Sex:</label>
                    <div className="worksheet-line"></div>
                  </div>
                  <div className="worksheet-field">
                    <label>Ward / Clinic:</label>
                    <div className="worksheet-line"></div>
                  </div>
                  <div className="worksheet-field">
                    <label>Ordering Clinician:</label>
                    <div className="worksheet-line"></div>
                  </div>
                  <div className="worksheet-field">
                    <label>Date &amp; Time Collected:</label>
                    <div className="worksheet-line"></div>
                  </div>
                </div>
              </section>

              <section className="worksheet-test-summary">
                <div className="test-summary-pill">
                  <small>INVESTIGATION</small>
                  <strong>{activeWorksheetTemplate.name}</strong>
                </div>
                <div className="test-summary-pill">
                  <small>CATEGORY</small>
                  <strong>{activeWorksheetTemplate.category || "General Laboratory"}</strong>
                </div>
                <div className="test-summary-pill">
                  <small>SPECIMEN TYPE</small>
                  <strong>{activeWorksheetTemplate.specimen || "Standard Specimen"}</strong>
                </div>
              </section>

              <table className="worksheet-table">
                <thead>
                  <tr>
                    <th style={{ width: "38%" }}>Investigation / Parameter</th>
                    <th style={{ width: "26%" }}>Observed Result (Manual Entry)</th>
                    <th style={{ width: "16%" }}>Unit</th>
                    <th style={{ width: "20%" }}>Reference Range</th>
                  </tr>
                </thead>
                <tbody>
                  {activeWorksheetTemplate.fields.map((f, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{f.label}</strong>
                        {f.required && <span className="worksheet-req-mark"> *</span>}
                        {f.options && f.options.length > 0 && (
                          <div className="worksheet-options-hint">
                            [Options: {f.options.join(" / ")}]
                          </div>
                        )}
                      </td>
                      <td className="worksheet-entry-cell"></td>
                      <td>{f.unit || "—"}</td>
                      <td>{f.referenceRange || "Clinical correlation"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {activeWorksheetTemplate.notes && (
                <div className="worksheet-notes-box">
                  <strong>Standard Procedure / Notes:</strong>
                  <p>{activeWorksheetTemplate.notes}</p>
                </div>
              )}

              <div className="worksheet-remarks-box">
                <label>Scientist Interpretation / Macroscopic Findings:</label>
                <div className="worksheet-ruled-area">
                  <div className="ruled-line"></div>
                  <div className="ruled-line"></div>
                </div>
              </div>

              <footer className="worksheet-footer-signoff">
                <div className="signoff-column">
                  <div className="signoff-signature-line"></div>
                  <strong>Medical Laboratory Scientist</strong>
                  <small>Name, Signature &amp; Stamp / Date</small>
                </div>
                <div className="signoff-column">
                  <div className="signoff-signature-line"></div>
                  <strong>Consultant Pathologist / Reviewer</strong>
                  <small>Verified By / Date</small>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
