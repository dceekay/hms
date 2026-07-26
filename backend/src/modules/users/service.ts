import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";
import { hashPassword } from "../../shared/helpers/bcrypt";
import { UserRepository } from "./repository";
import { RoleRepository } from "../roles/repository";
import { UpdateUserDto, AssignRolesDto, ListUsersQueryDto, CreateDoctorDto, CreateUserDto } from "./dto";
import { prisma } from "../../database/prisma";

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

  private async assertServiceAreaExists(serviceAreaId?: string | null) {
    if (!serviceAreaId) return;

    const serviceArea = await prisma.hospitalService.findFirst({
      where: {
        id: serviceAreaId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!serviceArea) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Selected service area does not exist or is inactive");
    }
  }

  async list(params: ListUsersQueryDto) {
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 20);
    const isActive =
      typeof params.isActive === "string"
        ? params.isActive === "true"
        : params.isActive;

    const { items, total } = await this.userRepository.findAllWithRoles({
      skip: (page - 1) * limit,
      take: limit,
      search: params.search,
      isActive,
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

  async create(payload: CreateUserDto) {
    const existingUser =
      (await this.userRepository.findByEmail(payload.email)) ||
      (await this.userRepository.findByUsername(payload.username));

    if (existingUser) {
      throw new ApiError(HttpStatus.CONFLICT, "A user with this email or username already exists");
    }

    for (const roleId of payload.roleIds) {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new ApiError(HttpStatus.BAD_REQUEST, `Role ${roleId} does not exist`);
      }
    }

    await this.assertServiceAreaExists(payload.serviceAreaId);

    const passwordHash = await hashPassword(payload.password);
    const user = await this.userRepository.createUserWithRoles({
      email: payload.email,
      username: payload.username,
      passwordHash,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone || null,
      serviceAreaId: payload.serviceAreaId || null,
      roleIds: payload.roleIds,
    });

    return sanitizeUser(user);
  }

  async createDoctor(payload: CreateDoctorDto) {
    const existingUser =
      (await this.userRepository.findByEmail(payload.email)) ||
      (await this.userRepository.findByUsername(payload.username));

    if (existingUser) {
      throw new ApiError(HttpStatus.CONFLICT, "A user with this email or username already exists");
    }

    const doctorRole = await this.roleRepository.findByName("Doctor");

    if (!doctorRole) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Doctor role has not been seeded");
    }

    await this.assertServiceAreaExists(payload.serviceAreaId);

    const passwordHash = await hashPassword(payload.password);
    const user = await this.userRepository.createDoctorWithRole({
      email: payload.email,
      username: payload.username,
      passwordHash,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone || null,
      serviceAreaId: payload.serviceAreaId || null,
      doctorType: payload.doctorType,
      specialty: payload.specialty || null,
      doctorRoleId: doctorRole.id,
    });

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

    await this.assertServiceAreaExists(payload.serviceAreaId);

    const updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string | null;
      serviceAreaId?: string | null;
    } = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
    };

    if (payload.phone !== undefined) {
      updateData.phone = payload.phone || null;
    }

    if (payload.serviceAreaId !== undefined) {
      updateData.serviceAreaId = payload.serviceAreaId || null;
    }

    const updated = await this.userRepository.updateUserDetails(id, updateData);
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
