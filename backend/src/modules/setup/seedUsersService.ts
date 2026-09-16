import bcrypt from "bcrypt";
import { prisma } from "../../database/prisma";
import { logger } from "../../config/logger";

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
  "nursing.read",
  "nursing.medication.administer",
  "nursing.vitals.create",
  "nursing.notes.create",
  "nursing.orders.acknowledge",
  "pharmacy.read",
  "pharmacy.create",
  "pharmacy.update",
  "pharmacy.dispense",
  "billing.read",
  "billing.create",
  "claims.read",
  "claims.create",
  "claims.update",
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
  { name: "Cashier", description: "Reception cashier and patient billing staff" },
  { name: "Billing Officer", description: "Billing and Accounts Staff" },
  { name: "Desk Office", description: "Insurance filing and claims staff" },
  { name: "Security", description: "Entry Point Security Staff" },
] as const;

const hospitalServices = [
  { name: "Administration", code: "ADMIN", description: "Administrative leadership and system setup", price: 0 },
  { name: "Reception", code: "RECEP", description: "Patient registration and front desk services", price: 0 },
  { name: "Cashier", code: "CASH", description: "Payment collection and cashier desk", price: 0 },
  { name: "Consultation", code: "CONS", description: "Outpatient and doctor consultation", price: 5000 },
  { name: "Laboratory", code: "LAB", description: "Laboratory tests and sample processing", price: 0 },
  { name: "Radiology", code: "RAD", description: "Radiology imaging services", price: 0 },
  { name: "Scanning and ECG", code: "SCAN-ECG", description: "Ultrasound scanning and ECG services", price: 0 },
  { name: "Admission", code: "ADM", description: "Inpatient admission and ward care", price: 0 },
  { name: "Surgery and Theatre", code: "SURG-TH", description: "Surgical and theatre services", price: 0 },
  { name: "Maternity and Labour Room", code: "MAT-LR", description: "Maternity care and labour room services", price: 0 },
  { name: "MVA", code: "MVA", description: "Manual vacuum aspiration service", price: 0 },
  { name: "Immunization", code: "IMM", description: "Vaccination and immunization services", price: 0 },
  { name: "ANC / Antenatal Care", code: "ANC", description: "Antenatal clinic services", price: 0 },
  { name: "Dental and Ophthalmology", code: "DENT-OPH", description: "Dental care and eye clinic services", price: 0 },
  { name: "Dressing", code: "DRESS", description: "Wound dressing and minor procedures", price: 0 },
  { name: "Physiotherapy", code: "PHYSIO", description: "Physiotherapy and rehabilitation services", price: 0 },
  { name: "Pharmacy", code: "PHARM", description: "Pharmacy dispensing services", price: 0 },
  { name: "Security", code: "SEC", description: "Entry point security desk", price: 0 },
  { name: "Desk Office", code: "DESK", description: "Insurance filing and claims desk", price: 0 },
] as const;

type RoleName = (typeof roles)[number]["name"];
type PermissionName = (typeof permissions)[number];

