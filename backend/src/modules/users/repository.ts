import { UserRepository as AuthUserRepository } from "../auth/repository";
import { prisma } from "../../database/prisma";

export class UserRepository extends AuthUserRepository {
  async findAllWithRoles(params: {
    skip?: number;
    take?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const { skip, take, search, isActive } = params;

    const where: any = {
      deletedAt: null,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { username: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          roles: { include: { role: true } },
          doctorProfile: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  async createDoctorWithRole(data: {
    email: string;
    username: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    doctorType: "medical_doctor" | "visiting_consultant" | "visiting_specialist";
    specialty?: string | null;
    doctorRoleId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          username: data.username,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          roles: {
            create: {
              roleId: data.doctorRoleId,
            },
          },
          doctorProfile: {
            create: {
              doctorType: data.doctorType,
              specialty: data.specialty || null,
            },
          },
        },
        include: {
          roles: { include: { role: true } },
          doctorProfile: true,
        },
      });

      return user;
    });
  }

  async createUserWithRoles(data: {
    email: string;
    username: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    roleIds: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          username: data.username,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          roles: data.roleIds.length
            ? {
                create: data.roleIds.map((roleId) => ({ roleId })),
              }
            : undefined,
        },
        include: {
          roles: { include: { role: true } },
          doctorProfile: true,
        },
      });

      return user;
    });
  }

  async setRoles(userId: string, roleIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });

      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId, roleId })),
        });
      }

      return tx.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
    });
  }

  async setActive(id: string, isActive: boolean) {
    return prisma.user.update({ where: { id }, data: { isActive } });
  }

  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
