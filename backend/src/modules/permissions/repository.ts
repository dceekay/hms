import { Permission } from "@prisma/client";
import { BaseRepository } from "../../core/BaseRepository";
import { prisma } from "../../database/prisma";

export class PermissionRepository extends BaseRepository<Permission> {
  constructor() {
    super(prisma.permission);
  }

  async findByName(name: string): Promise<Permission | null> {
    return prisma.permission.findUnique({ where: { name } });
  }

  async findAllPaginated(params: { skip?: number; take?: number; search?: string }) {
    const { skip, take, search } = params;

    const where: any = search ? { name: { contains: search } } : {};

    const [items, total] = await prisma.$transaction([
      prisma.permission.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: {
          roles: true,
        },
      }),
      prisma.permission.count({ where }),
    ]);

    return { items, total };
  }

  async countRolesUsingPermission(permissionId: string): Promise<number> {
    return prisma.rolePermission.count({ where: { permissionId } });
  }
}