const rolePermissions: Record<RoleName, PermissionName[]> = {
  "Super Admin": [...permissions],
  Administrator: [
    "users.read", "users.create", "users.update", "users.delete", "users.manage_roles",
    "roles.read", "roles.create", "roles.update", "roles.delete",
    "permissions.read", "permissions.write", "permissions.delete",
    "departments.read", "departments.create", "departments.update", "departments.delete",
    "hospital_profile.read", "hospital_profile.update",
    "appointments.read", "appointments.create", "appointments.update",
    "patients.read", "patients.create", "patients.investigation.create", "patients.update",
    "patients.delete", "patients.convert", "patients.reactivate",
    "laboratory.read", "laboratory.create", "laboratory.update",
    "clinical.read", "clinical.create", "clinical.update",
    "prescriptions.read", "prescriptions.create", "prescriptions.update",
    "nursing.read", "nursing.medication.administer", "nursing.vitals.create", "nursing.notes.create",
    "nursing.orders.acknowledge", "billing.read", "billing.create",
    "claims.read", "claims.create", "claims.update",
    "semsas.read", "semsas.create", "semsas.update", "semsas.file",
    "inventory.read", "inventory.create", "inventory.update", "inventory.issue",
  ],
  Doctor: [
    "appointments.read", "appointments.update",
    "patients.read", "laboratory.read", "laboratory.create",
    "clinical.read", "clinical.create", "clinical.update",
    "prescriptions.read", "prescriptions.create",
  ],
  Nurse: [
    "patients.read", "clinical.read", "prescriptions.read", "nursing.read",
    "nursing.medication.administer", "nursing.vitals.create", "nursing.notes.create",
    "nursing.orders.acknowledge",
  ],
  Receptionist: [
    "appointments.read", "appointments.create", "appointments.update",
    "patients.read", "patients.create", "patients.investigation.create",
    "patients.update", "patients.convert", "patients.reactivate",
    "claims.read", "setup.read", "billing.read",
    "semsas.read", "semsas.create", "semsas.update",
    "inventory.read", "inventory.create", "inventory.update", "inventory.issue",
  ],
  Cashier: [
    "appointments.read", "appointments.create", "appointments.update",
    "patients.read", "patients.create", "patients.investigation.create",
    "patients.update", "patients.convert", "patients.reactivate",
    "billing.read", "billing.create", "semsas.read", "semsas.create",
    "semsas.update", "inventory.read",
  ],
  Laboratory: [
    "laboratory.read", "laboratory.create", "laboratory.update", "laboratory.result",
    "patients.read", "patients.investigation.create", "patients.update",
  ],
  Pharmacist: [
    "pharmacy.read", "pharmacy.create", "pharmacy.update", "pharmacy.dispense",
    "prescriptions.read", "prescriptions.update",
    "inventory.read", "inventory.create", "inventory.update", "inventory.issue",
    "patients.read",
  ],
  "Billing Officer": [
    "billing.read", "billing.create", "reports.read",
    "patients.read", "semsas.read", "semsas.file",
  ],
  "Desk Office": [
    "claims.read", "claims.create", "claims.update",
    "patients.read", "setup.read", "reports.read",
  ],
  Security: ["security.entry.read", "security.entry.create", "security.entry.update"],
};

