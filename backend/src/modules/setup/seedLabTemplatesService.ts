import { prisma } from "../../database/prisma";
import { logger } from "../../config/logger";

export interface StandardNigerianLabTemplate {
  name: string;
  code: string;
  category: string;
  specimen: string;
  reportTitle: string;
  notes?: string;
  fields: Array<{
    key: string;
    label: string;
    type: "text" | "number" | "select" | "textarea";
    unit?: string;
    referenceRange?: string;
    options?: string[];
    required: boolean;
  }>;
}

export const STANDARD_NIGERIAN_LAB_TEMPLATES: StandardNigerianLabTemplate[] = [
  {
    name: "Full Blood Count (FBC / CBC)",
    code: "LAB-FBC",
    category: "Haematology",
    specimen: "Whole Blood (EDTA)",
    reportTitle: "FULL BLOOD COUNT & DIFFERENTIAL REPORT",
    notes: "Automated haematology analyser with manual differential confirmation when indicated.",
    fields: [
      { key: "pcv", label: "Packed Cell Volume (PCV)", type: "number", unit: "%", referenceRange: "36 - 50", required: true },
      { key: "hb", label: "Haemoglobin (Hb)", type: "number", unit: "g/dL", referenceRange: "11.5 - 16.5", required: true },
      { key: "wbc", label: "Total White Blood Cell Count (WBC)", type: "number", unit: "x10^9/L", referenceRange: "4.0 - 11.0", required: true },
      { key: "platelets", label: "Platelet Count", type: "number", unit: "x10^9/L", referenceRange: "150 - 450", required: true },
      { key: "neutrophils", label: "Neutrophils", type: "number", unit: "%", referenceRange: "40 - 75", required: false },
      { key: "lymphocytes", label: "Lymphocytes", type: "number", unit: "%", referenceRange: "20 - 45", required: false },
      { key: "monocytes", label: "Monocytes", type: "number", unit: "%", referenceRange: "2 - 10", required: false },
      { key: "eosinophils", label: "Eosinophils", type: "number", unit: "%", referenceRange: "1 - 6", required: false },
      { key: "basophils", label: "Basophils", type: "number", unit: "%", referenceRange: "0 - 1", required: false },
      { key: "film_comment", label: "Blood Film / Morphology Comment", type: "textarea", referenceRange: "Normocytic, Normochromic", required: false },
    ],
  },
  {
    name: "Malaria Parasite Examination (MP)",
    code: "LAB-MP",
    category: "Parasitology",
    specimen: "Whole Blood (EDTA / Capillary)",
    reportTitle: "MALARIA PARASITE MICROSCOPY & RDT REPORT",
    notes: "Thick and thin Giemsa stained blood films examined under oil immersion (x100).",
    fields: [
      {
        key: "microscopy_result",
        label: "Microscopy (Thick & Thin Film)",
        type: "select",
        referenceRange: "No malaria parasites seen",
        options: ["No malaria parasites seen", "Trophozoites of P. falciparum seen (+)", "Trophozoites of P. falciparum seen (++)", "Trophozoites of P. falciparum seen (+++)", "Trophozoites of P. vivax seen"],
        required: true,
      },
      { key: "parasite_density", label: "Parasite Density", type: "text", unit: "parasites/uL", referenceRange: "Negative", required: false },
      {
        key: "rdt_result",
        label: "Rapid Diagnostic Test (RDT Pf/Pan)",
        type: "select",
        referenceRange: "Negative",
        options: ["Negative", "Positive (P. falciparum)", "Positive (Pan-malaria)", "Invalid"],
        required: false,
      },
      { key: "technician_remark", label: "Technician Comments", type: "text", required: false },
    ],
  },
  {
    name: "Packed Cell Volume (PCV)",
    code: "LAB-PCV",
    category: "Haematology",
    specimen: "Whole Blood (EDTA / Capillary)",
    reportTitle: "PACKED CELL VOLUME (PCV) REPORT",
    fields: [
      { key: "pcv", label: "PCV", type: "number", unit: "%", referenceRange: "Male: 40 - 52% | Female: 36 - 48%", required: true },
      { key: "hb_equivalent", label: "Calculated Haemoglobin (Hb)", type: "number", unit: "g/dL", referenceRange: "12.0 - 16.5", required: false },
    ],
  },
  {
    name: "Widal Agglutination Reaction (Typhoid)",
    code: "LAB-WIDAL",
    category: "Serology",
    specimen: "Serum (Plain Tube)",
    reportTitle: "WIDAL AGGLUTINATION REACTION REPORT",
    notes: "Slide and tube agglutination technique for Salmonella enterica antibodies.",
    fields: [
      { key: "s_typhi_o", label: "S. Typhi (O Antigen)", type: "select", unit: "Titre", referenceRange: "< 1:80", options: ["< 1:20", "1:20", "1:40", "1:80", "1:160", "1:320"], required: true },
      { key: "s_typhi_h", label: "S. Typhi (H Antigen)", type: "select", unit: "Titre", referenceRange: "< 1:80", options: ["< 1:20", "1:20", "1:40", "1:80", "1:160", "1:320"], required: true },
      { key: "s_paratyphi_ao", label: "S. Paratyphi A (O Antigen)", type: "select", unit: "Titre", referenceRange: "< 1:80", options: ["< 1:20", "1:20", "1:40", "1:80", "1:160", "1:320"], required: false },
      { key: "s_paratyphi_ah", label: "S. Paratyphi A (H Antigen)", type: "select", unit: "Titre", referenceRange: "< 1:80", options: ["< 1:20", "1:20", "1:40", "1:80", "1:160", "1:320"], required: false },
      { key: "s_paratyphi_bo", label: "S. Paratyphi B (O Antigen)", type: "select", unit: "Titre", referenceRange: "< 1:80", options: ["< 1:20", "1:20", "1:40", "1:80", "1:160", "1:320"], required: false },
      { key: "s_paratyphi_bh", label: "S. Paratyphi B (H Antigen)", type: "select", unit: "Titre", referenceRange: "< 1:80", options: ["< 1:20", "1:20", "1:40", "1:80", "1:160", "1:320"], required: false },
      { key: "clinical_impression", label: "Clinical Interpretation", type: "textarea", referenceRange: "A single test is suggestive; paired sera recommended.", required: false },
    ],
  },
  {
    name: "Urinalysis (Dipstick & Microscopy)",
    code: "LAB-URINE",
    category: "Chemical Pathology",
    specimen: "Fresh Mid-Stream Urine (MSU)",
    reportTitle: "URINALYSIS & URINE MICROSCOPY REPORT",
    fields: [
      { key: "color", label: "Colour", type: "select", referenceRange: "Amber / Straw", options: ["Straw", "Amber", "Pale Yellow", "Deep Yellow", "Red / Blood-stained", "Brown / Tea-coloured", "Cloudy"], required: true },
      { key: "appearance", label: "Appearance", type: "select", referenceRange: "Clear", options: ["Clear", "Slightly Turbid", "Turbid", "Cloudy"], required: true },
      { key: "ph", label: "pH", type: "number", referenceRange: "5.0 - 7.5", required: false },
      { key: "specific_gravity", label: "Specific Gravity", type: "text", referenceRange: "1.005 - 1.030", required: false },
      { key: "protein", label: "Protein (Albumin)", type: "select", referenceRange: "Negative", options: ["Negative", "Trace", "+ (30mg/dL)", "++ (100mg/dL)", "+++ (300mg/dL)", "++++ (1000mg/dL)"], required: true },
      { key: "glucose", label: "Glucose", type: "select", referenceRange: "Negative", options: ["Negative", "Trace", "+ (100mg/dL)", "++ (250mg/dL)", "+++ (500mg/dL)", "++++ (1000mg/dL)"], required: true },
      { key: "ketones", label: "Ketones", type: "select", referenceRange: "Negative", options: ["Negative", "Trace", "+", "++", "+++"], required: false },
      { key: "blood", label: "Blood (Haemoglobin)", type: "select", referenceRange: "Negative", options: ["Negative", "Trace", "+", "++", "+++"], required: false },
      { key: "bilirubin", label: "Bilirubin", type: "select", referenceRange: "Negative", options: ["Negative", "+", "++", "+++"], required: false },
      { key: "urobilinogen", label: "Urobilinogen", type: "select", referenceRange: "Normal", options: ["Normal", "+", "++", "+++"], required: false },
      { key: "nitrite", label: "Nitrite", type: "select", referenceRange: "Negative", options: ["Negative", "Positive"], required: false },
      { key: "leukocytes", label: "Leukocyte Esterase", type: "select", referenceRange: "Negative", options: ["Negative", "Trace", "+", "++", "+++"], required: false },
      { key: "pus_cells", label: "Pus Cells (WBC)", type: "text", unit: "/HPF", referenceRange: "0 - 4 /HPF", required: false },
      { key: "red_cells", label: "Red Blood Cells (RBC)", type: "text", unit: "/HPF", referenceRange: "0 - 2 /HPF", required: false },
      { key: "epithelial_cells", label: "Epithelial Cells", type: "text", unit: "/HPF", referenceRange: "0 - 5 /HPF", required: false },
      { key: "casts_crystals", label: "Casts / Crystals", type: "text", referenceRange: "None seen", required: false },
    ],
  },
  {
    name: "Fasting Blood Sugar (FBS)",
    code: "LAB-FBS",
    category: "Chemical Pathology",
    specimen: "Plasma (Fluoride Oxalate)",
    reportTitle: "FASTING BLOOD SUGAR (FBS) REPORT",
    fields: [
      { key: "fasting_hours", label: "Hours of Fasting", type: "number", unit: "hours", referenceRange: "8 - 12 hours", required: false },
      { key: "fbs_mgdl", label: "Fasting Blood Sugar (mg/dL)", type: "number", unit: "mg/dL", referenceRange: "70 - 100", required: true },
      { key: "fbs_mmoll", label: "Fasting Blood Sugar (mmol/L)", type: "number", unit: "mmol/L", referenceRange: "3.9 - 5.6", required: false },
      { key: "interpretation", label: "Diagnostic Interpretation", type: "text", referenceRange: "Normal: < 100 | Impaired: 100-125 | Diabetic: >= 126", required: false },
    ],
  },
  {
    name: "Random Blood Sugar (RBS)",
    code: "LAB-RBS",
    category: "Chemical Pathology",
    specimen: "Plasma (Fluoride Oxalate) / Capillary",
    reportTitle: "RANDOM BLOOD SUGAR (RBS) REPORT",
    fields: [
      { key: "rbs_mgdl", label: "Random Blood Sugar (mg/dL)", type: "number", unit: "mg/dL", referenceRange: "< 140", required: true },
      { key: "rbs_mmoll", label: "Random Blood Sugar (mmol/L)", type: "number", unit: "mmol/L", referenceRange: "< 7.8", required: false },
      { key: "last_meal_time", label: "Time of Last Meal", type: "text", required: false },
    ],
  },
  {
    name: "Electrolytes, Urea & Creatinine (E/U/Cr)",
    code: "LAB-EUCR",
    category: "Chemical Pathology",
    specimen: "Serum (Plain Tube)",
    reportTitle: "RENAL FUNCTION (ELECTROLYTES, UREA & CREATININE) REPORT",
    notes: "Ion-selective electrode (ISE) and kinetic spectrophotometry.",
    fields: [
      { key: "sodium", label: "Sodium (Na+)", type: "number", unit: "mmol/L", referenceRange: "135 - 145", required: true },
      { key: "potassium", label: "Potassium (K+)", type: "number", unit: "mmol/L", referenceRange: "3.5 - 5.0", required: true },
      { key: "chloride", label: "Chloride (Cl-)", type: "number", unit: "mmol/L", referenceRange: "98 - 108", required: true },
      { key: "bicarbonate", label: "Bicarbonate (HCO3-)", type: "number", unit: "mmol/L", referenceRange: "22 - 29", required: true },
      { key: "urea", label: "Blood Urea", type: "number", unit: "mmol/L", referenceRange: "2.5 - 6.5", required: true },
      { key: "creatinine", label: "Serum Creatinine", type: "number", unit: "umol/L", referenceRange: "60 - 120", required: true },
      { key: "egfr", label: "Estimated GFR (eGFR)", type: "text", unit: "mL/min/1.73m2", referenceRange: "> 90", required: false },
    ],
  },
  {
    name: "Liver Function Tests (LFT)",
    code: "LAB-LFT",
    category: "Chemical Pathology",
    specimen: "Serum (Plain Tube)",
    reportTitle: "LIVER FUNCTION PROFILE REPORT",
    fields: [
      { key: "total_bilirubin", label: "Total Bilirubin", type: "number", unit: "umol/L", referenceRange: "3.4 - 17.1", required: true },
      { key: "direct_bilirubin", label: "Conjugated / Direct Bilirubin", type: "number", unit: "umol/L", referenceRange: "0.0 - 5.1", required: true },
      { key: "ast", label: "AST (SGOT)", type: "number", unit: "U/L", referenceRange: "10 - 40", required: true },
      { key: "alt", label: "ALT (SGPT)", type: "number", unit: "U/L", referenceRange: "7 - 56", required: true },
      { key: "alp", label: "Alkaline Phosphatase (ALP)", type: "number", unit: "U/L", referenceRange: "44 - 147", required: true },
      { key: "total_protein", label: "Total Protein", type: "number", unit: "g/L", referenceRange: "60 - 80", required: true },
      { key: "albumin", label: "Serum Albumin", type: "number", unit: "g/L", referenceRange: "35 - 50", required: true },
      { key: "globulin", label: "Serum Globulin", type: "number", unit: "g/L", referenceRange: "20 - 35", required: false },
    ],
  },
  {
    name: "Lipid Profile Panel",
    code: "LAB-LIPID",
    category: "Chemical Pathology",
    specimen: "Fasting Serum (Plain Tube - 12h fast)",
    reportTitle: "FASTING LIPID PROFILE REPORT",
    fields: [
      { key: "total_cholesterol", label: "Total Cholesterol", type: "number", unit: "mmol/L", referenceRange: "< 5.2", required: true },
      { key: "triglycerides", label: "Triglycerides", type: "number", unit: "mmol/L", referenceRange: "< 1.7", required: true },
      { key: "hdl", label: "HDL Cholesterol ('Good')", type: "number", unit: "mmol/L", referenceRange: "> 1.0 (M) | > 1.3 (F)", required: true },
      { key: "ldl", label: "LDL Cholesterol ('Bad')", type: "number", unit: "mmol/L", referenceRange: "< 3.0", required: true },
      { key: "vldl", label: "VLDL Cholesterol", type: "number", unit: "mmol/L", referenceRange: "0.2 - 0.9", required: false },
      { key: "risk_ratio", label: "Cholesterol / HDL Ratio", type: "text", referenceRange: "< 4.5", required: false },
    ],
  },
  {
    name: "Blood Group & Rhesus Factor",
    code: "LAB-BG-RH",
    category: "Haematology",
    specimen: "Whole Blood (EDTA)",
    reportTitle: "BLOOD GROUP (ABO/Rh) REPORT",
    fields: [
      { key: "abo_group", label: "ABO Blood Group", type: "select", referenceRange: "A, B, AB, or O", options: ["Group A", "Group B", "Group AB", "Group O"], required: true },
      { key: "rhesus", label: "Rhesus (Rh D) Factor", type: "select", referenceRange: "Positive / Negative", options: ["Rhesus Positive (Rh+)", "Rhesus Negative (Rh-)"], required: true },
    ],
  },
  {
    name: "Haemoglobin Genotype",
    code: "LAB-GENOTYPE",
    category: "Haematology",
    specimen: "Whole Blood (EDTA)",
    reportTitle: "HAEMOGLOBIN GENOTYPE REPORT",
    notes: "Cellulose acetate electrophoresis at pH 8.6 with known AA and AS controls.",
    fields: [
      { key: "genotype", label: "Genotype", type: "select", referenceRange: "AA", options: ["AA (Normal Adult)", "AS (Sickle Cell Trait)", "SS (Sickle Cell Disease)", "AC (Hb C Trait)", "SC (Hb SC Disease)"], required: true },
      { key: "electrophoretic_pattern", label: "Electrophoresis Comments", type: "text", required: false },
    ],
  },
  {
    name: "Hepatitis B Surface Antigen (HBsAg)",
    code: "LAB-HBSAG",
    category: "Serology",
    specimen: "Serum or Plasma",
    reportTitle: "HEPATITIS B VIRUS SURFACE ANTIGEN REPORT",
    fields: [
      { key: "hbsag_result", label: "HBsAg Screening", type: "select", referenceRange: "Non-Reactive (Negative)", options: ["Non-Reactive (Negative)", "Reactive (Positive)", "Indeterminate / Repeat"], required: true },
      { key: "test_method", label: "Method / Kit", type: "text", referenceRange: "Rapid Chromatographic Strip", required: false },
    ],
  },
  {
    name: "Hepatitis C Virus Antibody (HCV)",
    code: "LAB-HCV",
    category: "Serology",
    specimen: "Serum or Plasma",
    reportTitle: "HEPATITIS C VIRUS ANTIBODY REPORT",
    fields: [
      { key: "hcv_result", label: "HCV Antibody Screening", type: "select", referenceRange: "Non-Reactive (Negative)", options: ["Non-Reactive (Negative)", "Reactive (Positive)", "Indeterminate"], required: true },
      { key: "test_method", label: "Method / Kit", type: "text", referenceRange: "Rapid Chromatographic Assay", required: false },
    ],
  },
  {
    name: "Retroviral Screening (HIV 1 & 2)",
    code: "LAB-HIV",
    category: "Serology",
    specimen: "Whole Blood / Serum / Plasma",
    reportTitle: "RETROVIRAL SCREENING (HIV 1 & 2) REPORT",
    notes: "National serial algorithm: Determine -> Stat-Pak -> Uni-Gold.",
    fields: [
      { key: "hiv_overall_result", label: "Overall Final Result", type: "select", referenceRange: "Non-Reactive", options: ["Non-Reactive (Negative)", "Reactive (Positive)", "Inconclusive / Tie-breaker Needed"], required: true },
      { key: "test_1_determine", label: "Test 1 (Determine)", type: "select", referenceRange: "Non-Reactive", options: ["Non-Reactive", "Reactive"], required: true },
      { key: "test_2_statpak", label: "Test 2 (Stat-Pak)", type: "select", referenceRange: "Non-Reactive", options: ["Not Applicable", "Non-Reactive", "Reactive"], required: false },
      { key: "counseling_note", label: "Counselor Comments", type: "text", required: false },
    ],
  },
  {
    name: "Pregnancy Test (PT - hCG)",
    code: "LAB-PT",
    category: "Rapid Test",
    specimen: "Early Morning Urine / Serum",
    reportTitle: "PREGNANCY IMMUNOASSAY (hCG) REPORT",
    fields: [
      { key: "pt_result", label: "hCG Result", type: "select", referenceRange: "Negative", options: ["Positive (+ve)", "Negative (-ve)", "Inconclusive / Faint Line"], required: true },
      { key: "specimen_type", label: "Sample Type", type: "select", referenceRange: "Urine", options: ["Fresh Urine", "Serum"], required: true },
    ],
  },
  {
    name: "Stool Routine & Microscopy",
    code: "LAB-STOOL-MCS",
    category: "Parasitology",
    specimen: "Fresh Stool",
    reportTitle: "STOOL EXAMINATION & PARASITOLOGY REPORT",
    fields: [
      { key: "stool_color", label: "Colour", type: "select", referenceRange: "Brown", options: ["Brown", "Yellowish", "Dark Brown / Black", "Greenish", "Pale / Clay-coloured", "Blood-stained"], required: true },
      { key: "consistency", label: "Consistency", type: "select", referenceRange: "Formed", options: ["Formed", "Semi-formed", "Soft", "Watery / Diarrhoeic", "Mucoid"], required: true },
      { key: "blood_mucus", label: "Macroscopic Blood / Mucus", type: "select", referenceRange: "None", options: ["None", "Blood present", "Mucus present", "Both present"], required: false },
      { key: "microscopy_findings", label: "Microscopy (Ova / Cysts / Parasites)", type: "textarea", referenceRange: "No cysts or ova seen", required: true },
      { key: "pus_cells", label: "Pus Cells", type: "text", unit: "/HPF", referenceRange: "0 - 2 /HPF", required: false },
      { key: "red_cells", label: "Red Blood Cells", type: "text", unit: "/HPF", referenceRange: "None seen", required: false },
    ],
  },
  {
    name: "High Vaginal Swab (HVS) M/C/S",
    code: "LAB-HVS",
    category: "Microbiology",
    specimen: "High Vaginal Swab (HVS)",
    reportTitle: "HIGH VAGINAL SWAB (HVS) INVESTIGATION REPORT",
    fields: [
      { key: "wet_mount_yeast", label: "Yeast Cells (Candida)", type: "select", referenceRange: "None seen", options: ["None seen", "Seen (+)", "Moderate (++)", "Profuse (+++)"], required: true },
      { key: "wet_mount_trichomonas", label: "Trichomonas vaginalis", type: "select", referenceRange: "None seen", options: ["None seen", "Seen (+)"], required: true },
      { key: "clue_cells", label: "Clue Cells (Bacterial Vaginosis)", type: "select", referenceRange: "Absent", options: ["Absent", "Present"], required: false },
      { key: "pus_cells", label: "Pus Cells", type: "text", unit: "/HPF", referenceRange: "0 - 5 /HPF", required: false },
      { key: "gram_stain", label: "Gram Stain", type: "textarea", referenceRange: "Normal vaginal flora", required: false },
      { key: "culture_isolate", label: "Culture & Sensitivity Isolate", type: "textarea", referenceRange: "No pathogenic growth", required: false },
    ],
  },
  {
    name: "Urine Microscopy Culture & Sensitivity (Urine M/C/S)",
    code: "LAB-URINE-MCS",
    category: "Microbiology",
    specimen: "Mid-stream Clean Catch Urine",
    reportTitle: "URINE M/C/S REPORT",
    fields: [
      { key: "microscopy", label: "Microscopy (Centrifuged Deposit)", type: "textarea", referenceRange: "Pus cells: 0-4/HPF, No casts", required: true },
      { key: "culture", label: "Culture Findings", type: "textarea", referenceRange: "No significant bacteriuria (<10^4 CFU/mL)", required: true },
      { key: "organism", label: "Organism Isolated", type: "text", required: false },
      { key: "sensitivity", label: "Antibiotic Sensitivity", type: "textarea", required: false },
      { key: "resistance", label: "Antibiotic Resistance", type: "textarea", required: false },
    ],
  },
  {
    name: "Erythrocyte Sedimentation Rate (ESR)",
    code: "LAB-ESR",
    category: "Haematology",
    specimen: "Whole Blood (Sodium Citrate / EDTA)",
    reportTitle: "ERYTHROCYTE SEDIMENTATION RATE (ESR) REPORT",
    fields: [
      { key: "esr_1hr", label: "ESR (1st Hour)", type: "number", unit: "mm/hr", referenceRange: "Men: 0 - 15 | Women: 0 - 20", required: true },
      { key: "interpretation", label: "Clinical Impression", type: "text", referenceRange: "Normal / Elevated", required: false },
    ],
  },
  {
    name: "Coagulation Profile (PT / INR / PTTK)",
    code: "LAB-COAG",
    category: "Haematology",
    specimen: "Citrated Plasma (3.2% Sodium Citrate)",
    reportTitle: "COAGULATION PROFILE (PROTHROMBIN TIME & INR) REPORT",
    fields: [
      { key: "pt_patient", label: "Patient PT", type: "number", unit: "seconds", referenceRange: "11.0 - 14.5", required: true },
      { key: "pt_control", label: "Control PT", type: "number", unit: "seconds", referenceRange: "12.0 - 13.5", required: true },
      { key: "inr", label: "International Normalised Ratio (INR)", type: "number", unit: "Ratio", referenceRange: "0.8 - 1.2 (Therapeutic: 2.0 - 3.0)", required: true },
      { key: "pttk_patient", label: "Patient PTTK / APTT", type: "number", unit: "seconds", referenceRange: "28.0 - 42.0", required: false },
      { key: "pttk_control", label: "Control PTTK / APTT", type: "number", unit: "seconds", referenceRange: "30.0 - 36.0", required: false },
    ],
  },
  {
    name: "Seminal Fluid Analysis (SFA)",
    code: "LAB-SEMEN",
    category: "Andrology",
    specimen: "Fresh Semen (3-5 days abstinence)",
    reportTitle: "SEMINAL FLUID ANALYSIS (WHO 6th EDITION) REPORT",
    fields: [
      { key: "abstinence_days", label: "Abstinence Period", type: "number", unit: "days", referenceRange: "3 - 5 days", required: true },
      { key: "volume", label: "Volume", type: "number", unit: "mL", referenceRange: ">= 1.5 mL", required: true },
      { key: "liquefaction_time", label: "Liquefaction Time", type: "text", unit: "mins", referenceRange: "< 60 minutes", required: false },
      { key: "sperm_concentration", label: "Sperm Concentration", type: "number", unit: "Million/mL", referenceRange: ">= 15 Million/mL", required: true },
      { key: "progressive_motility", label: "Progressive Motility (PR)", type: "number", unit: "%", referenceRange: ">= 32%", required: true },
      { key: "total_motility", label: "Total Motility (PR + NP)", type: "number", unit: "%", referenceRange: ">= 40%", required: true },
      { key: "morphology_normal", label: "Normal Morphology", type: "number", unit: "%", referenceRange: ">= 4%", required: true },
      { key: "pus_cells", label: "Pus Cells", type: "text", unit: "/HPF", referenceRange: "< 5 /HPF", required: false },
      { key: "conclusion", label: "Conclusion", type: "text", referenceRange: "Normozoospermia", required: false },
    ],
  },
  {
    name: "Prostate Specific Antigen (Total PSA)",
    code: "LAB-PSA",
    category: "Chemical Pathology / Tumour Markers",
    specimen: "Serum (Plain Tube)",
    reportTitle: "TOTAL PROSTATE SPECIFIC ANTIGEN (PSA) REPORT",
    fields: [
      { key: "psa_value", label: "Total PSA", type: "number", unit: "ng/mL", referenceRange: "< 4.0", required: true },
      { key: "interpretation", label: "Age-Specific Reference", type: "text", referenceRange: "40-49: <2.5 | 50-59: <3.5 | 60-69: <4.5", required: false },
    ],
  },
  {
    name: "Helicobacter pylori (H. Pylori) Antigen / Antibody",
    code: "LAB-HPYLORI",
    category: "Serology / Microbiology",
    specimen: "Fresh Stool / Serum",
    reportTitle: "HELICOBACTER PYLORI SCREENING REPORT",
    fields: [
      { key: "test_type", label: "Test Type", type: "select", referenceRange: "Stool Antigen / Blood Antibody", options: ["Stool Antigen (Ag)", "Serum Antibody (Ab)"], required: true },
      { key: "hpylori_result", label: "Result", type: "select", referenceRange: "Negative", options: ["Negative", "Positive", "Equivocal"], required: true },
    ],
  },
  {
    name: "Syphilis Screening (VDRL / TPHA)",
    code: "LAB-VDRL",
    category: "Serology",
    specimen: "Serum (Plain Tube)",
    reportTitle: "SYPHILIS SEROLOGY (VDRL / TPHA) REPORT",
    fields: [
      { key: "vdrl_result", label: "VDRL Screening Result", type: "select", referenceRange: "Non-Reactive", options: ["Non-Reactive", "Reactive"], required: true },
      { key: "vdrl_titre", label: "VDRL Titre (if Reactive)", type: "select", referenceRange: "None", options: ["None", "1:1", "1:2", "1:4", "1:8", "1:16", "1:32", "1:64+"], required: false },
      { key: "tpha_confirmatory", label: "TPHA Confirmatory", type: "select", referenceRange: "Non-Reactive", options: ["Not done", "Non-Reactive", "Reactive"], required: false },
    ],
  },
  {
    name: "Sputum Acid-Fast Bacilli (AFB / TB)",
    code: "LAB-AFB",
    category: "Microbiology",
    specimen: "Early Morning Sputum (Purulent)",
    reportTitle: "SPUTUM ACID FAST BACILLI (ZIEHL-NEELSEN) REPORT",
    fields: [
      { key: "sample_quality", label: "Sample Appearance", type: "select", referenceRange: "Mucopurulent", options: ["Salivary", "Mucoid", "Mucopurulent", "Blood-stained"], required: true },
      { key: "afb_result", label: "Acid Fast Bacilli (AFB)", type: "select", referenceRange: "No AFB seen (Negative)", options: ["No AFB seen (Negative)", "Scanty (1-9 AFB/100 fields)", "Positive 1+ (10-99 AFB/100 fields)", "Positive 2+ (1-10 AFB/field)", "Positive 3+ (>10 AFB/field)"], required: true },
      { key: "gene_xpert", label: "GeneXpert MTB/RIF (if performed)", type: "text", referenceRange: "MTB Not Detected", required: false },
    ],
  },
  {
    name: "Glycated Haemoglobin (HbA1c)",
    code: "LAB-HBA1C",
    category: "Chemical Pathology",
    specimen: "Whole Blood (EDTA)",
    reportTitle: "GLYCATED HAEMOGLOBIN (HbA1c) REPORT",
    fields: [
      { key: "hba1c_percent", label: "HbA1c (%)", type: "number", unit: "%", referenceRange: "Normal: < 5.7% | Pre-diabetes: 5.7 - 6.4% | Diabetes: >= 6.5%", required: true },
      { key: "estimated_avg_glucose", label: "Estimated Average Glucose (eAG)", type: "number", unit: "mg/dL", referenceRange: "< 126", required: false },
      { key: "glycaemic_control", label: "Glycaemic Control Target", type: "text", referenceRange: "Diabetic Target: < 7.0%", required: false },
    ],
  },
  {
    name: "Thyroid Function Tests (TFT)",
    code: "LAB-TFT",
    category: "Endocrinology",
    specimen: "Serum (Plain Tube)",
    reportTitle: "THYROID FUNCTION PROFILE REPORT",
    fields: [
      { key: "tsh", label: "Thyroid Stimulating Hormone (TSH)", type: "number", unit: "uIU/mL", referenceRange: "0.4 - 4.5", required: true },
      { key: "free_t4", label: "Free Thyroxine (FT4)", type: "number", unit: "pmol/L", referenceRange: "9.0 - 25.0", required: true },
      { key: "free_t3", label: "Free Triiodothyronine (FT3)", type: "number", unit: "pmol/L", referenceRange: "3.5 - 6.5", required: false },
      { key: "interpretation", label: "Clinical Interpretation", type: "text", referenceRange: "Euthyroid / Hypothyroid / Hyperthyroid", required: false },
    ],
  },
  {
    name: "Serum Uric Acid",
    code: "LAB-URIC",
    category: "Chemical Pathology",
    specimen: "Serum (Plain Tube)",
    reportTitle: "SERUM URIC ACID REPORT",
    fields: [
      { key: "uric_acid", label: "Uric Acid", type: "number", unit: "umol/L", referenceRange: "Male: 200 - 420 | Female: 140 - 340", required: true },
      { key: "gout_comment", label: "Gout Assessment", type: "text", referenceRange: "< 360 umol/L target for gout treatment", required: false },
    ],
  },
];

export async function seedNigerianLaboratoryTemplates() {
  const seededTemplates: Array<{ id: string; name: string; code: string }> = [];

  for (const template of STANDARD_NIGERIAN_LAB_TEMPLATES) {
    const saved = await prisma.laboratoryTemplate.upsert({
      where: { code: template.code },
      update: {
        name: template.name,
        category: template.category,
        specimen: template.specimen,
        reportTitle: template.reportTitle,
        notes: template.notes ?? null,
        fields: template.fields,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: template.name,
        code: template.code,
        category: template.category,
        specimen: template.specimen,
        reportTitle: template.reportTitle,
        notes: template.notes ?? null,
        fields: template.fields,
        isActive: true,
      },
    });

    seededTemplates.push({
      id: saved.id,
      name: saved.name,
      code: saved.code ?? template.code,
    });
  }

  logger.info(`Successfully seeded ${seededTemplates.length} Nigerian laboratory templates`);
  return seededTemplates;
}
