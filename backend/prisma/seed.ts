import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const permissions = [
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "users.manage_roles",
  "roles.read",
  "roles.create",
  "roles.update",
  "roles.delete",
  "permissions.read",
  "permissions.write",
  "permissions.delete",
  "departments.read",
  "departments.create",
  "departments.update",
  "departments.delete",
  "hospital_profile.read",
  "hospital_profile.update",
  "setup.read",
  "setup.create",
  "setup.update",
  "setup.delete",
  "appointments.read",
  "appointments.create",
  "appointments.update",
  "patients.read",
  "patients.create",
  "patients.investigation.create",
  "patients.update",
  "patients.delete",
  "patients.convert",
  "patients.reactivate",
  "laboratory.read",
  "laboratory.create",
  "laboratory.update",
  "laboratory.result",
  "clinical.read",
  "clinical.create",
  "clinical.update",
  "prescriptions.read",
  "prescriptions.create",
  "prescriptions.update",
  "pharmacy.read",
  "pharmacy.create",
  "pharmacy.update",
  "pharmacy.dispense",
  "billing.read",
  "billing.create",
  "inventory.read",
  "inventory.create",
  "inventory.update",
  "inventory.issue",
  "reports.read",
  "security.entry.read",
  "security.entry.create",
  "security.entry.update",
  "semsas.read",
  "semsas.create",
  "semsas.update",
  "semsas.file",
] as const;

const roles = [
  { name: "Super Admin", description: "System Administrator" },
  { name: "Administrator", description: "Hospital Administrator" },
  { name: "Doctor", description: "Medical Doctor" },
  { name: "Nurse", description: "Nursing Staff" },
  { name: "Receptionist", description: "Front Desk Receptionist" },
  { name: "Laboratory", description: "Laboratory Staff" },
  { name: "Pharmacist", description: "Pharmacy Staff" },
  { name: "Billing Officer", description: "Billing and Accounts Staff" },
  { name: "Security", description: "Entry Point Security Staff" },
] as const;

const hospitalServices = [
  {
    name: "Administration",
    code: "ADMIN",
    description: "Administrative leadership and system setup",
    price: 0,
  },
  {
    name: "Reception",
    code: "RECEP",
    description: "Patient registration and front desk services",
    price: 0,
  },
  {
    name: "Cashier",
    code: "CASH",
    description: "Payment collection and cashier desk",
    price: 0,
  },
  {
    name: "Consultation",
    code: "CONS",
    description: "Outpatient and doctor consultation",
    price: 5000,
  },
  {
    name: "Laboratory",
    code: "LAB",
    description: "Laboratory tests and sample processing",
    price: 0,
  },
  {
    name: "Radiology",
    code: "RAD",
    description: "Radiology imaging services",
    price: 0,
  },
  {
    name: "Scanning and ECG",
    code: "SCAN-ECG",
    description: "Ultrasound scanning and ECG services",
    price: 0,
  },
  {
    name: "Admission",
    code: "ADM",
    description: "Inpatient admission and ward care",
    price: 0,
  },
  {
    name: "Surgery and Theatre",
    code: "SURG-TH",
    description: "Surgical and theatre services",
    price: 0,
  },
  {
    name: "Maternity and Labour Room",
    code: "MAT-LR",
    description: "Maternity care and labour room services",
    price: 0,
  },
  {
    name: "MVA",
    code: "MVA",
    description: "Manual vacuum aspiration service",
    price: 0,
  },
  {
    name: "Immunization",
    code: "IMM",
    description: "Vaccination and immunization services",
    price: 0,
  },
  {
    name: "ANC / Antenatal Care",
    code: "ANC",
    description: "Antenatal clinic services",
    price: 0,
  },
  {
    name: "Dental and Ophthalmology",
    code: "DENT-OPH",
    description: "Dental care and eye clinic services",
    price: 0,
  },
  {
    name: "Dressing",
    code: "DRESS",
    description: "Wound dressing and minor procedures",
    price: 0,
  },
  {
    name: "Physiotherapy",
    code: "PHYSIO",
    description: "Physiotherapy and rehabilitation services",
    price: 0,
  },
  {
    name: "Pharmacy",
    code: "PHARM",
    description: "Pharmacy dispensing services",
    price: 0,
  },
  {
    name: "Security",
    code: "SEC",
    description: "Entry point security desk",
    price: 0,
  },
] as const;

