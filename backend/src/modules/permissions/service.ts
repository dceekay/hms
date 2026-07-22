import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";
import { PermissionRepository } from "./repository";
import { CreatePermissionDto, UpdatePermissionDto } from "./dto";

export class PermissionService {
  constructor(private readonly permissionRepository = new PermissionRepository()) {}

  async list(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;

    const { items, total } = await this.permissionRepository.findAllPaginated({
      skip: (page - 1) * limit,
      take: limit,
      search: params.search,
    });

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const permission = await this.permissionRepository.findById(id);

    if (!permission) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Permission not found");
    }

    return permission;
  }

  async create(payload: CreatePermissionDto) {
    const existing = await this.permissionRepository.findByName(payload.name);

    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, "A permission with this name already exists");
    }

    return this.permissionRepository.create(payload as any);
  }

  async update(id: string, payload: UpdatePermissionDto) {
    const existing = await this.permissionRepository.findById(id);

    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Permission not found");
    }

    if (payload.name && payload.name !== existing.name) {
      const nameTaken = await this.permissionRepository.findByName(payload.name);
      if (nameTaken) {
        throw new ApiError(HttpStatus.CONFLICT, "A permission with this name already exists");
      }
    }

    return this.permissionRepository.update(id, payload as any);
  }

  async remove(id: string) {
    const existing = await this.permissionRepository.findById(id);

    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Permission not found");
    }

    const roleCount = await this.permissionRepository.countRolesUsingPermission(id);

    if (roleCount > 0) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        `Cannot delete permission: ${roleCount} role(s) currently use it`
      );
    }

    await this.permissionRepository.delete(id);
    return { success: true };
  }
}