import { HttpStatus } from "../../core/HttpStatus";
import { ApiError } from "../../shared/errors/ApiError";

import {

    CreatePermissionDto,

    UpdatePermissionDto,

} from "./dto";

import { PermissionRepository } from "./repository";
import { PROTECTED_PERMISSIONS } from "./constants";

export class PermissionService {

    constructor(

        private readonly repository = new PermissionRepository()

    ) {}

    async list(params: {

        page?: number;

        limit?: number;

        search?: string;

    }) {

        const page = params.page ?? 1;

        const limit = params.limit ?? 20;

        const { items, total } = await this.repository.findAllPaginated({

            skip: (page - 1) * limit,

            take: limit,

            search: params.search,

        });

        return {

            items: items.map(permission => ({

                id: permission.id,

                name: permission.name,

                description: permission.description,

                rolesUsing: permission.roles.length,

                createdAt: permission.createdAt,

                updatedAt: permission.updatedAt,

            })),

            meta: {

                page,

                limit,

                total,

                totalPages: Math.ceil(total / limit),

            },

        };

    }

    async getById(id: string) {

        const permission = await this.repository.findById(id);

        if (!permission) {

            throw new ApiError(

                HttpStatus.NOT_FOUND,

                "Permission not found"

            );

        }

        return permission;

    }

    async create(payload: CreatePermissionDto) {

        const exists = await this.repository.findByName(payload.name);

        if (exists) {

            throw new ApiError(

                HttpStatus.CONFLICT,

                "Permission already exists"

            );

        }

        return this.repository.create({

            name: payload.name,

            description: payload.description,

        });

    }

    async update(

        id: string,

        payload: UpdatePermissionDto

    ) {

        const permission = await this.repository.findById(id);

        if (!permission) {

            throw new ApiError(

                HttpStatus.NOT_FOUND,

                "Permission not found"

            );

        }

        if (

            PROTECTED_PERMISSIONS.includes(permission.name)

            && payload.name

            && payload.name !== permission.name

        ) {

            throw new ApiError(

                HttpStatus.FORBIDDEN,

                "Protected permissions cannot be renamed."

            );

        }

        if (

            payload.name

            && payload.name !== permission.name

        ) {

            const exists = await this.repository.findByName(

                payload.name

            );

            if (exists) {

                throw new ApiError(

                    HttpStatus.CONFLICT,

                    "Permission already exists"

                );

            }

        }

        await this.repository.update(id, {

            name: payload.name,

            description: payload.description,

        });

        return this.getById(id);

    }

    async remove(id: string) {

        const permission = await this.repository.findById(id);

        if (!permission) {

            throw new ApiError(

                HttpStatus.NOT_FOUND,

                "Permission not found"

            );

        }

        if (

            PROTECTED_PERMISSIONS.includes(permission.name)

        ) {

            throw new ApiError(

                HttpStatus.FORBIDDEN,

                "This permission cannot be deleted."

            );

        }

        const count = await this.repository.countRolesUsingPermission(id);

        if (count > 0) {

            throw new ApiError(

                HttpStatus.CONFLICT,

                `Permission "${permission.name}" is currently assigned to ${count} role(s). Remove it from those roles first.`

            );

        }

        await this.repository.delete(id);

        return {

            success: true

        };

    }

    async options() {

        const permissions = await this.repository.findAllPaginated({

            take: 1000

        });

        return permissions.items.map(permission => ({

            id: permission.id,

            name: permission.name

        }));

    }

}