import { Prisma } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import { SetupResource, setupSchemas } from "./validators";

const resourceDelegates: Record<SetupResource, any> = {
  specialties: prisma.specialty,
  wards: prisma.ward,
  rooms: prisma.room,
  beds: prisma.bed,
  services: prisma.hospitalService,
  "insurance-providers": prisma.insuranceProvider,
};

const includeByResource: Partial<Record<SetupResource, object>> = {
  rooms: { ward: true },
  beds: { ward: true, room: true },
};

function getDelegate(resource: SetupResource) {
  return resourceDelegates[resource];
}

function parseResource(resource: string): SetupResource {
  const result = Object.keys(resourceDelegates).find((item) => item === resource);

  if (!result) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Setup resource not found");
  }

  return result as SetupResource;
}

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new ApiError(HttpStatus.CONFLICT, "A record with this unique value already exists");
    }

    if (error.code === "P2025") {
      throw new ApiError(HttpStatus.NOT_FOUND, "Record not found");
    }
  }

  throw error;
}

export class SetupService {
  async list(resourceName: string, params: { page?: number; limit?: number; search?: string }) {
    const resource = parseResource(resourceName);
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const delegate = getDelegate(resource);
    const where = {
      deletedAt: null,
      ...(params.search && resource !== "beds"
        ? { name: { contains: params.search } }
        : {}),
      ...(params.search && resource === "beds"
        ? { bedNumber: { contains: params.search } }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      delegate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: includeByResource[resource],
      }),
      delegate.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(resourceName: string, id: string) {
    const resource = parseResource(resourceName);
    const item = await getDelegate(resource).findFirst({
      where: { id, deletedAt: null },
      include: includeByResource[resource],
    });

    if (!item) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Record not found");
    }

    return item;
  }

  async create(resourceName: string, payload: unknown) {
    const resource = parseResource(resourceName);
    const data = setupSchemas[resource].parse(payload);

    try {
      return await getDelegate(resource).create({ data });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async update(resourceName: string, id: string, payload: unknown) {
    const resource = parseResource(resourceName);
    const data = setupSchemas[resource].partial().parse(payload);

    try {
      return await getDelegate(resource).update({
        where: { id },
        data,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async remove(resourceName: string, id: string) {
    const resource = parseResource(resourceName);

    try {
      await getDelegate(resource).update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      return { success: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }
}