type PermissionName = (typeof permissions)[number];
type RoleName = (typeof roles)[number]["name"];
type HospitalServiceCode = (typeof hospitalServices)[number]["code"];

const rolePermissions: Record<RoleName, PermissionName[]> = {
  "Super Admin": [...permissions],
  Administrator: [
    "users.read",
    "users.create",
    "users.update",
    "users.delete",
    "users.manage_roles",
    "roles.read",
    "roles.create",
    "roles.update",
    "roles.delete",
    "permissions.read",
    "permissions.write",
    "permissions.delete",
    "departments.read",
    "departments.create",
    "departments.update",
    "departments.delete",
    "hospital_profile.read",
    "hospital_profile.update",
    "appointments.read",
    "appointments.create",
    "appointments.update",
    "patients.read",
    "patients.create",
    "patients.investigation.create",
    "patients.update",
    "patients.delete",
    "patients.convert",
    "patients.reactivate",
    "laboratory.read",
    "laboratory.create",
    "laboratory.update",
    "clinical.read",
    "clinical.create",
    "clinical.update",
    "prescriptions.read",
    "prescriptions.create",
    "prescriptions.update",
    "billing.read",
    "billing.create",
    "semsas.read",
    "semsas.create",
    "semsas.update",
    "semsas.file",
    "inventory.read",
    "inventory.create",
    "inventory.update",
    "inventory.issue",
  ],
  Doctor: [
    "appointments.read",
    "appointments.update",
    "patients.read",
    "laboratory.read",
    "laboratory.create",
    "clinical.read",
    "clinical.create",
    "clinical.update",
    "prescriptions.read",
    "prescriptions.create",
  ],
  Nurse: ["patients.read"],
  Receptionist: [
    "appointments.read",
    "appointments.create",
    "appointments.update",
    "patients.read",
    "patients.create",
    "patients.investigation.create",
    "patients.update",
    "patients.convert",
    "patients.reactivate",
    "semsas.read",
    "semsas.create",
    "semsas.update",
    "inventory.read",
    "inventory.create",
    "inventory.update",
    "inventory.issue",
  ],
  Laboratory: [
    "laboratory.read",
    "laboratory.create",
    "laboratory.update",
    "laboratory.result",
    "patients.read",
    "patients.investigation.create",
    "patients.update",
  ],
  Pharmacist: [
    "pharmacy.read",
    "pharmacy.create",
    "pharmacy.update",
    "pharmacy.dispense",
    "prescriptions.read",
    "prescriptions.update",
    "inventory.read",
    "inventory.create",
    "inventory.update",
    "inventory.issue",
    "patients.read",
  ],
  "Billing Officer": [
    "billing.read",
    "billing.create",
    "reports.read",
    "patients.read",
    "semsas.read",
    "semsas.file",
  ],
  Security: ["security.entry.read", "security.entry.create", "security.entry.update"],
};

const testUsers = [
  {
    role: "Super Admin",
    email: "admin@ceekayx.com",
    username: "admin",
    password: "Admin@123",
    firstName: "System",
    lastName: "Administrator",
    serviceCode: "ADMIN",
  },
  {
    role: "Doctor",
    email: "doctor@ceekayx.com",
    username: "drjohn",
    password: "Doctor@123",
    firstName: "John",
    lastName: "Doe",
    phone: "+2348012345678",
    serviceCode: "CONS",
  },
  {
    role: "Receptionist",
    email: "reception@ceekayx.com",
    username: "reception",
    password: "Reception@123",
    firstName: "Jane",
    lastName: "Smith",
    phone: "+2348098765432",
    serviceCode: "RECEP",
  },
  {
    role: "Nurse",
    email: "nurse@ceekayx.com",
    username: "nurseama",
    password: "Nurse@123",
    firstName: "Amina",
    lastName: "Bello",
    phone: "+2348070001001",
    serviceCode: "ADM",
  },
  {
    role: "Laboratory",
    email: "lab@ceekayx.com",
    username: "labtech",
    password: "Lab@12345",
    firstName: "Samuel",
    lastName: "Okoro",
    phone: "+2348070001002",
    serviceCode: "LAB",
  },
  {
    role: "Pharmacist",
    email: "pharmacy@ceekayx.com",
    username: "pharm",
    password: "Pharm@123",
    firstName: "Fatima",
    lastName: "Musa",
    phone: "+2348070001003",
    serviceCode: "PHARM",
  },
  {
    role: "Billing Officer",
    email: "billing@ceekayx.com",
    username: "billing",
    password: "Billing@123",
    firstName: "David",
    lastName: "Ibrahim",
    phone: "+2348070001004",
    serviceCode: "CASH",
  },
  {
    role: "Security",
    email: "security@ceekayx.com",
    username: "security",
    password: "Security@123",
    firstName: "Peter",
    lastName: "Gate",
    phone: "+2348070001005",
    serviceCode: "SEC",
  },
] satisfies Array<{
  role: RoleName;
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  serviceCode?: HospitalServiceCode;
}>;