export const fullSeededStaffAccounts = [
  {
    role: "Super Admin" as RoleName,
    email: "admin@ceekayx.com",
    username: "admin",
    password: "Admin@123",
    firstName: "Abdulkadir",
    lastName: "Yakubu",
    serviceCode: "ADMIN",
    phone: "+2348000000001",
  },
  {
    role: "Administrator" as RoleName,
    email: "administrator@ceekayx.com",
    username: "administrator",
    password: "Administrator@123",
    firstName: "Hospital",
    lastName: "Administrator",
    serviceCode: "ADMIN",
    phone: "+2348070001000",
  },
  {
    role: "Doctor" as RoleName,
    email: "doctor@ceekayx.com",
    username: "drjohn",
    password: "Doctor@123",
    firstName: "John",
    lastName: "Doe",
    serviceCode: "CONS",
    phone: "+2348012345678",
  },
  {
    role: "Nurse" as RoleName,
    email: "nurse@ceekayx.com",
    username: "nurseama",
    password: "Nurse@123",
    firstName: "Amina",
    lastName: "Bello",
    serviceCode: "ADM",
    phone: "+2348070001001",
  },
  {
    role: "Receptionist" as RoleName,
    email: "reception@ceekayx.com",
    username: "reception",
    password: "Reception@123",
    firstName: "Jane",
    lastName: "Smith",
    serviceCode: "RECEP",
    phone: "+2348098765432",
  },
  {
    role: "Laboratory" as RoleName,
    email: "lab@ceekayx.com",
    username: "labtech",
    password: "Lab@12345",
    firstName: "Samuel",
    lastName: "Okoro",
    serviceCode: "LAB",
    phone: "+2348070001002",
  },
  {
    role: "Pharmacist" as RoleName,
    email: "pharmacy@ceekayx.com",
    username: "pharm",
    password: "Pharm@123",
    firstName: "Fatima",
    lastName: "Musa",
    serviceCode: "PHARM",
    phone: "+2348070001003",
  },
  {
    role: "Cashier" as RoleName,
    email: "cashier@ceekayx.com",
    username: "cashier",
    password: "Cashier@123",
    firstName: "Cashier",
    lastName: "Desk",
    serviceCode: "CASH",
    phone: "+2348070001007",
  },
  {
    role: "Billing Officer" as RoleName,
    email: "billing@ceekayx.com",
    username: "billing",
    password: "Billing@123",
    firstName: "David",
    lastName: "Ibrahim",
    serviceCode: "CASH",
    phone: "+2348070001004",
  },
  {
    role: "Desk Office" as RoleName,
    email: "deskoffice@ceekayx.com",
    username: "deskoffice",
    password: "Desk@123",
    firstName: "Desk",
    lastName: "Office",
    serviceCode: "DESK",
    phone: "+2348070001006",
  },
  {
    role: "Security" as RoleName,
    email: "security@ceekayx.com",
    username: "security",
    password: "Security@123",
    firstName: "Peter",
    lastName: "Gate",
    serviceCode: "SEC",
    phone: "+2348070001005",
  },
];

export async function seedFullHospitalUsers() {
  logger.info("[SeedUsers] Starting full users and roles verification/seeding...");

  // 1. Roles
  const roleMap: Record<string, string> = {};
  for (const role of roles) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
    roleMap[role.name] = record.id;
  }

  // 2. Permissions
  const permissionMap: Record<string, string> = {};
  for (const perm of permissions) {
    const record = await prisma.permission.upsert({
      where: { name: perm },
      update: {},
      create: { name: perm },
    });
    permissionMap[perm] = record.id;
  }

  // 3. Role Permissions
  for (const [roleName, permNames] of Object.entries(rolePermissions)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;

    for (const permName of permNames) {
      const permId = permissionMap[permName];
      if (!permId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permId } },
        update: {},
        create: { roleId, permissionId: permId },
      });
    }
  }

  // 4. Hospital Services
  const serviceMap: Record<string, string> = {};
  for (const service of hospitalServices) {
    const record = await prisma.hospitalService.upsert({
      where: { code: service.code },
      update: {
        name: service.name,
        description: service.description,
        price: service.price,
        isActive: true,
      },
      create: service,
    });
    serviceMap[service.code] = record.id;
  }

  // 5. Upsert 11 Full Staff Accounts
  const seededResults = [];
  for (const userData of fullSeededStaffAccounts) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const serviceAreaId = userData.serviceCode ? serviceMap[userData.serviceCode] ?? null : null;

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
        isEmailVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        deletedAt: null,
      },
      create: {
        email: userData.email,
        username: userData.username,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        serviceAreaId,
        isActive: true,
        isEmailVerified: true,
      },
    });

    const roleId = roleMap[userData.role];
    if (roleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId,
        },
      });
    }

    if (userData.role === "Doctor") {
      await prisma.doctorProfile.upsert({
        where: { userId: user.id },
        update: {
          doctorType: "medical_doctor",
          specialty: "General Medicine",
          deletedAt: null,
        },
        create: {
          userId: user.id,
          doctorType: "medical_doctor",
          specialty: "General Medicine",
        },
      });
    }

    seededResults.push({
      role: userData.role,
      username: userData.username,
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      status: "active",
    });
  }

  logger.info(`[SeedUsers] Successfully verified/seeded ${seededResults.length} staff accounts.`);
  return seededResults;
}
