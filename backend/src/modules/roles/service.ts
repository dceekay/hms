import { Prisma } from "@prisma/client";
import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { RoleRepository } from "./repository";
import { PermissionRepository } from "../permissions/repository";
import { CreateRoleDto, UpdateRoleDto } from "./dto";

const PROTECTED_ROLE_NAMES = ["Super Admin"];

export class RoleService {
  constructor(
    private readonly repository = new RoleRepository(),
    private readonly permissionRepository = new PermissionRepository()
  ) {}

  async all() {
    const items = await this.repository.findAll();

    return {
      items,
      meta: {
        page: 1,
        limit: items.length,
        total: await this.repository.count(),
        totalPages: 1,
      },
    };
  }

  async byId(id: string) {
    const role = await this.repository.findById(id);

    if (!role) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Role not found");
    }

    return role;
  }

  async create(payload: CreateRoleDto) {
    const existing = await this.repository.findByName(payload.name);

    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, "A role with this name already exists");
    }

    if (payload.permissionIds?.length) {
      for (const permissionId of payload.permissionIds) {
        const permission = await this.permissionRepository.findById(permissionId);
        if (!permission) {
          throw new ApiError(HttpStatus.BAD_REQUEST, `Permission ${permissionId} does not exist`);
        }
      }
    }

    const data: Prisma.RoleCreateInput = {
      name: payload.name,
      description: payload.description,
      ...(payload.permissionIds?.length
        ? {
            permissions: {
              create: payload.permissionIds.map((permissionId) => ({
                permission: { connect: { id: permissionId } },
              })),
            },
          }
        : {}),
    };

    const role = await this.repository.createRole(data);
    return this.repository.findById(role.id);
  }

  async update(id: string, payload: UpdateRoleDto) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Role not found");
    }

    if (PROTECTED_ROLE_NAMES.includes(existing.name) && payload.name) {
      throw new ApiError(HttpStatus.FORBIDDEN, "This role's name cannot be changed");
    }

    if (payload.name && payload.name !== existing.name) {
      const nameTaken = await this.repository.findByName(payload.name);
      if (nameTaken) {
        throw new ApiError(HttpStatus.CONFLICT, "A role with this name already exists");
      }
    }

    if (payload.permissionIds) {
      for (const permissionId of payload.permissionIds) {
        const permission = await this.permissionRepository.findById(permissionId);
        if (!permission) {
          throw new ApiError(HttpStatus.BAD_REQUEST, `Permission ${permissionId} does not exist`);
        }
      }

      await prisma.rolePermission.deleteMany({ where: { roleId: id } });

      if (payload.permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: payload.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    }

    const data: Prisma.RoleUpdateInput = {
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    };

    if (Object.keys(data).length > 0) {
      await this.repository.updateRole(id, data);
    }

    return this.repository.findById(id);
  }

  async assignPermissions(id: string, permissionIds: string[]) {
    return this.update(id, { permissionIds });
  }

  async delete(id: string) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Role not found");
    }

    if (PROTECTED_ROLE_NAMES.includes(existing.name)) {
      throw new ApiError(HttpStatus.FORBIDDEN, "This role cannot be deleted");
    }

    const userCount = await prisma.userRole.count({ where: { roleId: id } });

    if (userCount > 0) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        `Cannot delete role: ${userCount} user(s) currently hold this role`
      );
    }

    await this.repository.deleteRole(id);
    return { success: true };
  }
}
