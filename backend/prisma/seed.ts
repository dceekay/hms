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
        "users.update",
        "users.delete",

        "roles.read",
        "roles.create",
        "roles.update",
        "roles.delete"

    ];

    for(const permission of permissions){

        const p=await prisma.permission.upsert({

            where:{name:permission},

            update:{},

            create:{

                name:permission

            }

        });

        await prisma.rolePermission.upsert({

            where:{
                roleId_permissionId:{
                    roleId:adminRole.id,
                    permissionId:p.id
                }
            },

            update:{},

            create:{

                roleId:adminRole.id,

                permissionId:p.id

            }

        });

    }

    const passwordHash=await bcrypt.hash("Admin@123",12);

    const admin=await prisma.user.upsert({

        where:{
            email:"admin@ceekayx.com"
        },

        update:{},

        create:{

            email:"admin@ceekayx.com",

            username:"admin",

            passwordHash,

            firstName:"System",

            lastName:"Administrator"

        }

    });

    await prisma.userRole.upsert({

        where:{
            userId_roleId:{
                userId:admin.id,
                roleId:adminRole.id
            }
        },

        update:{},

        create:{

            userId:admin.id,

            roleId:adminRole.id

        }

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