const demoInventoryItems = [
  {
    name: "Examination Gloves",
    code: "INV-GLOVES",
    category: "Consumables",
    itemType: "Clinical supply",
    description: "Disposable examination gloves",
    unit: "box",
    location: "Main Store",
    department: "General",
    supplier: "Default Medical Supplier",
    costPrice: 4500,
    currentStock: 45,
    reorderLevel: 12,
    isConsumable: true,
  },
  {
    name: "Syringes 5ml",
    code: "INV-SYR-5ML",
    category: "Consumables",
    itemType: "Clinical supply",
    description: "Sterile 5ml syringes",
    unit: "pack",
    location: "Main Store",
    department: "Nursing",
    supplier: "Default Medical Supplier",
    costPrice: 2200,
    currentStock: 30,
    reorderLevel: 10,
    isConsumable: true,
  },
  {
    name: "Blood Pressure Monitor",
    code: "INV-BP-MON",
    category: "Equipment",
    itemType: "Diagnostic equipment",
    description: "Digital blood pressure monitor",
    unit: "piece",
    location: "OPD",
    department: "Consultation",
    supplier: "Biomedical Store",
    serialNumber: "MDS-BP-001",
    costPrice: 35000,
    currentStock: 4,
    reorderLevel: 1,
    isConsumable: false,
  },
  {
    name: "IV Cannula",
    code: "INV-IV-CAN",
    category: "Consumables",
    itemType: "Clinical supply",
    description: "Sterile IV cannula assorted sizes",
    unit: "pack",
    location: "Main Store",
    department: "Emergency",
    supplier: "Default Medical Supplier",
    costPrice: 5200,
    currentStock: 9,
    reorderLevel: 10,
    isConsumable: true,
  },
  {
    name: "Patient Bed Sheet",
    code: "INV-BEDSHEET",
    category: "Linen",
    itemType: "Ward material",
    description: "Reusable hospital bed sheets",
    unit: "piece",
    location: "Laundry Store",
    department: "Ward",
    supplier: "Facility Store",
    costPrice: 2800,
    currentStock: 24,
    reorderLevel: 8,
    isConsumable: false,
  },
  {
    name: "Oxygen Cylinder",
    code: "INV-OXY-CYL",
    category: "Equipment",
    itemType: "Emergency equipment",
    description: "Portable oxygen cylinder",
    unit: "cylinder",
    location: "Emergency Room",
    department: "Emergency",
    supplier: "Biomedical Store",
    serialNumber: "MDS-OXY-001",
    costPrice: 85000,
    currentStock: 2,
    reorderLevel: 1,
    isConsumable: false,
  },
  {
    name: "Autoclave Sterilizer",
    code: "INV-AUTOCLAVE",
    category: "Appliances",
    itemType: "Sterilization equipment",
    description: "Tabletop autoclave sterilizer for theatre and dressing instruments",
    unit: "unit",
    location: "Theatre",
    department: "Surgery and Theatre",
    supplier: "Biomedical Store",
    serialNumber: "MDS-AUTO-001",
    costPrice: 420000,
    currentStock: 1,
    reorderLevel: 1,
    isConsumable: false,
  },
  {
    name: "Pharmacy Refrigerator",
    code: "INV-PHARM-FRIDGE",
    category: "Appliances",
    itemType: "Cold chain appliance",
    description: "Medicine and vaccine storage refrigerator",
    unit: "unit",
    location: "Pharmacy",
    department: "Pharmacy",
    supplier: "Facility Store",
    serialNumber: "MDS-FRIDGE-001",
    costPrice: 280000,
    currentStock: 1,
    reorderLevel: 1,
    isConsumable: false,
  },
  {
    name: "Patient Stretcher",
    code: "INV-STRETCHER",
    category: "Appliances",
    itemType: "Patient movement equipment",
    description: "Mobile stretcher for emergency and ward transfers",
    unit: "unit",
    location: "Emergency Room",
    department: "Emergency",
    supplier: "Biomedical Store",
    serialNumber: "MDS-STR-001",
    costPrice: 115000,
    currentStock: 2,
    reorderLevel: 1,
    isConsumable: false,
  },
  {
    name: "ECG Machine",
    code: "INV-ECG",
    category: "Appliances",
    itemType: "Diagnostic appliance",
    description: "Portable ECG machine for cardiac assessment",
    unit: "unit",
    location: "Scanning and ECG",
    department: "Scanning and ECG",
    supplier: "Biomedical Store",
    serialNumber: "MDS-ECG-001",
    costPrice: 650000,
    currentStock: 1,
    reorderLevel: 1,
    isConsumable: false,
  },
] as const;

