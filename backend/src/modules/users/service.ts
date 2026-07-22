import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";
import { UserRepository } from "./repository";
import { RoleRepository } from "../roles/repository";
import { UpdateUserDto, AssignRolesDto, ListUsersQueryDto } from "./dto";

function sanitizeUser(user: any) {
  if (!user) return user;
  const { passwordHash, ...safe } = user;
  return safe;
}

export class UserService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly roleRepository = new RoleRepository()
  ) {}

  async list(params: ListUsersQueryDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const { items, total } = await this.userRepository.findAllWithRoles({
      skip: (page - 1) * limit,
      take: limit,
      search: params.search,
      isActive: params.isActive,
    });

    return {
      items: items.map(sanitizeUser),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const user = await this.userRepository.findByIdWithRolesAndPermissions(id);

    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }

    return sanitizeUser(user);
  }

  async update(id: string, payload: UpdateUserDto) {
    const existing = await this.userRepository.findById(id);

    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }

    if (payload.email && payload.email !== existing.email) {
      const emailTaken = await this.userRepository.findByEmail(payload.email);
      if (emailTaken) {
        throw new ApiError(HttpStatus.CONFLICT, "Email already in use");
      }
    }

    const updated = await this.userRepository.update(id, payload as any);
    return sanitizeUser(updated);
  }

  async assignRoles(id: string, payload: AssignRolesDto) {
    const existing = await this.userRepository.findById(id);

    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }

    for (const roleId of payload.roleIds) {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new ApiError(HttpStatus.BAD_REQUEST, `Role ${roleId} does not exist`);
      }
    }

    const updated = await this.userRepository.setRoles(id, payload.roleIds);
    return sanitizeUser(updated);
  }

  async activate(id: string) {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }
    return sanitizeUser(await this.userRepository.setActive(id, true));
  }

  async deactivate(id: string) {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }
    return sanitizeUser(await this.userRepository.setActive(id, false));
  }

  async remove(id: string) {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, "User not found");
    }
    await this.userRepository.softDelete(id);
    return { success: true };
  }
}
