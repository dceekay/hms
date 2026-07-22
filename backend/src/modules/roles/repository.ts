import { Prisma } from "@prisma/client";
import { BaseRepository } from "../../core/BaseRepository";
import { prisma } from "../../database/prisma";

export class RoleRepository extends BaseRepository<any> {

    constructor() {
        super(prisma.role);
    }

    async findAll() {

        return prisma.role.findMany({

            include:{

                permissions:{
                    include:{
                        permission:true
                    }
                },

                users:true

            }

        });

    }

    count() {

        return prisma.role.count();

    }

    findById(id:string){

        return prisma.role.findUnique({

            where:{id},

            include:{

                permissions:{
                    include:{
                        permission:true
                    }
                }

            }

        });

    }

    findByName(name:string){

        return prisma.role.findUnique({

            where:{name}

        });

    }

    createRole(data:Prisma.RoleCreateInput){

        return prisma.role.create({

            data

        });

    }

    updateRole(id:string,data:Prisma.RoleUpdateInput){

        return prisma.role.update({

            where:{id},

            data

        });

    }

    deleteRole(id:string){

        return prisma.role.delete({

            where:{id}

        });

    }

}