const demoMedications = [
  {
    name: "Paracetamol",
    genericName: "Acetaminophen",
    category: "Analgesic",
    strength: "500mg",
    dosageForm: "Tablet",
    unit: "tablet",
    sellingPrice: 100,
    costPrice: 45,
    currentStock: 250,
    reorderLevel: 50,
    batchNumber: "PCM-500-A",
  },
  {
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    category: "Antibiotic",
    strength: "500mg",
    dosageForm: "Capsule",
    unit: "capsule",
    sellingPrice: 250,
    costPrice: 120,
    currentStock: 120,
    reorderLevel: 30,
    batchNumber: "AMX-500-B",
  },
  {
    name: "ORS",
    genericName: "Oral Rehydration Salt",
    category: "Rehydration",
    strength: "Sachet",
    dosageForm: "Powder",
    unit: "sachet",
    sellingPrice: 150,
    costPrice: 70,
    currentStock: 80,
    reorderLevel: 20,
    batchNumber: "ORS-001",
  },
  {
    name: "Ceftriaxone",
    genericName: "Ceftriaxone",
    category: "Antibiotic",
    strength: "1g",
    dosageForm: "Injection",
    unit: "vial",
    sellingPrice: 1800,
    costPrice: 1050,
    currentStock: 35,
    reorderLevel: 12,
    batchNumber: "CEF-1G-C",
  },
  {
    name: "Artemether Lumefantrine",
    genericName: "Artemether Lumefantrine",
    category: "Antimalarial",
    strength: "20/120mg",
    dosageForm: "Tablet",
    unit: "tablet",
    sellingPrice: 220,
    costPrice: 110,
    currentStock: 18,
    reorderLevel: 25,
    batchNumber: "AL-20120-D",
  },
  {
    name: "Normal Saline",
    genericName: "Sodium Chloride",
    category: "IV Fluid",
    strength: "500ml",
    dosageForm: "Infusion",
    unit: "bottle",
    sellingPrice: 900,
    costPrice: 520,
    currentStock: 0,
    reorderLevel: 15,
    batchNumber: "NS-500-E",
  },
] as const;

