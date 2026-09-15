import { ApiError } from "../../shared/errors/ApiError";
import { hashPassword, comparePassword } from "../../shared/helpers/bcrypt";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/helpers/jwt";
import { RegisterDto, LoginDto } from "../../shared/dto/auth.dto";
import { UserRepository, RefreshTokenRepository } from "./repository";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { Prisma, AuditAction } from "@prisma/client";
import { parseUserAgent } from "../../shared/helpers/deviceDetector";

const DEFAULT_REFRESH_TOKEN_DAYS = 7;
const REMEMBER_ME_REFRESH_TOKEN_DAYS = 30;

function refreshTokenExpiresAt(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function extractRolesAndPermissions(user: any): { roles: string[]; permissions: string[] } {
  const roles =
    user.roles?.flatMap((userRole: any) =>
      userRole?.role?.name ? [String(userRole.role.name)] : []
    ) ?? [];

  const permissions =
    user.roles?.flatMap((userRole: any) =>
      userRole?.role?.permissions?.flatMap((rolePermission: any) =>
        rolePermission?.permission?.name ? [String(rolePermission.permission.name)] : []
      ) ?? []
    ) ?? [];

  return {
    roles: Array.from(new Set(roles)),
    permissions: Array.from(new Set(permissions)),
  };
}

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly refreshTokenRepository = new RefreshTokenRepository()
  ) {}

  private async createRefreshToken(user: { id: string }, lifetimeDays = DEFAULT_REFRESH_TOKEN_DAYS) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const refreshToken = signRefreshToken({
        sub: user.id,
      }, `${lifetimeDays}d`);

      try {
        await this.refreshTokenRepository.create({
          token: refreshToken,
          userId: user.id,
          expiresAt: refreshTokenExpiresAt(lifetimeDays),
        });

        return refreshToken;
      } catch (error) {
        const target = error instanceof Prisma.PrismaClientKnownRequestError
          ? error.meta?.target
          : null;
        const isDuplicateToken =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          ((Array.isArray(target) && target.includes("token")) ||
            (typeof target === "string" && target.includes("token")));

        if (!isDuplicateToken) {
          throw error;
        }

        const existingToken = await this.refreshTokenRepository.findByToken(refreshToken);

        if (existingToken?.userId === user.id) {
          await prisma.refreshToken.update({
            where: { id: existingToken.id },
            data: {
              revoked: false,
              expiresAt: refreshTokenExpiresAt(lifetimeDays),
            },
          });

          return refreshToken;
        }

        if (attempt === 3) {
          throw error;
        }
      }
    }

    throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Could not create refresh token");
  }

  async register(payload: RegisterDto) {
    const existingUser =
      (await this.userRepository.findByEmail(payload.email)) ||
      (await this.userRepository.findByUsername(payload.username));

    if (existingUser) {
      throw new ApiError(HttpStatus.CONFLICT, "User already exists");
    }

    const passwordHash = await hashPassword(payload.password);

    const user = await this.userRepository.createWithRoles(
      {
        email: payload.email,
        username: payload.username,
        passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
      },
      []
    );

    const roles: string[] = [];
    const permissions: string[] = [];

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      roles,
      permissions,
    });

    const refreshToken = await this.createRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions,
      },
    };
  }

  async login(
    payload: LoginDto,
    auditMeta?: { ipAddress?: string; userAgent?: string; rawForwardedFor?: string }
  ) {
    const user = await this.userRepository.findByEmailOrUsernameWithRolesAndPermissions(
      payload.emailOrUsername
    );

    if (!user) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    const validPassword = await comparePassword(payload.password, user.passwordHash);

    if (!validPassword) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    if (!user.isActive) {
      throw new ApiError(HttpStatus.FORBIDDEN, "Account is disabled");
    }

    const { roles, permissions } = extractRolesAndPermissions(user);

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      roles,
      permissions,
    });

    const now = new Date();
    const parsedDevice = parseUserAgent(auditMeta?.userAgent);

    console.log("==================================");
    console.log("LOGIN SUCCESS & AUDIT RECORDED");
    console.log("User:", user.email, "Device:", parsedDevice.deviceType, parsedDevice.os);
    console.log("==================================");

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: now },
    });

    // Save comprehensive login audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.LOGIN,
          entity: "Staff",
          entityId: user.id,
          userId: user.id,
          ipAddress: auditMeta?.ipAddress || null,
          userAgent: (auditMeta?.userAgent || "").slice(0, 500) || null,
          newValues: {
            loginTime: now.toISOString(),
            staffId: user.id,
            staffName: `${user.firstName} ${user.lastName}`.trim(),
            username: user.username,
            email: user.email,
            roles,
            device: {
              type: parsedDevice.deviceType,
              os: parsedDevice.os,
              browser: parsedDevice.browser,
              browserVersion: parsedDevice.browserVersion,
              screen: payload.deviceDetails?.screen,
              viewport: payload.deviceDetails?.viewport,
              platform: payload.deviceDetails?.platform,
              language: payload.deviceDetails?.language,
              timezone: payload.deviceDetails?.timezone,
            },
            network: {
              ip: auditMeta?.ipAddress || "Unknown",
              forwardedFor: auditMeta?.rawForwardedFor,
              connectionType: payload.deviceDetails?.networkType || "unknown",
            },
          },
        },
      });
    } catch (auditError) {
      console.error("Warning: Failed to create login audit trail:", auditError);
    }

    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });

    const refreshTokenLifetimeDays = payload.rememberMe
      ? REMEMBER_ME_REFRESH_TOKEN_DAYS
      : DEFAULT_REFRESH_TOKEN_DAYS;
    const refreshToken = await this.createRefreshToken(user, refreshTokenLifetimeDays);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions,
      },
    };
  }

  async refreshToken(token: string) {
    if (!token) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Refresh token is required");
    }

    const payload = verifyRefreshToken(token);
    const storedToken = await this.refreshTokenRepository.findByToken(token);

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Refresh token is invalid");
    }

    const user = await this.userRepository.findByIdWithRolesAndPermissions(payload.sub);

    if (!user || !user.isActive) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "User is not active");
    }

    const { roles, permissions } = extractRolesAndPermissions(user);

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      roles,
      permissions,
    });

    return { accessToken };
  }

  async logout(token: string) {
    if (!token) {
      return { success: true };
    }

    const storedToken = await this.refreshTokenRepository.findByToken(token);

    if (!storedToken) {
      return { success: true };
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    return { success: true };
  }

  async getLoginAudits(query: { page?: number; limit?: number; search?: string } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      action: AuditAction.LOGIN,
    };

    if (query.search) {
      where.OR = [
        { user: { firstName: { contains: query.search } } },
        { user: { lastName: { contains: query.search } } },
        { user: { username: { contains: query.search } } },
        { user: { email: { contains: query.search } } },
        { ipAddress: { contains: query.search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              username: true,
              roles: {
                include: { role: true },
              },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((log) => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        user: log.user
          ? {
              id: log.user.id,
              name: `${log.user.firstName} ${log.user.lastName}`.trim(),
              username: log.user.username,
              email: log.user.email,
              roles: log.user.roles.map((r) => r.role.name),
            }
          : null,
        details: log.newValues,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
