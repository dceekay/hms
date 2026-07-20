import { ApiError } from "../../shared/errors/ApiError";
import { hashPassword, comparePassword } from "../../shared/helpers/bcrypt";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/helpers/jwt";
import { RegisterDto, LoginDto } from "../../shared/dto/auth.dto";
import { UserRepository, RefreshTokenRepository } from "./repository";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { Prisma } from "@prisma/client";

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

  private async createRefreshToken(user: { id: string }) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const refreshToken = signRefreshToken({
        sub: user.id,
      });

      try {
        await this.refreshTokenRepository.create({
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

  async login(payload: LoginDto) {
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

    console.log("==================================");
    console.log("LOGIN SUCCESS");
    console.log("User:", user.email);
    console.log("==================================");

    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revoked: false,
      },
      data: {
        revoked: true,
      },
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
}