const demoLaboratoryTemplates = [
  {
    name: "Malaria Parasite Test",
    code: "LAB-MP",
    category: "Parasitology",
    specimen: "Blood",
    reportTitle: "Malaria Parasite Result",
    notes: "Record parasite status and density where applicable.",
    fields: [
      { key: "parasiteSeen", label: "Malaria parasite seen", type: "select", options: ["Negative", "Positive"], required: true },
      { key: "parasiteDensity", label: "Parasite density", type: "text", referenceRange: "Negative", required: false },
      { key: "method", label: "Method", type: "text", required: false },
    ],
  },
  {
    name: "Full Blood Count",
    code: "LAB-FBC",
    category: "Haematology",
    specimen: "Blood",
    reportTitle: "Full Blood Count Report",
    fields: [
      { key: "hb", label: "Haemoglobin", type: "number", unit: "g/dL", referenceRange: "11.5 - 16.5", required: true },
      { key: "pcv", label: "PCV", type: "number", unit: "%", referenceRange: "36 - 50", required: true },
      { key: "wbc", label: "WBC", type: "number", unit: "10^9/L", referenceRange: "4.0 - 11.0", required: true },
      { key: "platelets", label: "Platelets", type: "number", unit: "10^9/L", referenceRange: "150 - 450", required: true },
    ],
  },
  {
    name: "Urinalysis",
    code: "LAB-URINE",
    category: "Chemical Pathology",
    specimen: "Urine",
    reportTitle: "Urinalysis Report",
    fields: [
      { key: "appearance", label: "Appearance", type: "text", required: true },
      { key: "protein", label: "Protein", type: "select", options: ["Negative", "Trace", "+", "++", "+++"], required: true },
      { key: "glucose", label: "Glucose", type: "select", options: ["Negative", "Trace", "+", "++", "+++"], required: true },
      { key: "microscopy", label: "Microscopy", type: "textarea", required: false },
    ],
  },
  {
    name: "Pregnancy Test",
    code: "LAB-PT",
    category: "Rapid Test",
    specimen: "Urine / Blood",
    reportTitle: "Pregnancy Test Result",
    fields: [
      { key: "hcg", label: "HCG result", type: "select", options: ["Negative", "Positive"], required: true },
      { key: "sampleType", label: "Sample type", type: "select", options: ["Urine", "Blood"], required: true },
    ],
  },
  {
    name: "Random Blood Sugar",
    code: "LAB-RBS",
    category: "Chemical Pathology",
    specimen: "Blood",
    reportTitle: "Random Blood Sugar Result",
    fields: [
      { key: "rbs", label: "Random blood sugar", type: "number", unit: "mg/dL", referenceRange: "70 - 140", required: true },
    ],
  },
] as const;

async function upsertRoles() {
  const roleMap: Record<RoleName, string> = {} as Record<RoleName, string>;

  await Promise.all(
    roles.map(async (roleData) => {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: { description: roleData.description },
        create: roleData,
      });

      roleMap[roleData.name] = role.id;
    })
  );

  return roleMap;
}

async function upsertPermissions() {
  const permissionMap: Record<PermissionName, string> = {} as Record<PermissionName, string>;

  await Promise.all(
    permissions.map(async (permission) => {
      const permissionRecord = await prisma.permission.upsert({
        where: { name: permission },
        update: {},
        create: { name: permission },
      });

      permissionMap[permission] = permissionRecord.id;
    })
  );

  return permissionMap;
}

async function assignRolePermissions(
  roleMap: Record<RoleName, string>,
  permissionMap: Record<PermissionName, string>
) {
  const assignments = Object.entries(rolePermissions).flatMap(([roleName, permissionNames]) =>
    permissionNames.map((permissionName) => ({
      roleId: roleMap[roleName as RoleName],
      permissionId: permissionMap[permissionName],
    }))
  );

  await Promise.all(
    assignments.map((assignment) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: assignment,
        },
        update: {},
        create: assignment,
      })
    )
  );
}

async function upsertTestUsers(
  roleMap: Record<RoleName, string>,
  serviceMap: Record<HospitalServiceCode, string>
) {
  for (const userData of testUsers) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const serviceAreaId = userData.serviceCode
      ? serviceMap[userData.serviceCode]
      : null;

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        username: userData.username,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        serviceAreaId,
        isActive: true,
      },
      create: {
        email: userData.email,
        username: userData.username,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        serviceAreaId,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: roleMap[userData.role],
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: roleMap[userData.role],
      },
    });
  }
}

