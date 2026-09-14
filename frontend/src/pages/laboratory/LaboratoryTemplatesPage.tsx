import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  ArrowLeft as FiArrowLeft,
  Plus as FiPlus,
  Search as FiSearch,
  RefreshCw as FiRefreshCw,
  Edit3 as FiEdit3,
  Copy as FiCopy,
  Trash2 as FiTrash2,
  Eye as FiEye,
  Layers as FiLayers,
  Droplet as FiDroplet,
  Activity as FiActivity,
  CheckCircle2 as FiCheckCircle,
  XCircle as FiXCircle,
  Sliders as FiSliders,
  Zap as FiZap,
  FileText as FiFileText,
  X as FiX,
  Check as FiCheck,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  createLaboratoryTemplate,
  deleteLaboratoryTemplate,
  fetchLaboratoryTemplates,
  updateLaboratoryTemplate,
} from "../../services/laboratoryService";
import { useAuthStore } from "../../store/authStore";
import type {
  LaboratoryTemplate,
  LaboratoryTemplateFormValues,
} from "../../types/laboratory";
import LaboratoryTemplateStudio from "../../components/laboratory/LaboratoryTemplateStudio";
import LaboratoryReportPreview from "../../components/laboratory/LaboratoryReportPreview";
import LaboratoryPresetLibraryModal from "../../components/laboratory/LaboratoryPresetLibraryModal";

import "../../styles/laboratory-studio.css";

