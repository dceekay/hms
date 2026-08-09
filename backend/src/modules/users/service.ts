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

function getStaffIssueDates(createdAt: Date) {
  const expiresAt = new Date(createdAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  return {
    issueDate: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

function makeStaffId(user: { id: string; createdAt: Date }) {
  const year = user.createdAt.getFullYear();
  const code = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `MDS${year}${code}`;
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

  async verifyStaff(id: string) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        photoDataUrl: true,
        photoUrl: true,
        isActive: true,
        createdAt: true,
        serviceArea: {
          select: {
            name: true,
            code: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        doctorProfile: {
          select: {
            doctorType: true,
            specialty: true,
          },
        },
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Staff record not found");
    }

    return {
      verified: user.isActive,
      staffId: makeStaffId(user),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      photoDataUrl: user.photoDataUrl,
      photoUrl: user.photoUrl,
      isActive: user.isActive,
      serviceArea: user.serviceArea,
      roles: user.roles.map((entry) => entry.role.name),
      doctorProfile: user.doctorProfile,
      ...getStaffIssueDates(user.createdAt),
      verifiedAt: new Date().toISOString(),
      recordUpdatedAt: user.updatedAt,
    };
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
      photoUrl: payload.photoUrl || null,
      photoDataUrl: payload.photoDataUrl || null,
      photoMimeType: payload.photoMimeType || null,
      photoSizeBytes: payload.photoSizeBytes || null,
      photoWidth: payload.photoWidth || null,
      photoHeight: payload.photoHeight || null,
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
      photoUrl?: string | null;
      photoDataUrl?: string | null;
      photoMimeType?: string | null;
      photoSizeBytes?: number | null;
      photoWidth?: number | null;
      photoHeight?: number | null;
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

    if (payload.photoUrl !== undefined) {
      updateData.photoUrl = payload.photoUrl || null;
    }

    if (payload.photoDataUrl !== undefined) {
      updateData.photoDataUrl = payload.photoDataUrl || null;
    }

    if (payload.photoMimeType !== undefined) {
      updateData.photoMimeType = payload.photoMimeType || null;
    }

    if (payload.photoSizeBytes !== undefined) {
      updateData.photoSizeBytes = payload.photoSizeBytes || null;
    }

    if (payload.photoWidth !== undefined) {
      updateData.photoWidth = payload.photoWidth || null;
    }

    if (payload.photoHeight !== undefined) {
      updateData.photoHeight = payload.photoHeight || null;
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
