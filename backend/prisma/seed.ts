import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {

    console.log("Seeding Database...");

    const adminRole = await prisma.role.upsert({

        where:{
            name:"Super Admin"
        },

        update:{},

        create:{
            name:"Super Admin",
            description:"System Administrator"
        }

    });

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
        "appointments.read",
        "appointments.create",
        "patients.read",
        "patients.create",
    ];

    const roles = [
        { name: "Super Admin", description: "System Administrator" },
        { name: "Administrator", description: "Hospital Administrator" },
        { name: "Doctor", description: "Medical Doctor" },
        { name: "Nurse", description: "Nursing Staff" },
        { name: "Receptionist", description: "Front Desk Receptionist" },
    ];

    const roleMap: Record<string, string> = {};

    for (const roleData of roles) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: {},
            create: {
                name: roleData.name,
                description: roleData.description,
            },
        });

        roleMap[roleData.name] = role.id;
    }

    const permissionMap: Record<string, string> = {};

    for (const permission of permissions) {
        const permissionRecord = await prisma.permission.upsert({
            where: { name: permission },
            update: {},
            create: { name: permission },
        });

        permissionMap[permission] = permissionRecord.id;
    }

    const rolePermissions: Record<string, string[]> = {
        "Super Admin": permissions,
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
        ],
        Doctor: ["appointments.read", "patients.read"],
        Nurse: ["patients.read"],
        Receptionist: ["appointments.read", "patients.create"],
    };

    for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
        const roleId = roleMap[roleName];

        for (const permissionName of permissionNames) {
            const permissionId = permissionMap[permissionName];

            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId,
                        permissionId,
                    },
                },
                update: {},
                create: {
                    roleId,
                    permissionId,
                },
            });
        }
    }

    const passwordHash = await bcrypt.hash("Admin@123", 12);

    const admin = await prisma.user.upsert({
        where: { email: "admin@ceekayx.com" },
        update: {
            username: "admin",
            passwordHash,
            firstName: "System",
            lastName: "Administrator",
            isActive: true,
        },
        create: {
            email: "admin@ceekayx.com",
            username: "admin",
            passwordHash,
            firstName: "System",
            lastName: "Administrator",
        },
    });

    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: admin.id,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            userId: admin.id,
            roleId: adminRole.id,
        },
    });

    const doctor = await prisma.user.upsert({
        where: { email: "doctor@ceekayx.com" },
        update: {
            username: "drjohn",
            passwordHash: await bcrypt.hash("Doctor@123", 12),
            firstName: "John",
            lastName: "Doe",
            phone: "+2348012345678",
            isActive: true,
        },
        create: {
            email: "doctor@ceekayx.com",
            username: "drjohn",
            passwordHash: await bcrypt.hash("Doctor@123", 12),
            firstName: "John",
            lastName: "Doe",
            phone: "+2348012345678",
        },
    });

    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: doctor.id,
                roleId: roleMap["Doctor"],
            },
        },
        update: {},
        create: {
            userId: doctor.id,
            roleId: roleMap["Doctor"],
        },
    });

    const receptionist = await prisma.user.upsert({
        where: { email: "reception@ceekayx.com" },
        update: {
            username: "reception",
            passwordHash: await bcrypt.hash("Reception@123", 12),
            firstName: "Jane",
            lastName: "Smith",
            phone: "+2348098765432",
            isActive: true,
        },
        create: {
            email: "reception@ceekayx.com",
            username: "reception",
            passwordHash: await bcrypt.hash("Reception@123", 12),
            firstName: "Jane",
            lastName: "Smith",
            phone: "+2348098765432",
        },
    });

    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: receptionist.id,
                roleId: roleMap["Receptionist"],
            },
        },
        update: {},
        create: {
            userId: receptionist.id,
            roleId: roleMap["Receptionist"],
        },
    });

    await prisma.patient.upsert({
        where: { email: "patient@example.com" },
        update: {},
        create: {
            firstName: "Grace",
            lastName: "Adeyemi",
            email: "patient@example.com",
            phone: "+2348090001111",
            dateOfBirth: new Date("1988-07-23"),
            gender: "female",
        },
    });

    console.log("Database Seeded Successfully");

}

main()

.then(async()=>{

    await prisma.$disconnect();

})

.catch(async(error)=>{

    console.error(error);

    await prisma.$disconnect();

    process.exit(1);

});