export default function LaboratoryTemplatesPage() {
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const permissions = user?.permissions ?? [];
  const isSuperAdmin = roles.some((role) => role.toLowerCase() === "super admin");
  const isLaboratoryRole = roles.some((role) => role.toLowerCase() === "laboratory");
  const canManageTemplates = isSuperAdmin || isLaboratoryRole;
  const canCreate = permissions.includes("laboratory.create") || canManageTemplates;
  const canUpdate = permissions.includes("laboratory.update") || canManageTemplates;

  const [templates, setTemplates] = useState<LaboratoryTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // View modes & modals
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LaboratoryTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<LaboratoryTemplate | null>(null);
  const [isPresetLibraryOpen, setIsPresetLibraryOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    const templateResult = await fetchLaboratoryTemplates(searchTerm, false);
    setLoading(false);

    if (!templateResult.result) {
      setError(templateResult.error ?? "Unable to load laboratory templates.");
      return;
    }

    setTemplates(templateResult.result.items);
  };

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!previewTemplate) return;
    document.body.classList.add("has-print-modal", "lab-print-modal-active");
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewTemplate(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("has-print-modal", "lab-print-modal-active");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewTemplate]);

  // Compute metric stats
  const stats = useMemo(() => {
    const total = templates.length;
    const active = templates.filter((t) => t.isActive).length;
    const categories = new Set(templates.map((t) => t.category || "General")).size;
    const totalFields = templates.reduce((sum, t) => sum + (t.fields?.length || 0), 0);

    return { total, active, categories, totalFields };
  }, [templates]);

  // Unique categories for pills filter
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return ["All", ...Array.from(cats)];
  }, [templates]);

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.code ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.category ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.specimen ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.fields.some((f) => f.label.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === "All" || (t.category || "General") === selectedCategory;

      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? t.isActive
          : !t.isActive;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [templates, searchTerm, selectedCategory, statusFilter]);

  // Actions
  const handleOpenNewStudio = () => {
    setEditingTemplate(null);
    setIsStudioOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditTemplate = (template: LaboratoryTemplate) => {
    setEditingTemplate(template);
    setIsStudioOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicateTemplate = (template: LaboratoryTemplate) => {
    const duplicated: LaboratoryTemplate = {
      ...template,
      id: "",
      name: `${template.name} (Copy)`,
      code: template.code ? `${template.code}-COPY` : "",
    };
    setEditingTemplate(duplicated);
    setIsStudioOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleActive = async (template: LaboratoryTemplate) => {
    if (!canUpdate) return;
    setError(null);
    setSuccess(null);

    const updated = await updateLaboratoryTemplate(template.id, {
      name: template.name,
      code: template.code ?? "",
      category: template.category ?? "",
      specimen: template.specimen ?? "",
      reportTitle: template.reportTitle ?? "",
      notes: template.notes ?? "",
      isActive: !template.isActive,
      fields: template.fields,
    });

    if (updated.template) {
      setSuccess(
        `Template "${template.name}" is now ${!template.isActive ? "active" : "inactive"}.`
      );
      await loadTemplates();
    } else {
      setError(updated.error ?? "Failed to toggle template status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this laboratory template?")) {
      return;
    }

    setDeletingId(id);
    setError(null);
    setSuccess(null);

    const result = await deleteLaboratoryTemplate(id);
    setDeletingId(null);

    if (result.success) {
      setSuccess("Template deleted successfully.");
      await loadTemplates();
    } else {
      setError(result.error ?? "Failed to delete template.");
    }
  };

  const handleSaveFromStudio = async (values: LaboratoryTemplateFormValues) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result =
      editingTemplate && editingTemplate.id
        ? await updateLaboratoryTemplate(editingTemplate.id, values)
        : await createLaboratoryTemplate(values);

    setSaving(false);

    if (!result.template) {
      setError(result.error ?? "Unable to save laboratory template.");
      return;
    }

    setSuccess(
      editingTemplate && editingTemplate.id
        ? `Template "${result.template.name}" updated successfully.`
        : `New template "${result.template.name}" created successfully.`
    );
    setIsStudioOpen(false);
    setEditingTemplate(null);
    await loadTemplates();
  };

  const handleApplyPresetToStudio = (presetValues: LaboratoryTemplateFormValues) => {
    setEditingTemplate({
      id: "",
      ...presetValues,
    });
    setIsPresetLibraryOpen(false);
    setIsStudioOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AdminLayout>
      <main className="page-container">
        <div className="lab-studio-container">
          {/* Notification Alerts */}
          {error && (
            <div
              style={{
                padding: "0.85rem 1.25rem",
                background: "var(--cavendish-emergency-bg)",
                border: "1px solid var(--cavendish-emergency-border)",
                borderRadius: "10px",
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{error}</span>
              <button
                type="button"
                className="lab-icon-btn danger"
                onClick={() => setError(null)}
              >
                <FiX />
              </button>
            </div>
          )}

          {success && (
            <div
              style={{
                padding: "0.85rem 1.25rem",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "10px",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FiCheckCircle /> {success}
              </span>
              <button
                type="button"
                className="lab-icon-btn"
                onClick={() => setSuccess(null)}
              >
                <FiX />
              </button>
            </div>
          )}

          {/* VIEW 1: STUDIO BUILDER WORKSPACE */}
          {isStudioOpen ? (
            <LaboratoryTemplateStudio
              initialData={editingTemplate}
              onSave={handleSaveFromStudio}
              onCancel={() => {
                setIsStudioOpen(false);
                setEditingTemplate(null);
              }}
              saving={saving}
              canEdit={canCreate || canUpdate}
            />
          ) : (
            /* VIEW 2: TEMPLATES MANAGEMENT CATALOG HUB */
            <>
              {/* Hero Banner */}
              <section className="lab-catalog-hero">
                <div className="lab-hero-title-group">
                  <p className="eyebrow" style={{ color: "var(--accent)", margin: 0, fontWeight: 700 }}>
                    CLINICAL DIAGNOSTICS & PATHOLOGY SETUP
                  </p>
                  <h1>Laboratory Template Studio</h1>
                  <p>
                    Design accredited test panels, customize reference intervals, configure dropdown
                    matrices, and simulate patient diagnostic reports in real-time.
                  </p>
                </div>

                <div className="lab-hero-actions">
                  <Link className="lab-btn-secondary" to="/laboratory">
                    <FiArrowLeft /> Return to Lab Desk
                  </Link>

                  <button
                    type="button"
                    className="lab-btn-secondary"
                    onClick={() => setIsPresetLibraryOpen(true)}
                  >
                    <FiZap style={{ color: "#10a9d6" }} /> Starter Library
                  </button>

                  <button
                    type="button"
                    className="lab-btn-primary"
                    onClick={handleOpenNewStudio}
                    disabled={!canCreate}
                  >
                    <FiPlus /> New Template Studio
                  </button>
                </div>
              </section>

              {/* Metric Stats Cards */}
              <section className="lab-stats-grid">
                <div className="lab-stat-card">
                  <div className="lab-stat-icon blue">
                    <FiLayers />
                  </div>
                  <div className="lab-stat-info">
                    <h3>{stats.total}</h3>
                    <p>Total Templates</p>
                  </div>
                </div>

                <div className="lab-stat-card">
                  <div className="lab-stat-icon green">
                    <FiCheckCircle />
                  </div>
                  <div className="lab-stat-info">
                    <h3>{stats.active}</h3>
                    <p>Active Panels</p>
                  </div>
                </div>

                <div className="lab-stat-card">
                  <div className="lab-stat-icon amber">
                    <FiActivity />
                  </div>
                  <div className="lab-stat-info">
                    <h3>{stats.totalFields}</h3>
                    <p>Analyte Fields</p>
                  </div>
                </div>

                <div className="lab-stat-card">
                  <div className="lab-stat-icon purple">
                    <FiSliders />
                  </div>
                  <div className="lab-stat-info">
                    <h3>{stats.categories}</h3>
                    <p>Categories Covered</p>
                  </div>
                </div>
              </section>

              {/* Filter & Search Bar */}
              <section className="lab-filter-section">
                <div className="lab-search-row">
                  <div className="lab-search-input-wrapper">
                    <FiSearch />
                    <input
                      type="text"
                      placeholder="Search templates by test name, code, specimen, or analyte..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void loadTemplates();
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <select
                      className="lab-studio-select"
                      style={{ width: "auto", minWidth: "130px" }}
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as "all" | "active" | "inactive")
                      }
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Draft / Inactive</option>
                    </select>

                    <button
                      type="button"
                      className="lab-btn-secondary"
                      onClick={loadTemplates}
                      disabled={loading}
                    >
                      <FiRefreshCw className={loading ? "spin" : ""} /> Refresh
                    </button>
                  </div>
                </div>

                {/* Category Pills Filter */}
                <div className="lab-category-pills">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`lab-pill-btn ${selectedCategory === cat ? "active" : ""}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </section>

              {/* Template Cards Grid */}
              <section>
                {loading ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                    <FiRefreshCw className="spin" style={{ fontSize: "2rem", marginBottom: "0.5rem" }} />
                    <p>Loading laboratory templates...</p>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "4rem 2rem",
                      background: "var(--surface)",
                      border: "1px dashed var(--border)",
                      borderRadius: "16px",
                      color: "var(--muted)",
                    }}
                  >
                    <FiFileText style={{ fontSize: "2.5rem", marginBottom: "0.75rem", color: "var(--accent)" }} />
                    <h3 style={{ margin: "0 0 0.5rem", color: "var(--text-strong)" }}>
                      No Laboratory Templates Found
                    </h3>
                    <p style={{ margin: "0 0 1.5rem", maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
                      Get started by importing a pre-configured clinical panel or building a custom test template from scratch.
                    </p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
                      <button
                        type="button"
                        className="lab-btn-secondary"
                        onClick={() => setIsPresetLibraryOpen(true)}
                      >
                        <FiZap style={{ color: "#10a9d6" }} /> Load Clinical Preset
                      </button>
                      <button
                        type="button"
                        className="lab-btn-primary"
                        onClick={handleOpenNewStudio}
                      >
                        <FiPlus /> Create from Scratch
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="lab-cards-grid">
                    {filteredTemplates.map((template) => (
                      <article key={template.id} className="lab-template-hub-card">
                        <div>
                          {/* Card Top Badges */}
                          <div className="lab-card-top">
                            <div className="lab-card-badge-row">
                              <span className="lab-badge category">
                                {template.category || "General"}
                              </span>
                              {template.code && (
                                <span className="lab-badge code">{template.code}</span>
                              )}
                            </div>

                            <button
                              type="button"
                              className={`lab-badge ${
                                template.isActive ? "active-status" : "inactive-status"
                              }`}
                              style={{ cursor: canUpdate ? "pointer" : "default", border: "none" }}
                              onClick={() => handleToggleActive(template)}
                              title={canUpdate ? "Click to toggle active/inactive" : undefined}
                            >
                              {template.isActive ? "Active" : "Inactive"}
                            </button>
                          </div>

                          {/* Card Title */}
                          <h3 className="lab-card-title">{template.name}</h3>

                          {/* Specimen Matrix */}
                          <div className="lab-card-specimen">
                            <FiDroplet />
                            <span>{template.specimen || "Specimen not specified"}</span>
                          </div>

                          {/* Analyte Fields Preview Chips */}
                          <div className="lab-card-fields-preview">
                            {template.fields.slice(0, 4).map((f, fIdx) => (
                              <span key={fIdx} className="lab-field-chip">
                                {f.label}
                              </span>
                            ))}
                            {template.fields.length > 4 && (
                              <span className="lab-field-chip more">
                                +{template.fields.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="lab-card-actions">
                          <span style={{ fontSize: "0.76rem", color: "var(--muted)", fontWeight: 500 }}>
                            {template.fields.length} field{template.fields.length !== 1 ? "s" : ""}
                          </span>

                          <div className="lab-card-action-group">
                            <button
                              type="button"
                              className="lab-icon-btn"
                              onClick={() => setPreviewTemplate(template)}
                              title="Live Diagnostic Report Preview"
                            >
                              <FiEye />
                            </button>

                            {canCreate && (
                              <button
                                type="button"
                                className="lab-icon-btn"
                                onClick={() => handleDuplicateTemplate(template)}
                                title="Duplicate Template"
                              >
                                <FiCopy />
                              </button>
                            )}

                            {canUpdate && (
                              <button
                                type="button"
                                className="lab-icon-btn"
                                onClick={() => handleEditTemplate(template)}
                                title="Edit in Visual Studio"
                              >
                                <FiEdit3 />
                              </button>
                            )}

                            {canUpdate && (
                              <button
                                type="button"
                                className="lab-icon-btn danger"
                                disabled={deletingId === template.id}
                                onClick={() => handleDelete(template.id)}
                                title="Delete Template"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* PREVIEW MODAL */}
          {previewTemplate &&
            createPortal(
              <div className="lab-modal-overlay lab-print-modal-overlay" onClick={() => setPreviewTemplate(null)}>
                <div
                  className="lab-modal-container lab-print-modal-container"
                  style={{ maxWidth: "800px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="lab-modal-header lab-print-modal-header no-print">
                    <div>
                      <h2>
                        <FiEye style={{ color: "var(--accent)" }} /> Diagnostic Report Preview
                      </h2>
                      <p style={{ margin: "0.2rem 0 0", color: "var(--muted)", fontSize: "0.86rem" }}>
                        {previewTemplate.name} ({previewTemplate.code || "No code"})
                      </p>
                    </div>
                    <button
                      type="button"
                      className="lab-icon-btn"
                      onClick={() => setPreviewTemplate(null)}
                    >
                      <FiX />
                    </button>
                  </div>

                  <div className="lab-modal-body lab-print-modal-body">
                    <LaboratoryReportPreview
                      formValues={{
                        name: previewTemplate.name,
                        code: previewTemplate.code ?? "",
                        category: previewTemplate.category ?? "",
                        specimen: previewTemplate.specimen ?? "",
                        reportTitle: previewTemplate.reportTitle ?? "",
                        notes: previewTemplate.notes ?? "",
                        isActive: previewTemplate.isActive,
                        fields: previewTemplate.fields,
                      }}
                      onPrint={() => window.print()}
                    />
                  </div>
                </div>
              </div>,
              document.body
            )}

          {/* STARTER PRESET LIBRARY MODAL */}
          <LaboratoryPresetLibraryModal
            isOpen={isPresetLibraryOpen}
            onClose={() => setIsPresetLibraryOpen(false)}
            onSelectPreset={handleApplyPresetToStudio}
          />
        </div>
      </main>
    </AdminLayout>
  );
}
