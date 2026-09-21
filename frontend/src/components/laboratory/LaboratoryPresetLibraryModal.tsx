import { useState } from "react";
import {
  X as FiX,
  Search as FiSearch,
  Check as FiCheck,
  Clock as FiClock,
  Droplet as FiDroplet,
  Layers as FiLayers,
  Zap as FiZap,
  Info as FiInfo,
} from "lucide-react";
import {
  MEDICAL_TEMPLATE_PRESETS,
  type MedicalTemplatePreset,
} from "../../data/medicalPresets";
import type { LaboratoryTemplateFormValues } from "../../types/laboratory";

interface LaboratoryPresetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: LaboratoryTemplateFormValues) => void;
}

export default function LaboratoryPresetLibraryModal({
  isOpen,
  onClose,
  onSelectPreset,
}: LaboratoryPresetLibraryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activePreviewPreset, setActivePreviewPreset] = useState<MedicalTemplatePreset | null>(null);

  if (!isOpen) return null;

  const categories = [
    "All",
    "Haematology & Coagulation",
    "Chemical Pathology / Biochemistry",
    "Urinalysis & Renal Function",
    "Parasitology & Stool Analysis",
    "Serology & Infectious Diseases",
    "Endocrinology & Immunology",
    "Reproductive Health & Andrology",
  ];

  const filteredPresets = MEDICAL_TEMPLATE_PRESETS.filter((preset: MedicalTemplatePreset) => {
    const matchesSearch =
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.fields.some((f: any) => f.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || preset.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleApplyPreset = (preset: MedicalTemplatePreset) => {
    onSelectPreset({
      name: preset.name,
      code: preset.code,
      category: preset.category,
      specimen: preset.specimen,
      reportTitle: preset.reportTitle,
      notes: preset.notes,
      isActive: true,
      fields: preset.fields.map((f: any) => ({ ...f })),
    });
    onClose();
  };

  return (
    <div className="lab-modal-overlay" onClick={onClose}>
      <div className="lab-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="lab-modal-header">
          <div>
            <h2>
              <FiZap style={{ color: "#10a9d6" }} /> Clinical Starter Templates Library
            </h2>
            <p style={{ margin: "0.2rem 0 0", color: "var(--muted)", fontSize: "0.86rem" }}>
              Choose a standard accredited diagnostic panel to populate your template in 1 click.
            </p>
          </div>
          <button
            type="button"
            className="lab-icon-btn modal-close-btn"
            onClick={onClose}
            aria-label="Close library modal"
            title="Close"
          >
            <FiX size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Search & Filters */}
        <div style={{ padding: "1.25rem 1.75rem 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="lab-search-input-wrapper">
            <FiSearch />
            <input
              type="text"
              placeholder="Search by test name, analyte (e.g. Bilirubin, Hb, Sodium), or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="lab-category-pills">
            {categories.map((cat) => (
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
        </div>

        {/* Modal Body: Presets List */}
        <div className="lab-modal-body">
          {filteredPresets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted)" }}>
              <FiInfo style={{ fontSize: "2rem", marginBottom: "0.5rem" }} />
              <p>No medical templates found matching your filter.</p>
            </div>
          ) : (
            <div className="lab-preset-grid">
              {filteredPresets.map((preset: MedicalTemplatePreset) => (
                <div
                  key={preset.id}
                  className="lab-preset-card"
                  onClick={() => handleApplyPreset(preset)}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span className="lab-badge code">{preset.code}</span>
                      <span className="lab-badge category">{preset.category.split(" ")[0]}</span>
                    </div>

                    <h4>{preset.name}</h4>
                    <p>{preset.description}</p>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.76rem", color: "var(--muted)", marginBottom: "0.65rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <FiDroplet style={{ color: "#d95763" }} />
                        {preset.specimen.split(" ")[0]}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <FiClock style={{ color: "var(--accent)" }} />
                        {preset.turnaroundTime}
                      </span>
                    </div>

                    <div className="lab-preset-card-footer">
                      <span style={{ fontWeight: 600, color: "var(--text-strong)" }}>
                        <FiLayers style={{ marginRight: "4px" }} />
                        {preset.fields.length} Analyte Fields
                      </span>
                      <button
                        type="button"
                        className="lab-btn-primary"
                        style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyPreset(preset);
                        }}
                      >
                        <FiCheck /> Use Preset
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