async function seedSetupData() {
  await prisma.specialty.upsert({
    where: { name: "General Medicine" },
    update: { isActive: true },
    create: {
      name: "General Medicine",
      description: "Primary medical care and general consultations",
    },
  });

  const ward = await prisma.ward.upsert({
    where: { name: "General Ward" },
    update: { isActive: true },
    create: {
      name: "General Ward",
      description: "General inpatient ward",
    },
  });

  const room = await prisma.room.upsert({
    where: { roomNumber: "GW-101" },
    update: {
      name: "General Ward Room 101",
      wardId: ward.id,
      isActive: true,
    },
    create: {
      name: "General Ward Room 101",
      roomNumber: "GW-101",
      roomType: "Inpatient",
      wardId: ward.id,
    },
  });

  await prisma.bed.upsert({
    where: { bedNumber: "GW-101-A" },
    update: {
      wardId: ward.id,
      roomId: room.id,
      status: "available",
      isActive: true,
    },
    create: {
      bedNumber: "GW-101-A",
      wardId: ward.id,
      roomId: room.id,
      status: "available",
    },
  });

  const serviceMap = {} as Record<HospitalServiceCode, string>;

  for (const serviceData of hospitalServices) {
    const service = await prisma.hospitalService.upsert({
      where: { code: serviceData.code },
      update: {
        name: serviceData.name,
        description: serviceData.description,
        price: serviceData.price,
        isActive: true,
        deletedAt: null,
      },
      create: serviceData,
    });

    serviceMap[serviceData.code] = service.id;
  }

  const insuranceProvider = await prisma.insuranceProvider.upsert({
    where: { name: "CeekayX Health Plan" },
    update: {
      code: "CXHP",
      patientPayPercentage: 20,
      isActive: true,
    },
    create: {
      name: "CeekayX Health Plan",
      code: "CXHP",
      email: "claims@ceekayx-health.example",
      phone: "+2348000000000",
      patientPayPercentage: 20,
    },
  });

  return {
    insuranceProvider,
    serviceMap,
  };
}

async function seedDemoPatient(insuranceProviderId: string) {
  const demoPatient = {
    mrn: "CXHMS-2026-SEED0001",
    qrCode: "PAT-SEED-GRACE-ADEYEMI",
    firstName: "Grace",
    lastName: "Adeyemi",
    email: "patient@example.com",
    phone: "+2348090001111",
    dateOfBirth: new Date("1988-07-23"),
    gender: "female" as const,
    status: "active" as const,
    patientCategory: "new_patient" as const,
    address: "12 Care Avenue",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    emergencyContactName: "Tunde Adeyemi",
    emergencyContactPhone: "+2348090002222",
    emergencyContactRelationship: "Spouse",
    bloodGroup: "O+",
    genotype: "AA",
    allergies: "None reported",
    insuranceProviderId,
    insurancePolicyNumber: "CXHP-0001",
    insuranceCoverageStatus: "active",
  };

  await prisma.patient.upsert({
    where: { mrn: demoPatient.mrn },
    update: demoPatient,
    create: demoPatient,
  });
}

async function seedDemoMedications() {
  for (const medication of demoMedications) {
    await prisma.medication.upsert({
      where: {
        name_strength_dosageForm: {
          name: medication.name,
          strength: medication.strength,
          dosageForm: medication.dosageForm,
        },
      },
      update: {
        ...medication,
        isActive: true,
        deletedAt: null,
      },
      create: medication,
    });
  }
}

async function seedDemoInventoryItems() {
  for (const item of demoInventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { code: item.code },
      update: {
        ...item,
        isActive: true,
        deletedAt: null,
      },
      create: item,
    });
  }
}

async function seedDemoLaboratoryTemplates() {
  for (const template of demoLaboratoryTemplates) {
    await prisma.laboratoryTemplate.upsert({
      where: { code: template.code },
      update: {
        ...template,
        isActive: true,
        deletedAt: null,
      },
      create: template,
    });
  }
}

async function removeObsoletePermissions() {
  const obsoleteNames = ["users.write"];

  const obsoletePermissions = await prisma.permission.findMany({
    where: {
      name: {
        in: obsoleteNames,
      },
    },
    select: {
      id: true,
    },
  });

  const permissionIds = obsoletePermissions.map(
    (permission) => permission.id
  );

  if (permissionIds.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: {
        permissionId: {
          in: permissionIds,
        },
      },
    });

    await tx.permission.deleteMany({
      where: {
        id: {
          in: permissionIds,
        },
      },
    });
  });

  console.log(
    `Removed obsolete permissions: ${obsoleteNames.join(", ")}`
  );
}

async function main() {
  console.log("Seeding Database...");

  const [roleMap, permissionMap] = await Promise.all([upsertRoles(), upsertPermissions()]);

  await assignRolePermissions(roleMap, permissionMap);
  const { insuranceProvider, serviceMap } = await seedSetupData();

  await upsertTestUsers(roleMap, serviceMap);
  await seedDemoPatient(insuranceProvider.id);
  await seedDemoMedications();
  await seedDemoInventoryItems();
  await seedDemoLaboratoryTemplates();

  console.log("Database Seeded Successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
