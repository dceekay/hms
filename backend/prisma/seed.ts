import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const permissions = [
  "users.read",
  "users.create",
  "users.write",
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
  "patients.read",
  "patients.create",
  "patients.update",
  "patients.delete",
  "laboratory.read",
  "pharmacy.read",
  "billing.read",
  "inventory.read",
  "reports.read",
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
] as const;

type PermissionName = (typeof permissions)[number];
type RoleName = (typeof roles)[number]["name"];

const rolePermissions: Record<RoleName, PermissionName[]> = {
  "Super Admin": [...permissions],
  Administrator: [
    "users.read",
    "users.create",
    "users.write",
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
    "patients.read",
    "patients.create",
    "patients.update",
    "patients.delete",
  ],
  Doctor: ["appointments.read", "patients.read", "patients.create"],
  Nurse: ["patients.read"],
  Receptionist: ["appointments.read", "patients.read", "patients.create"],
  Laboratory: ["laboratory.read", "patients.read", "patients.create"],
  Pharmacist: ["pharmacy.read", "inventory.read", "patients.read"],
  "Billing Officer": ["billing.read", "reports.read", "patients.read"],
};

const testUsers = [
  {
    role: "Super Admin",
    email: "admin@ceekayx.com",
    username: "admin",
    password: "Admin@123",
    firstName: "System",
    lastName: "Administrator",
  },
  {
    role: "Doctor",
    email: "doctor@ceekayx.com",
    username: "drjohn",
    password: "Doctor@123",
    firstName: "John",
    lastName: "Doe",
    phone: "+2348012345678",
  },
  {
    role: "Receptionist",
    email: "reception@ceekayx.com",
    username: "reception",
    password: "Reception@123",
    firstName: "Jane",
    lastName: "Smith",
    phone: "+2348098765432",
  },
  {
    role: "Nurse",
    email: "nurse@ceekayx.com",
    username: "nurseama",
    password: "Nurse@123",
    firstName: "Amina",
    lastName: "Bello",
    phone: "+2348070001001",
  },
  {
    role: "Laboratory",
    email: "lab@ceekayx.com",
    username: "labtech",
    password: "Lab@12345",
    firstName: "Samuel",
    lastName: "Okoro",
    phone: "+2348070001002",
  },
  {
    role: "Pharmacist",
    email: "pharmacy@ceekayx.com",
    username: "pharm",
    password: "Pharm@123",
    firstName: "Fatima",
    lastName: "Musa",
    phone: "+2348070001003",
  },
  {
    role: "Billing Officer",
    email: "billing@ceekayx.com",
    username: "billing",
    password: "Billing@123",
    firstName: "David",
    lastName: "Ibrahim",
    phone: "+2348070001004",
  },
] satisfies Array<{
  role: RoleName;
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}>;

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

async function upsertTestUsers(roleMap: Record<RoleName, string>) {
  for (const userData of testUsers) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        username: userData.username,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        isActive: true,
      },
      create: {
        email: userData.email,
        username: userData.username,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
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

  await prisma.hospitalService.upsert({
    where: { name: "General Consultation" },
    update: {
      code: "CONS-GEN",
      price: 5000,
      isActive: true,
    },
    create: {
      name: "General Consultation",
      code: "CONS-GEN",
      description: "Standard outpatient consultation",
      price: 5000,
    },
  });

  return prisma.insuranceProvider.upsert({
    where: { name: "CeekayX Health Plan" },
    update: {
      code: "CXHP",
      isActive: true,
    },
    create: {
      name: "CeekayX Health Plan",
      code: "CXHP",
      email: "claims@ceekayx-health.example",
      phone: "+2348000000000",
    },
  });
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
    where: { email: demoPatient.email },
    update: demoPatient,
    create: demoPatient,
  });
}

async function main() {
  console.log("Seeding Database...");

  const [roleMap, permissionMap] = await Promise.all([upsertRoles(), upsertPermissions()]);

  await assignRolePermissions(roleMap, permissionMap);
  await upsertTestUsers(roleMap);

  const insuranceProvider = await seedSetupData();
  await seedDemoPatient(insuranceProvider.id);

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
