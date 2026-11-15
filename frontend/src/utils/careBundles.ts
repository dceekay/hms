export interface CareBundle {
  id: string;
  label: string;
  summary: string;
  diagnosis: string;
  plan: string;
  labKeywords: string[];
  rxItems: Array<{
    medicationName: string;
    strength?: string;
    dose: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions?: string;
  }>;
}

export const CARE_BUNDLES: CareBundle[] = [
  {
    id: "malaria-workup",
    label: "Malaria Workup",
    summary: "MP + FBC + ACT + Paracetamol",
    diagnosis: "Uncomplicated Malaria",
    plan: "Complete 3-day antimalarial course, maintain oral hydration, return if fever persists >48h.",
    labKeywords: ["malaria", "mp", "fbc", "full blood"],
    rxItems: [
      {
        medicationName: "Artemether Lumefantrine",
        strength: "80/480mg",
        dose: "1 tablet",
        frequency: "Twice daily (BD)",
        duration: "3 days",
        quantity: 6,
        instructions: "Take after meals",
      },
      {
        medicationName: "Paracetamol",
        strength: "500mg",
        dose: "1g (2 tablets)",
        frequency: "Every 8 hours (TDS)",
        duration: "3 days",
        quantity: 18,
        instructions: "For fever or body aches",
      },
    ],
  },
  {
    id: "enteric-fever",
    label: "Enteric / Typhoid",
    summary: "Widal/Blood Culture + FBC + Antibiotic",
    diagnosis: "Suspected Enteric Fever",
    plan: "Ensure full antibiotic course, oral hydration, review lab results on follow-up.",
    labKeywords: ["widal", "typhoid", "fbc", "full blood"],
    rxItems: [
      {
        medicationName: "Ciprofloxacin",
        strength: "500mg",
        dose: "500mg",
        frequency: "Twice daily (BD)",
        duration: "7 days",
        quantity: 14,
        instructions: "Take with full glass of water",
      },
      {
        medicationName: "Paracetamol",
        strength: "500mg",
        dose: "1g (2 tablets)",
        frequency: "Every 8 hours (TDS)",
        duration: "3 days",
        quantity: 18,
        instructions: "Take after food",
      },
    ],
  },
  {
    id: "hypertension-review",
    label: "Hypertension Review",
    summary: "E/U/Cr + Lipid Profile + Amlodipine",
    diagnosis: "Essential Hypertension",
    plan: "Low-salt diet, daily BP monitoring, regular exercise, review in 2 weeks.",
    labKeywords: ["electrolyte", "urea", "creatinine", "lipid", "urinalysis"],
    rxItems: [
      {
        medicationName: "Amlodipine",
        strength: "5mg",
        dose: "5mg",
        frequency: "Once daily (OD)",
        duration: "30 days",
        quantity: 30,
        instructions: "Take every morning",
      },
    ],
  },
  {
    id: "antenatal-booking",
    label: "Antenatal Booking",
    summary: "PCV + Blood Group + Urinalysis + Folic Acid + Iron",
    diagnosis: "Routine Antenatal Booking",
    plan: "Routine ANC follow-up, balanced diet, tetanus toxoid check, report warning signs.",
    labKeywords: ["pcv", "blood group", "urinalysis", "hiv", "hbsag"],
    rxItems: [
      {
        medicationName: "Folic Acid",
        strength: "5mg",
        dose: "5mg",
        frequency: "Once daily (OD)",
        duration: "30 days",
        quantity: 30,
        instructions: "Take daily",
      },
      {
        medicationName: "Ferrous Sulphate",
        strength: "200mg",
        dose: "200mg",
        frequency: "Once daily (OD)",
        duration: "30 days",
        quantity: 30,
        instructions: "Take after meals",
      },
    ],
  },
  {
    id: "respiratory-infection",
    label: "Chest / Throat Infection",
    summary: "FBC + Amoxicillin + Paracetamol",
    diagnosis: "Acute Respiratory Tract Infection",
    plan: "Warm fluids, complete antibiotic course, return if shortness of breath develops.",
    labKeywords: ["fbc", "full blood"],
    rxItems: [
      {
        medicationName: "Amoxicillin",
        strength: "500mg",
        dose: "500mg",
        frequency: "Every 8 hours (TDS)",
        duration: "5 days",
        quantity: 15,
        instructions: "Complete full course",
      },
      {
        medicationName: "Paracetamol",
        strength: "500mg",
        dose: "1g (2 tablets)",
        frequency: "Every 8 hours (TDS)",
        duration: "3 days",
        quantity: 18,
        instructions: "For fever or throat pain",
      },
    ],
  },
];
