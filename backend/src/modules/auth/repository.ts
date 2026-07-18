import { Prisma, User, RefreshToken } from "@prisma/client";
import { BaseRepository } from "../../core/BaseRepository";
import { prisma } from "../../database/prisma";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(prisma.user);
  }

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { username } });
  }

  async findByIdWithRolesAndPermissions(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findByEmailOrUsernameWithRolesAndPermissions(identifier: string) {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createWithRoles(data: Prisma.UserCreateInput, roleIds: string[]) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });

      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
        });
      }

      return user;
    });
  }
}

export class RefreshTokenRepository extends BaseRepository<RefreshToken> {
  constructor() {
    super(prisma.refreshToken);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  async revokeByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}
